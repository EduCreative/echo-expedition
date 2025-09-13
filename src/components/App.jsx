/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useState, useEffect, useRef, useCallback} from 'react';
import useStore from '../lib/store';
import Login from './Login';
import Dashboard from './Dashboard';
import ExerciseCard from './ExerciseCard';
import Header from './Header';
import Toast from './Toast';
import { 
  goToDashboard, 
  setOnlineStatus, 
  setInstallPromptEvent,
  addToast,
  startPronunciationRace,
  changePrompt,
  speakText,
  startPracticeLesson,
} from '../lib/actions';
import PronunciationRace from './PronunciationRace';
import ListeningDrill from './ListeningDrill';
import Conversation from './Conversation';
import Footer from './Footer';
import AdminPanel from './AdminPanel';
import Leaderboard from './Leaderboard';
import c from 'clsx';
import { levels } from '../lib/prompts';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import GraffitiCongrats from './GraffitiCongrats';
import Onboarding from './Onboarding';

// Keep a module-level reference to the recognition instance to persist it across re-renders
let commandRecognition;

function PracticeSelection() {
  const [levelId, setLevelId] = useState('');
  const [lessonIndex, setLessonIndex] = useState('');
  
  const availableLessons = levelId ? levels[levelId].lessons : [];

  const handleStart = () => {
    if (levelId && lessonIndex !== '') {
      startPracticeLesson(levelId, parseInt(lessonIndex, 10));
    }
  };

  return (
    <div className="practice-selection-container">
      <button className="button back-to-dashboard" onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>
      <div className="practice-selection-card">
        <h2><span className="icon">fitness_center</span> Practice Mode</h2>
        <p>Choose any lesson from the expedition map to practice. Your scores and progress won't be saved.</p>
        <div className="practice-form">
          <select value={levelId} onChange={e => { setLevelId(e.target.value); setLessonIndex(''); }}>
            <option value="" disabled>-- Select a Level --</option>
            {Object.entries(levels).map(([id, data]) => (
              <option key={id} value={id}>{data.name}</option>
            ))}
          </select>
          <select value={lessonIndex} onChange={e => setLessonIndex(e.target.value)} disabled={!levelId}>
            <option value="" disabled>-- Select a Lesson --</option>
            {availableLessons.map((lesson, index) => (
              <option key={index} value={index}>{lesson.title}</option>
            ))}
          </select>
          <button className="button primary" onClick={handleStart} disabled={!levelId || lessonIndex === ''}>
            Start Practice Session
          </button>
        </div>
      </div>
    </div>
  );
}


function ExerciseView() {
  const { error, currentLesson } = useStore();

  const isLastPrompt = currentLesson?.prompts &&
    currentLesson.currentPromptIndex === currentLesson.prompts.length - 1;

  const lastPromptIsDone = isLastPrompt &&
    currentLesson.prompts[currentLesson.currentPromptIndex].feedback;
  
  const isInteractiveLesson = ['roleplay', 'boss_battle'].includes(currentLesson?.lessonType);
  const interactiveLessonIsDone = isInteractiveLesson && currentLesson?.prompt?.feedback;

  const shouldBlinkBack = lastPromptIsDone || interactiveLessonIsDone;

  return (
    <div className="exercise-view">
      <button className={c("button back-to-dashboard", { 'blink-guide': shouldBlinkBack })} onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>
      {error && <p className="error-message">{error}</p>}
      <ExerciseCard />
    </div>
  );
}

function ToastContainer() {
  const toasts = useStore(state => state.toasts);
  return (
    <div className="toast-container">
      {toasts.map(toast => <Toast key={toast.id} {...toast} />)}
    </div>
  );
}

const { setUser, clearUserSession, updateProgressFromSnapshot } = useStore.getState();

