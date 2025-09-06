/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useState, useEffect, useRef} from 'react';
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
  syncProgress,
} from '../lib/actions';
import PronunciationRace from './PronunciationRace';
import ListeningDrill from './ListeningDrill';
import Conversation from './Conversation';
import Footer from './Footer';
import AdminPanel from './AdminPanel';
import Leaderboard from './Leaderboard';

// Keep a module-level reference to the recognition instance to persist it across re-renders
let commandRecognition;

function ExerciseView() {
  const { error } = useStore();
  return (
    <div className="exercise-view">
      <button className="button back-to-dashboard" onClick={goToDashboard}>
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

export default function App() {
  const { view, user, isRecording, voiceCommandState, isOnline } = useStore();
  const [isDark, setIsDark] = useState(true);

  const toggleThemeRef = useRef();
  const isCommandRecognitionActive = useRef(false);
  const shouldRestartRecognition = useRef(true);
  const wasOnline = useRef(navigator.onLine);


  useEffect(() => {
    toggleThemeRef.current = () => setIsDark(p => !p);
  }, []);

  useEffect(() => {
    document.documentElement.className = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    // --- Robust Online Status Check ---
    const checkOnlineStatus = async () => {
      try {
        // A lightweight request to a reliable endpoint is a good way to check for real internet access.
        // We use no-cors mode because we don't need to read the response, just see if the request succeeds.
        const response = await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        });
        // Check navigator.onLine as a fallback or for quick changes.
        setOnlineStatus(navigator.onLine);
      } catch (error) {
        // A failed fetch indicates offline status.
        setOnlineStatus(false);
      }
    };

    checkOnlineStatus(); // Check immediately on load
    const intervalId = setInterval(checkOnlineStatus, 30000); // And every 30 seconds

    // --- PWA Install Prompt ---
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);
  
  // --- Sync on Reconnect ---
  useEffect(() => {
    // If status changed from offline to online
    if (isOnline && !wasOnline.current) {
      const { syncQueue } = useStore.getState();
      if (syncQueue.length > 0) {
        addToast({ title: 'Back Online!', message: `Syncing ${syncQueue.length} offline items.`, icon: 'cloud_sync' });
        syncProgress();
      } else {
        addToast({ title: 'Back Online!', message: 'Your connection is restored.', icon: 'wifi' });
      }
    }
    wasOnline.current = isOnline;
  }, [isOnline]);

  
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
      // These are not critical errors and are often part of the normal lifecycle.
      // 'no-speech' happens on silence, 'aborted' can happen when we programmatically stop the service.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        console.log(`Voice command recognition event: ${event.error}`);
        return;
      }
      
      // All other events are treated as actual errors.
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
        // Only restart if it was not intentionally stopped
        if (shouldRestartRecognition.current && state.voiceCommandState.isListening && !state.isRecording) {
            try { 
                commandRecognition.start(); 
            } catch(e) {
                console.warn('Could not restart voice command recognition:', e.message);
            }
        }
    };

    // --- Controller Logic ---
    const shouldBeListening = voiceCommandState.isListening && !isRecording;
    
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
  }, [voiceCommandState.isListening, isRecording]);


  if (!user) {
    return <Login />;
  }
  
  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'exercise':
        return <ExerciseView />;
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
      <Header isDark={isDark} toggleTheme={() => setIsDark(p => !p)} />
      <main>
        {renderView()}
      </main>
      <ToastContainer />
      <Footer />
    </div>
  );
}