export default function App() {
  const { view, user, isRecording, voiceCommandState, isOnline, congratsAnimation, showOnboarding, isAuthenticating } = useStore();
  const [isDark, setIsDark] = useState(true);
  const unsubscribeProgressRef = useRef(() => {});
  const toggleThemeRef = useRef();
  const isCommandRecognitionActive = useRef(false);
  const shouldRestartRecognition = useRef(true);
  
  // --- Firebase Auth State Listener ---
  // This hook handles all authentication logic.
  useEffect(() => {
    // The onAuthStateChanged listener is the single source of truth for auth state.
    // It will fire when the app loads, and anytime the user signs in or out.
    // This is sufficient for both initial auth check and handling popup sign-ins.
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProgressRef.current();

      try {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            email: firebaseUser.email,
            isAnonymous: firebaseUser.isAnonymous,
          });

          const userRef = doc(db, "users", firebaseUser.uid);
          const progressRef = doc(db, "progress", firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            const batch = writeBatch(db);
            const userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Guest User',
              email: firebaseUser.email,
              picture: firebaseUser.photoURL,
              registrationDate: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              status: 'active',
              hasOnboarded: false,
            };
            const progressData = {
              progress: {},
              dailyStreak: { count: 0, lastUpdated: null },
              achievements: [],
              pronunciationRaceHighScore: 0,
              listeningDrillHighScore: 0,
              user: { xp: 0, level: 1 },
            };
            batch.set(userRef, userData);
            batch.set(progressRef, progressData);
            await batch.commit();
            updateProgressFromSnapshot(progressData);
            useStore.setState({ showOnboarding: true });
          } else {
            const progressDoc = await getDoc(progressRef);
            if (progressDoc.exists()) {
              updateProgressFromSnapshot(progressDoc.data());
            }
            await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
            useStore.setState({ showOnboarding: !userDoc.data().hasOnboarded });
          }

          unsubscribeProgressRef.current = onSnapshot(progressRef, (snapshot) => {
            if (snapshot.exists()) {
              updateProgressFromSnapshot(snapshot.data());
            }
          }, (error) => {
              console.error("Firestore snapshot error:", error);
              addToast({ title: 'Sync Error', message: 'Could not sync latest progress.', icon: 'sync_problem' });
          });

        } else {
          const { user: localUser } = useStore.getState();
          if (localUser && (localUser.isAnonymous || localUser.isDevAdmin)) {
            // A local session is active, don't clear it.
          } else {
            clearUserSession();
          }
        }
      } catch (error) {
        console.error("Critical error during user session initialization:", error);
        addToast({
          title: 'Authentication Error',
          message: 'Could not load your session. Please sign in again.',
          icon: 'error',
          duration: 7000,
        });
        if (auth.currentUser) await signOut(auth);
        clearUserSession();
      } finally {
        useStore.setState({ isAuthenticating: false });
      }
    });
    
    return () => {
      unsubscribeAuth();
      unsubscribeProgressRef.current();
    };
  }, []);

  const handleCongratsClose = useCallback(() => {
    useStore.setState({ congratsAnimation: { show: false, text: '' } });
  }, []);
  
  useEffect(() => {
    toggleThemeRef.current = () => setIsDark(p => !p);
  }, []);

  useEffect(() => {
    document.documentElement.className = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);
  
  // --- Voice Commands Effect ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!commandRecognition) {
      commandRecognition = new SpeechRecognition();
      commandRecognition.continuous = true;
      commandRecognition.lang = 'en-US';
      commandRecognition.interimResults = false;
    }

    commandRecognition.onstart = () => {
      isCommandRecognitionActive.current = true;
    };
    
    commandRecognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const command = lastResult[0].transcript.trim().toLowerCase();
      
      const state = useStore.getState();

      // --- Command Parsing Logic ---
      if (command.includes('go to dashboard')) {
        addToast({ title: 'Voice Command', message: 'Navigating to Dashboard.', icon: 'space_dashboard' });
        goToDashboard();
      } else if (command.includes('start race') || command.includes('pronunciation race')) {
        addToast({ title: 'Voice Command', message: 'Starting Pronunciation Race.', icon: 'timer' });
        startPronunciationRace();
      } else if (command.includes('toggle dark mode') || command.includes('toggle theme')) {
        addToast({ title: 'Voice Command', message: 'Toggling theme.', icon: 'brightness_6' });
        toggleThemeRef.current();
      } else if (command.includes('next lesson') || command.includes('next prompt')) {
         if (state.view === 'exercise' && state.currentLesson?.prompts) {
           const { prompts, currentPromptIndex } = state.currentLesson;
           if (currentPromptIndex < prompts.length - 1) {
             addToast({ title: 'Voice Command', message: 'Going to next prompt.', icon: 'arrow_forward' });
             changePrompt(currentPromptIndex + 1);
           } else {
             addToast({ title: 'Voice Command', message: 'Already at the last prompt.', icon: 'info' });
           }
         }
      } else if (command.includes('previous lesson') || command.includes('previous prompt')) {
        if (state.view === 'exercise' && state.currentLesson?.prompts) {
           const { currentPromptIndex } = state.currentLesson;
           if (currentPromptIndex > 0) {
             addToast({ title: 'Voice Command', message: 'Going to previous prompt.', icon: 'arrow_back' });
             changePrompt(currentPromptIndex - 1);
           } else {
              addToast({ title: 'Voice Command', message: 'Already at the first prompt.', icon: 'info' });
           }
         }
      } else if (command.includes('repeat that') || command.includes('listen again')) {
        if (state.view === 'exercise' && state.currentLesson) {
           let textToSpeak = '';
           const lesson = state.currentLesson;
           if (lesson.prompts) { // Sentence, scramble, etc.
              textToSpeak = lesson.prompts[lesson.currentPromptIndex].correctText || lesson.prompts[lesson.currentPromptIndex].text;
           } else if (lesson.chatHistory) { // Roleplay
              const lastAiMsg = lesson.chatHistory.findLast(m => m.role === 'ai');
              if (lastAiMsg) textToSpeak = lastAiMsg.text;
           }
           if (textToSpeak) {
              addToast({ title: 'Voice Command', message: 'Repeating audio.', icon: 'volume_up' });
              speakText(textToSpeak);
           }
        }
      }
    };

    commandRecognition.onerror = (event) => {
      // Non-critical lifecycle events.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        console.log(`Voice command recognition event: ${event.error}`);
        return;
      }
      
      // Specific handling for network errors, which are common when going offline.
      if (event.error === 'network') {
        console.warn('Voice command recognition network error. Turning off feature.');
        addToast({ 
          title: 'Connection Lost', 
          message: 'Voice commands have been paused due to a network issue.', 
          icon: 'wifi_off' 
        });
        // Automatically turn off the feature in the global state.
        useStore.setState(state => { state.voiceCommandState.isListening = false; });
        return;
      }
      
      // Handle all other errors.
      console.error('Voice command recognition error:', event.error, event.message);
      addToast({ 
        title: 'Voice Command Error', 
        message: `Could not listen for commands (${event.error})`, 
        icon: 'error' 
      });
    };
    
    commandRecognition.onend = () => {
        isCommandRecognitionActive.current = false;
        const state = useStore.getState();
        // Only restart if it was not intentionally stopped AND we are online
        if (shouldRestartRecognition.current && state.voiceCommandState.isListening && !state.isRecording && state.isOnline) {
            try { 
                commandRecognition.start(); 
            } catch(e) {
                console.warn('Could not restart voice command recognition:', e.message);
            }
        }
    };

    // --- Controller Logic ---
    const shouldBeListening = voiceCommandState.isListening && !isRecording && isOnline;
    
    if (shouldBeListening && !isCommandRecognitionActive.current) {
      shouldRestartRecognition.current = true; // Set the restart flag
      try {
        commandRecognition.start();
      } catch (e) {
        // This can happen if start() is called too quickly after a stop().
        console.warn('Could not start voice command recognition:', e.message);
      }
    } else if (!shouldBeListening && isCommandRecognitionActive.current) {
      shouldRestartRecognition.current = false; // Unset the restart flag before stopping
      commandRecognition.stop();
    }
    
    return () => {
      if (commandRecognition) {
        shouldRestartRecognition.current = false;
        commandRecognition.stop();
      }
    };
  }, [voiceCommandState.isListening, isRecording, isOnline]);

  if (isAuthenticating) {
    return (
      <div className="login-container">
        <div className="loader">
          <span className="icon">hourglass_top</span> Verifying sign-in...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }
  
  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'exercise':
        return <ExerciseView />;
      case 'practice_selection':
        return <PracticeSelection />;
      case 'pronunciation_race':
        return <PronunciationRace />;
      case 'listening_drill':
        return <ListeningDrill />;
      case 'conversation':
        return <Conversation />;
      case 'admin':
        return <AdminPanel />;
      case 'leaderboard':
        return <Leaderboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {showOnboarding && <Onboarding />}
      <Header isDark={isDark} toggleTheme={() => setIsDark(p => !p)} />
      <main>
        {renderView()}
      </main>
      <ToastContainer />
      {congratsAnimation.show && (
        <GraffitiCongrats
          text={congratsAnimation.text}
          onClose={handleCongratsClose}
        />
      )}
      <Footer />
    </div>
  );
}