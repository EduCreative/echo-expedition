/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore, { initialSessionState } from './store';
import { auth, db, storage } from './firebase';
import {
  signOut,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { levels, getFeedbackPrompt, getPronunciationRacePrompt, conversationScenarios, getVocabularyBuilderPrompt } from './prompts';
import { courseData } from './course-data.js';
import { pronunciationWords } from './pronunciation-words.js';
import { listeningSentences } from './listening-sentences.js';
import { vocabularyWords } from './vocabulary-words.js';
import { achievements } from './achievements';
import { getCachedCustomLesson, setCachedCustomLesson } from './cache';
import { generateContent, generateImages, generateImage } from './llm';

const Type = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY'
};

const ai = {
  models: {
    generateContent: ({ model, contents, config }) => generateContent({ model, contents, config }),
    generateImages: ({ model, prompt, config }) => generateImages({ model, prompt, config })
  }
};

const model = 'gemini-2.5-flash';
let deferredInstallPrompt = null;

// --- Helper Functions ---
const checkAndAwardAchievements = () => {
  const state = useStore.getState();
  const newlyUnlocked = [];
  achievements.forEach(ach => {
    if (!state.achievements.includes(ach.id) && ach.check(state)) {
      newlyUnlocked.push(ach.id);
    }
  });

  if (newlyUnlocked.length > 0) {
    const allUnlocked = [...state.achievements, ...newlyUnlocked];
    useStore.setState({ achievements: allUnlocked, justUnlockedAchievements: newlyUnlocked });
    
    // Show toast for the first new achievement
    const firstNew = achievements.find(a => a.id === newlyUnlocked[0]);
    addToast({
      title: 'Achievement Unlocked!',
      message: firstNew.name,
      icon: firstNew.icon,
    });
    speakText(`Achievement Unlocked! ${firstNew.name}.`);
    
    // Persist to Firebase
    if (state.user && !state.user.isAnonymous) {
      const progressRef = doc(db, "progress", state.user.uid);
      updateDoc(progressRef, { achievements: allUnlocked }).catch(err => {
        console.error("Failed to save new achievements:", err);
      });
    }
  }
};

// Helper function to check if two dates are on the same day (ignores time)
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Helper function to check if a date is yesterday relative to today
const isYesterday = (date) => {
  if (!date) return false;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  return isSameDay(date, yesterday);
};

export const checkAndUpdateStreak = () => {
  const { dailyStreak, user } = useStore.getState();
  if (!user || user.isAnonymous) return; // Don't track streaks for guests

  const today = new Date();
  const lastUpdatedDate = dailyStreak.lastUpdated ? new Date(dailyStreak.lastUpdated) : null;

  // No update needed if they've already completed a lesson today
  if (lastUpdatedDate && isSameDay(lastUpdatedDate, today)) {
    return;
  }

  let newStreak;

  // If last update was yesterday, increment streak
  if (lastUpdatedDate && isYesterday(lastUpdatedDate)) {
    newStreak = {
      count: dailyStreak.count + 1,
      lastUpdated: today.toISOString(),
    };
    addToast({
      title: `Streak Extended!`,
      message: `You're on a ${newStreak.count}-day streak! Keep it up!`,
      icon: 'local_fire_department',
    });
    speakText(`Streak extended! ${newStreak.count} days!`);
  } else {
    // If it was before yesterday or never, reset to 1
    newStreak = {
      count: 1,
      lastUpdated: today.toISOString(),
    };
    // Only show the "reset" message if they had a streak to lose.
    if (dailyStreak.count > 1) {
       addToast({
          title: 'Streak Reset',
          message: `You've started a new 1-day streak!`,
          icon: 'restart_alt',
       });
    } else if (dailyStreak.count === 0) {
      // Add a toast for starting a new streak from zero.
      addToast({
        title: 'Streak Started!',
        message: 'You completed your first lesson for today. Keep it up!',
        icon: 'local_fire_department',
      });
    }
  }
  
  useStore.setState({ dailyStreak: newStreak });
};


// --- Toast & Navigation Actions ---

export const addToast = (toast) => {
  const id = Date.now() + Math.random();
  const duration = toast.duration || 5000;
  useStore.setState(state => {
    state.toasts = [...state.toasts, { ...toast, id, duration }];
  });
  setTimeout(() => {
    useStore.setState(state => {
      state.toasts = state.toasts.filter(t => t.id !== id);
    });
  }, duration);
};

export const goToDashboard = () => {
  useStore.setState({
    view: 'dashboard',
    currentLesson: null,
    pronunciationRaceState: initialSessionState.pronunciationRaceState,
    listeningDrillState: initialSessionState.listeningDrillState,
    conversationState: initialSessionState.conversationState,
    vocabularyBuilderState: initialSessionState.vocabularyBuilderState,
    error: null,
  });
};
export const goToAdminPanel = () => useStore.setState({ view: 'admin' });
export const goToLeaderboard = () => useStore.setState({ view: 'leaderboard' });
export const goToProfile = () => useStore.setState({ view: 'profile' });
export const startPracticeMode = () => useStore.setState({ view: 'practice_selection' });
export const goToLogin = () => useStore.setState({ view: 'login' });

export const continueAsGuest = () => {
    useStore.getState().startGuestSession();
    addToast({
        title: 'Guest Session Started',
        message: 'Your progress in this session will not be saved.',
        icon: 'person_off'
    });
};


// --- Authentication Actions ---

export const signUpWithEmail = async (name, email, password, rememberMe = true) => {
  useStore.setState({ isProcessing: true, error: null });
  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // After user is created, update their profile with the name.
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    // Note: onAuthStateChanged will handle setting the user in the store.
  } catch (error) {
    console.error("Detailed sign-up error:", error); // Added for debugging
    let errorMessage = 'Could not create account. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email address already exists.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    }
    useStore.setState({ error: errorMessage });
  } finally {
    useStore.setState({ isProcessing: false });
  }
};

export const signInWithEmail = async (email, password, rememberMe = true) => {
  useStore.setState({ isProcessing: true, error: null });
  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Detailed sign-in error:", error); // Added for debugging
    let errorMessage = 'Could not sign in. Please check your credentials.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    }
    useStore.setState({ error: errorMessage });
  } finally {
    useStore.setState({ isProcessing: false });
  }
};

export const sendPasswordResetEmail = async (email) => {
  useStore.setState({ isProcessing: true, error: null });
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    addToast({
      title: 'Password Reset Email Sent',
      message: 'Please check your inbox for instructions to reset your password.',
      icon: 'email',
      duration: 8000,
    });
  } catch (error) {
    console.error("Detailed password reset error:", error); // Added for debugging
    let errorMessage = 'Could not send reset email. Please try again.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      errorMessage = 'No account found with that email address.';
    }
    useStore.setState({ error: errorMessage });
  } finally {
    useStore.setState({ isProcessing: false });
  }
};

export const logout = async () => {
  const { user } = useStore.getState();
  const confirmMessage = user?.isAnonymous
    ? "Are you sure? This will end your current guest session and you'll lose any progress you've made."
    : "Are you sure you want to log out?";

  if (window.confirm(confirmMessage)) {
    if (user?.isAnonymous) {
      // For guests, we manually start a new guest session.
      useStore.getState().startGuestSession();
      addToast({ title: 'New Session', message: 'Started a new guest session.', icon: 'refresh' });
    } else {
      // For registered users, signing out will trigger onAuthStateChanged,
      // which will then create a new guest session.
      await signOut(auth).catch(err => console.error("Sign out failed", err));
      addToast({ title: 'Logged Out', message: 'You have been signed out.', icon: 'logout' });
    }
  }
};


// --- PWA & App Settings Actions ---

export const setOnlineStatus = (isOnline) => {
  useStore.setState({ isOnline });
  addToast({
    title: isOnline ? 'Online' : 'Offline',
    message: isOnline ? 'You are back online.' : 'Offline mode. Some AI features are limited.',
    icon: isOnline ? 'wifi' : 'wifi_off',
  });
};

export const setInstallPromptEvent = (e) => {
  deferredInstallPrompt = e;
  useStore.setState({ canInstall: true });
};

export const promptToInstall = () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(() => {
      useStore.setState({ canInstall: false });
      deferredInstallPrompt = null;
    });
  }
};

export const dismissInstallPrompt = () => {
  useStore.setState({ canInstall: false });
};

export const toggleAiSupport = () => {
  const isEnabled = useStore.getState().isAiEnabled;
  useStore.setState({ isAiEnabled: !isEnabled });
  addToast({
    title: `AI Features ${!isEnabled ? 'Enabled' : 'Disabled'}`,
    message: !isEnabled
      ? 'AI-powered feedback and some lessons are now available.'
      : 'AI feedback is now turned off.',
    icon: !isEnabled ? 'auto_awesome' : 'toggle_off',
  });
};

export const updateUserProfile = async ({ displayName, photoFile }) => {
  useStore.setState({ isProcessing: true });
  const currentUser = auth.currentUser;
  if (!currentUser) {
    useStore.setState({ error: 'You must be logged in to update your profile.', isProcessing: false });
    return;
  }

  try {
    const authUpdates = {};
    const firestoreUpdates = {};

    if (displayName && displayName !== currentUser.displayName) {
      authUpdates.displayName = displayName;
      firestoreUpdates.name = displayName;
    }

    if (photoFile) {
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${photoFile.name}`);
      const snapshot = await uploadBytes(storageRef, photoFile);
      const photoURL = await getDownloadURL(snapshot.ref);
      authUpdates.photoURL = photoURL;
      firestoreUpdates.picture = photoURL;
    }

    if (Object.keys(authUpdates).length > 0) {
      await updateProfile(currentUser, authUpdates);
    }
    
    if (Object.keys(firestoreUpdates).length > 0) {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, firestoreUpdates);
    }

    // Manually update the user object in the store for immediate UI feedback
    useStore.setState(state => {
      if (state.user) {
        if (authUpdates.displayName) state.user.displayName = authUpdates.displayName;
        if (authUpdates.photoURL) state.user.photoURL = authUpdates.photoURL;
      }
    });

    addToast({ title: 'Profile Updated', message: 'Your changes have been saved.', icon: 'check_circle' });
  } catch (error) {
    console.error("Error updating profile:", error);
    let errorMessage = "Could not update profile. Please try again.";
    if (error.code?.includes('storage')) {
      errorMessage = "Error uploading new photo. Please try a different image.";
    }
    useStore.setState({ error: errorMessage });
    addToast({ title: 'Update Failed', message: errorMessage, icon: 'error' });
  } finally {
    useStore.setState({ isProcessing: false });
  }
};


// --- Speech Synthesis ---
export const speakText = (text) => {
  if (!text || typeof window.speechSynthesis === 'undefined') return;

  const { speechSettings } = useStore.getState();
  const availableVoices = window.speechSynthesis.getVoices();
  
  let selectedVoice = speechSettings.voice ? availableVoices.find(v => v.voiceURI === speechSettings.voice) : null;
  if (!selectedVoice) {
      selectedVoice = availableVoices.find(v => v.lang.startsWith('en')) || null;
  }
  
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = selectedVoice;
  utterance.rate = speechSettings.rate || 1;
  speechSynthesis.speak(utterance);
};

export const setSpeechSetting = (key, value) => {
  useStore.setState(state => {
    state.speechSettings[key] = value;
  });
};

export const toggleVoiceCommands = () => {
    useStore.setState(state => {
      state.voiceCommandState.isListening = !state.voiceCommandState.isListening;
    });
    const isEnabled = useStore.getState().voiceCommandState.isListening;
    addToast({
      title: `Voice Commands ${isEnabled ? 'Enabled' : 'Disabled'}`,
      message: isEnabled ? 'You can now use voice commands.' : 'Voice commands are now turned off.',
      icon: isEnabled ? 'mic' : 'mic_off',
    });
};

// --- Onboarding and Lesson Flow ---
export const speakOnboardingStep = (step) => {
  speakText(`${step.title}. ${step.content}`);
};

export const closeOnboarding = () => {
  const { user } = useStore.getState();
  useStore.setState({ showOnboarding: false });
  
  if (user && !user.isAnonymous) {
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, { hasOnboarded: true }).catch(err => {
      console.error("Failed to update onboarding status:", err);
    });
  }
};

export const startLesson = (levelId, lessonIndex) => {
  const level = levels[levelId];
  if (!level) {
    console.error(`Level with id ${levelId} not found.`);
    return;
  }
  const lessonMeta = level.lessons[lessonIndex];
  if (!lessonMeta) {
    console.error(`Lesson at index ${lessonIndex} for level ${levelId} not found.`);
    return;
  }
  
  const lessonContent = courseData[levelId]?.[lessonIndex] || {};

  const lessonData = {
    levelId,
    lessonIndex,
    title: lessonMeta.title,
    lessonType: lessonMeta.type,
    isPractice: false,
    currentPromptIndex: 0,
    ...lessonContent,
  };

  if (lessonData.lessonType === 'roleplay' || lessonData.lessonType === 'boss_battle') {
    lessonData.prompt = {
      userTranscript: null,
      feedback: null,
      score: null,
      pronunciationScore: null,
      xpGained: 0,
    };
  } else if (lessonData.prompts) {
    lessonData.prompts = lessonData.prompts.map(p => ({
        ...p,
        userTranscript: null,
        feedback: null,
        score: null,
        pronunciationScore: null,
        xpGained: 0,
    }));
  }

  useStore.setState({ view: 'exercise', currentLesson: lessonData, error: null });
};

export const startPracticeLesson = (levelId, lessonIndex) => {
    startLesson(levelId, lessonIndex);
    useStore.setState(state => {
        if (state.currentLesson) {
            state.currentLesson.isPractice = true;
        }
    });
    addToast({ title: 'Practice Mode', message: "Scores won't be saved.", icon: 'fitness_center' });
};

export const changePrompt = (newIndex) => {
  useStore.setState(state => {
    if (state.currentLesson && state.currentLesson.prompts) {
      const totalPrompts = state.currentLesson.prompts.length;
      if (newIndex >= 0 && newIndex < totalPrompts) {
        state.currentLesson.currentPromptIndex = newIndex;
      }
    }
  });
};

// --- Recording & Feedback ---

let mediaRecorder;
let audioChunks = [];
let recognition;
let finalTranscript = '';

const audioBlobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
});

// Forward declarations for functions called inside startRecording
let submitPronunciationRaceAnswer;
let submitConversationTurn;

export const startRecording = async () => {
  if (useStore.getState().isRecording) return;
  useStore.setState({ isRecording: true, error: null });
  audioChunks = [];
  finalTranscript = '';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioBase64 = await audioBlobToBase64(audioBlob);
      const transcript = finalTranscript.trim() || '[No speech detected]';
      const pendingRecording = { transcript, audioBase64, audioMimeType: audioBlob.type };
      stream.getTracks().forEach(track => track.stop());

      const { view } = useStore.getState();
      
      if (view === 'exercise') {
        useStore.setState(state => {
            const lesson = state.currentLesson;
            const prompt = lesson.prompts ? lesson.prompts[lesson.currentPromptIndex] : lesson.prompt;
            prompt.pendingRecording = pendingRecording;
        });
      } else if (view === 'pronunciation_race') {
        useStore.setState(state => {
            state.pronunciationRaceState.pendingRecording = pendingRecording;
        });
        submitPronunciationRaceAnswer();
      } else if (view === 'conversation') {
        useStore.setState(state => {
            state.conversationState.pendingRecording = pendingRecording;
        });
        submitConversationTurn();
      } else if (view === 'vocabulary_builder') {
        useStore.setState(state => {
            state.vocabularyBuilderState.pendingRecording = pendingRecording;
        });
      }
    };
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = event => {
        let interim = '';
        // Use a local variable to reconstruct the final transcript from the full results list.
        // This prevents the module-level `finalTranscript` from being cleared by an interim event.
        let localFinal = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            localFinal += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        // Update the shared finalTranscript variable with the complete, stable transcript.
        finalTranscript = localFinal;
      };
      recognition.start();
    }
    
    mediaRecorder.start();
  } catch (err) {
    console.error("Mic error:", err);
    useStore.setState({ isRecording: false, error: "Microphone access denied. Please enable it in your browser settings." });
  }
};

export const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (recognition) {
    recognition.stop();
  }
  useStore.setState({ isRecording: false });
};

export const discardRecording = () => {
  useStore.setState(state => {
    const lesson = state.currentLesson;
    if (!lesson) return;
    const prompt = lesson.prompts ? lesson.prompts[lesson.currentPromptIndex] : lesson.prompt;
    prompt.pendingRecording = null;
  });
};

export const recordAgain = () => {
  useStore.setState(state => {
    const lesson = state.currentLesson;
    if (!lesson) return;
    const prompt = lesson.prompts ? lesson.prompts[lesson.currentPromptIndex] : lesson.prompt;
    Object.assign(prompt, {
      userTranscript: null,
      feedback: null,
      score: null,
      pronunciationScore: null,
      xpGained: 0,
      pendingRecording: null,
      userRecordingBase64: null,
    });
  });
};

const XP_PER_LEVEL = 500;
const calculateXp = (score, pScore) => {
  const avg = (score + pScore) / 2;
  if (avg >= 90) return 30;
  if (avg >= 70) return 20;
  if (avg >= 50) return 10;
  return 5;
};

export const submitForFeedback = async () => {
  const { currentLesson, isOnline, isAiEnabled, user } = useStore.getState();
  const promptData = currentLesson.prompts ? currentLesson.prompts[currentLesson.currentPromptIndex] : currentLesson.prompt;
  const { pendingRecording } = promptData;

  if (!pendingRecording) return;
  
  useStore.setState({ isProcessing: true });
  useStore.setState(s => {
    const p = s.currentLesson.prompts ? s.currentLesson.prompts[s.currentLesson.currentPromptIndex] : s.currentLesson.prompt;
    p.userTranscript = pendingRecording.transcript;
    p.userRecordingBase64 = pendingRecording.audioBase64;
    p.userRecordingMimeType = pendingRecording.audioMimeType;
    p.pendingRecording = null;
  });

  if (!isOnline || !isAiEnabled) {
    useStore.setState(s => {
      const p = s.currentLesson.prompts ? s.currentLesson.prompts[s.currentLesson.currentPromptIndex] : s.currentLesson.prompt;
      p.feedback = 'OFFLINE_RECORDING';
    });
    useStore.setState({ isProcessing: false });
    return;
  }

  try {
    const context = { ...currentLesson, ...promptData };
    const { prompt, schema } = getFeedbackPrompt(currentLesson.lessonType, context, pendingRecording.transcript);

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [ { text: prompt }, { inlineData: { mimeType: pendingRecording.audioMimeType, data: pendingRecording.audioBase64 } } ] },
      config: { responseMimeType: 'application/json', responseSchema: schema },
    });
    
    const result = JSON.parse(response.text);
    const xpGained = calculateXp(result.score, result.pronunciationScore);

    useStore.setState(s => {
      const p = s.currentLesson.prompts ? s.currentLesson.prompts[s.currentLesson.currentPromptIndex] : s.currentLesson.prompt;
      Object.assign(p, { ...result, xpGained });
      
      if (s.user && !s.user.isAnonymous) {
          s.user.xp += xpGained;
          const xpForNextLevel = s.user.level * XP_PER_LEVEL;
          if (s.user.xp >= xpForNextLevel) {
            s.user.level += 1;
            s.user.xp -= xpForNextLevel;
            s.congratsAnimation = { show: true, text: `Level Up! LVL ${s.user.level}` };
          }
      }
      
      if (!s.currentLesson.isPractice && result.score >= 70 && s.user && !s.user.isAnonymous) {
        const { levelId, lessonIndex } = s.currentLesson;
        const currentScore = s.progress[levelId]?.[lessonIndex];
        if (!currentScore || result.score > currentScore) {
          if (!s.progress[levelId]) s.progress[levelId] = {};
          s.progress[levelId][lessonIndex] = result.score;
        }
        s.justCompleted = { levelId, lessonId: lessonIndex };
      }
      
      s.currentStreak += 1;
    });

    checkAndUpdateStreak();
    checkAndAwardAchievements();

    if (user && !user.isAnonymous) {
      const progressRef = doc(db, "progress", user.uid);
      const { progress, user: userState } = useStore.getState();
      updateDoc(progressRef, { progress, user: { xp: userState.xp, level: userState.level } });
    }

  } catch (error) {
    console.error("AI Feedback Error:", error);
    useStore.setState({ error: "The AI couldn't provide feedback. Please try again." });
  } finally {
    useStore.setState({ isProcessing: false });
  }
};


// --- Game & Conversation Modes ---

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const startPronunciationRace = (difficulty = 'easy') => {
  const wordsForLevel = pronunciationWords[difficulty] || pronunciationWords.easy;
  const raceWords = shuffle([...wordsForLevel]).slice(0, 20);
  useStore.setState({
    view: 'pronunciation_race',
    pronunciationRaceState: {
      ...initialSessionState.pronunciationRaceState,
      isActive: true,
      words: raceWords,
      difficulty: difficulty,
    },
    error: null,
  });
};

submitPronunciationRaceAnswer = async () => {
    const { pronunciationRaceState, isOnline, isAiEnabled } = useStore.getState();
    const { words, currentWordIndex, pendingRecording } = pronunciationRaceState;
    const currentWord = words[currentWordIndex];

    if (!pendingRecording) return;
    useStore.setState({ isProcessing: true });
    
    if (!isOnline || !isAiEnabled) {
        useStore.setState(state => {
            state.pronunciationRaceState.lastResult = {
                status: 'OFFLINE_PRACTICE',
                userRecordingBase64: pendingRecording.audioBase64,
                userRecordingMimeType: pendingRecording.audioMimeType,
            };
            state.pronunciationRaceState.pendingRecording = null;
            state.isProcessing = false;
        });
        return;
    }

    try {
        const { prompt, schema } = getPronunciationRacePrompt(currentWord, pendingRecording.transcript);
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType: pendingRecording.audioMimeType, data: pendingRecording.audioBase64 } }] },
            config: { responseMimeType: 'application/json', responseSchema: schema },
        });
        
        const result = JSON.parse(response.text);
        const { pronunciationScore, feedbackTip } = result;
        let status = pronunciationScore >= 90 ? 'success' : pronunciationScore >= 70 ? 'retry' : 'fail';

        useStore.setState(state => {
            const rs = state.pronunciationRaceState;
            rs.lastResult = { score: pronunciationScore, feedbackTip, status };
            if (status === 'success') rs.streak += 1;
            else if (status === 'fail') rs.lives -= 1;
            rs.pendingRecording = null;
        });
    } catch (error) {
        console.error("Pronunciation Race Feedback Error:", error);
        addToast({ title: 'AI Error', message: 'Could not get feedback.', icon: 'error' });
        useStore.setState(state => { state.pronunciationRaceState.lastResult = null; });
    } finally {
        useStore.setState({ isProcessing: false });
    }
};

export const goToNextRaceWord = () => {
    useStore.setState(state => {
        const rs = state.pronunciationRaceState;
        const highScore = state.pronunciationRaceHighScore;
        if (rs.currentWordIndex < rs.words.length - 1) {
            rs.currentWordIndex += 1;
            rs.lastResult = null;
        } else {
            rs.lives = 0;
        }
        if (rs.lives <= 0 && rs.streak > highScore) {
            state.pronunciationRaceHighScore = rs.streak;
            if (state.user && !state.user.isAnonymous) {
                updateDoc(doc(db, "progress", state.user.uid), { pronunciationRaceHighScore: rs.streak });
            }
        }
    });
};

export const startListeningDrill = (difficulty = 'easy') => {
    const sentencesForLevel = listeningSentences[difficulty] || listeningSentences.easy;
    const drillSentences = shuffle([...sentencesForLevel]).slice(0, 15);
    useStore.setState({
        view: 'listening_drill',
        listeningDrillState: {
            ...initialSessionState.listeningDrillState,
            isActive: true,
            sentences: drillSentences,
            difficulty: difficulty,
        },
        error: null,
    });
};

export const submitListeningDrillGuess = (guess) => {
    useStore.setState(state => {
        const ds = state.listeningDrillState;
        const correct = ds.sentences[ds.currentSentenceIndex];
        const normalize = str => str.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
        const isCorrect = normalize(guess) === normalize(correct);

        if (isCorrect) {
            ds.streak += 1;
            ds.lastResult = { status: 'success', guess, correct };
        } else {
            ds.lives -= 1;
            ds.lastResult = { status: 'fail', guess, correct };
        }
    });
};

export const goToNextDrillSentence = () => {
    useStore.setState(state => {
        const ds = state.listeningDrillState;
        const highScore = state.listeningDrillHighScore;
        if (ds.currentSentenceIndex < ds.sentences.length - 1) {
            ds.currentSentenceIndex += 1;
            ds.lastResult = null;
        } else {
            ds.lives = 0;
        }
        if (ds.lives <= 0 && ds.streak > highScore) {
            state.listeningDrillHighScore = ds.streak;
            if (state.user && !state.user.isAnonymous) {
                updateDoc(doc(db, "progress", state.user.uid), { listeningDrillHighScore: ds.streak });
            }
        }
    });
};

const generateImageForWord = async (word) => {
  useStore.setState(s => { s.vocabularyBuilderState.isGeneratingImage = true; s.vocabularyBuilderState.currentImage = null; });
  try {
    const prompt = `A clear, simple, high-quality photograph of a single "${word}" on a plain white background.`;
    const imageUrl = await generateImage(prompt);
    useStore.setState(s => { s.vocabularyBuilderState.currentImage = imageUrl; });
  } catch (error) {
    console.error("Image generation error:", error);
    addToast({ title: 'AI Error', message: `Could not generate an image for "${word}".`, icon: 'error' });
    // If image fails, we should probably end the game or skip the word to not block the user.
    // For now, we will let it show a broken state.
  } finally {
    useStore.setState(s => { s.vocabularyBuilderState.isGeneratingImage = false; });
  }
};

export const startVocabularyBuilder = () => {
  const gameWords = shuffle([...vocabularyWords]).slice(0, 15);
  useStore.setState({
    view: 'vocabulary_builder',
    vocabularyBuilderState: {
      ...initialSessionState.vocabularyBuilderState,
      isActive: true,
      words: gameWords,
    },
    error: null,
  });
  generateImageForWord(gameWords[0]);
};

export const submitVocabularyBuilderAnswer = async (spellingGuess) => {
  const { vocabularyBuilderState, isOnline, isAiEnabled } = useStore.getState();
  const { words, currentWordIndex, pendingRecording } = vocabularyBuilderState;
  const currentWord = words[currentWordIndex];

  if (!pendingRecording || !spellingGuess.trim()) return;
  useStore.setState({ isProcessing: true });
  
  if (!isOnline || !isAiEnabled) {
    const spellingCorrect = spellingGuess.trim().toLowerCase() === currentWord.toLowerCase();
    useStore.setState(state => {
      const vs = state.vocabularyBuilderState;
      vs.lastResult = { spellingCorrect, status: spellingCorrect ? 'success' : 'fail', feedback: 'Offline mode: Only spelling was checked.' };
      if (spellingCorrect) {
          vs.score += 1;
      } else {
          vs.lives -= 1;
      }
      vs.pendingRecording = null;
      state.isProcessing = false;
    });
    return;
  }

  try {
    const { prompt, schema } = getVocabularyBuilderPrompt(currentWord, spellingGuess, pendingRecording.transcript);
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }, { inlineData: { mimeType: pendingRecording.audioMimeType, data: pendingRecording.audioBase64 } }] },
      config: { responseMimeType: 'application/json', responseSchema: schema },
    });
    
    const result = JSON.parse(response.text);
    const isSuccess = result.spellingCorrect && result.pronunciationScore >= 80;

    useStore.setState(state => {
      const vs = state.vocabularyBuilderState;
      vs.lastResult = { ...result, status: isSuccess ? 'success' : 'fail' };
      if (isSuccess) {
        vs.score += 1;
      } else {
        vs.lives -= 1;
      }
      vs.pendingRecording = null;
    });
  } catch (error) {
    console.error("Vocab Builder Feedback Error:", error);
    addToast({ title: 'AI Error', message: 'Could not get feedback.', icon: 'error' });
  } finally {
    useStore.setState({ isProcessing: false });
  }
};

export const goToNextVocabularyWord = () => {
  useStore.setState(state => {
    const vs = state.vocabularyBuilderState;
    const highScore = state.vocabularyBuilderHighScore;
    if (vs.currentWordIndex < vs.words.length - 1) {
      vs.currentWordIndex += 1;
      vs.lastResult = null;
      generateImageForWord(vs.words[vs.currentWordIndex]);
    } else {
      vs.lives = 0; // End game
    }
    if (vs.lives <= 0 && vs.score > highScore) {
      state.vocabularyBuilderHighScore = vs.score;
      if (state.user && !state.user.isAnonymous) {
        updateDoc(doc(db, "progress", state.user.uid), { vocabularyBuilderHighScore: vs.score });
      }
    }
  });
};


export const startConversation = (scenario) => {
    useStore.setState({
        view: 'conversation',
        conversationState: {
            ...initialSessionState.conversationState,
            isActive: true,
            scenarioTitle: scenario.title,
            chatHistory: [{ role: 'ai', text: scenario.startPrompt }],
        },
        error: null,
    });
    speakText(scenario.startPrompt);
};

submitConversationTurn = async () => {
    const { conversationState, isOnline, isAiEnabled } = useStore.getState();
    const { pendingRecording } = conversationState;
    if (!pendingRecording) return;
    
    useStore.setState({ isProcessing: true });
    useStore.setState(s => {
        s.conversationState.chatHistory.push({ role: 'user', text: pendingRecording.transcript, audioBase64: pendingRecording.audioBase64, audioMimeType: pendingRecording.audioMimeType });
        s.conversationState.pendingRecording = null;
    });

    if (!isOnline || !isAiEnabled) {
        const offlineMsg = "I can't respond right now as I'm offline.";
        useStore.setState(s => { s.conversationState.chatHistory.push({ role: 'ai', text: offlineMsg }); });
        speakText(offlineMsg);
        useStore.setState({ isProcessing: false });
        return;
    }

    try {
        const { scenarioTitle, chatHistory } = useStore.getState().conversationState;
        const historyString = chatHistory.map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.text}`).join('\n');
        const prompt = `You are an AI English tutor. The scenario is: "${scenarioTitle}". Continue the conversation naturally based on the history. Keep responses concise (2-4 sentences). Also provide brief, actionable feedback on the user's last message.
        History: ${historyString}
        Return ONLY a JSON object with keys "aiResponse" (string) and "feedback" (string).`;
        const schema = { type: Type.OBJECT, properties: { aiResponse: { type: Type.STRING }, feedback: { type: Type.STRING } }, required: ["aiResponse", "feedback"] };

        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
        const result = JSON.parse(response.text);
        
        useStore.setState(s => { s.conversationState.chatHistory.push({ role: 'ai', text: result.aiResponse }); });
        speakText(result.aiResponse);
        addToast({ title: 'Quick Feedback', message: result.feedback, icon: 'tips_and_updates', duration: 7000 });
    } catch (error) {
        console.error("Conversation AI Error:", error);
        const errorMsg = "Sorry, I had trouble with that. Could you try again?";
        useStore.setState(s => { s.conversationState.chatHistory.push({ role: 'ai', text: errorMsg }); });
        speakText(errorMsg);
    } finally {
        useStore.setState({ isProcessing: false });
    }
};

export const startCustomLesson = async (topic) => {
    const cachedLesson = getCachedCustomLesson(topic);
    if (cachedLesson) {
        useStore.setState({ view: 'exercise', currentLesson: cachedLesson, error: null });
        addToast({ title: 'Loaded from Cache', message: `Starting lesson on "${topic}".`, icon: 'history' });
        return;
    }

    useStore.setState({ isProcessing: true });
    addToast({ title: 'Generating Lesson...', message: `AI is creating a lesson about "${topic}".`, icon: 'auto_awesome' });

    try {
        const prompt = `Create a B1-level English lesson on the topic: "${topic}". Include 5-7 sentence repetition prompts with English text and simple Urdu translations. Return ONLY a JSON object with a "prompts" key, an array of objects with "text" and "translation" keys.`;
        const schema = { type: Type.OBJECT, properties: { prompts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, translation: { type: Type.STRING } }, required: ["text", "translation"] } } }, required: ["prompts"] };

        const response = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
        const result = JSON.parse(response.text);

        const lessonData = {
            levelId: 'custom', lessonId: topic, title: `Custom: ${topic}`, lessonType: 'sentence', isPractice: true, currentPromptIndex: 0,
            prompts: result.prompts.map(p => ({ ...p, userTranscript: null, feedback: null, score: null, pronunciationScore: null, xpGained: 0 })),
        };

        setCachedCustomLesson(topic, lessonData);
        useStore.setState({ view: 'exercise', currentLesson: lessonData, error: null });
    } catch (error) {
        console.error("Custom Lesson Generation Error:", error);
        useStore.setState({ error: "The AI couldn't create a lesson on that topic." });
    } finally {
        useStore.setState({ isProcessing: false });
    }
};

// --- Admin Actions ---
export const fetchAllUsersForAdmin = async () => {
  const usersCollection = collection(db, 'users');
  const progressCollection = collection(db, 'progress');

  try {
    const [usersSnapshot, progressSnapshot] = await Promise.all([
      getDocs(usersCollection),
      getDocs(progressCollection)
    ]);

    const progressData = {};
    progressSnapshot.forEach(doc => {
      progressData[doc.id] = doc.data();
    });

    const allUsers = usersSnapshot.docs.map(doc => {
      const userData = doc.data();
      const userProgress = progressData[doc.id] || {};
      const levelInfo = userProgress.user || { level: 1, xp: 0 };

      return {
        id: doc.id,
        name: userData.name,
        email: userData.email,
        status: userData.status || 'active',
        registrationDate: userData.registrationDate?.toDate()?.toISOString(),
        lastLogin: userData.lastLogin?.toDate()?.toISOString(),
        level: levelInfo.level,
        xp: levelInfo.xp,
        pronunciationRaceHighScore: userProgress.pronunciationRaceHighScore || 0,
      };
    });

    return allUsers;
  } catch (error) {
    console.error("Error fetching all user data for admin:", error);
    throw new Error("Could not fetch user data from Firestore.");
  }
};

export const suspendUser = async (uid, currentStatus) => {
    if (!uid) return;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, { status: newStatus });
        addToast({ title: 'User Updated', message: `User status changed to ${newStatus}.`, icon: 'check_circle' });
    } catch (error) {
        console.error("Failed to suspend user:", error);
        addToast({ title: 'Error', message: 'Could not update user status.', icon: 'error' });
    }
};

export const deleteUser = async (uid, name) => {
    if (!uid) return;
    if (window.confirm(`Are you sure you want to permanently delete the user "${name}" (${uid})? This action cannot be undone and only removes Firestore data, not the auth user.`)) {
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'users', uid));
            batch.delete(doc(db, 'progress', uid));
            await batch.commit();
            addToast({ title: 'User Deleted', message: `User "${name}" has been permanently deleted.`, icon: 'delete_forever' });
        } catch (error) {
            console.error("Failed to delete user:", error);
            addToast({ title: 'Error', message: 'Could not delete user data.', icon: 'error' });
        }
    }
};

export const resetUserProgress = async (uid, name) => {
    if (!uid) return;
    if (window.confirm(`Are you sure you want to reset all progress for "${name}"? This includes levels, XP, and high scores.`)) {
        const progressRef = doc(db, 'progress', uid);
        const initialProgress = {
            progress: {},
            dailyStreak: { count: 0, lastUpdated: null },
            achievements: [],
            pronunciationRaceHighScore: 0,
            listeningDrillHighScore: 0,
            vocabularyBuilderHighScore: 0,
            user: { xp: 0, level: 1 },
        };
        try {
            await setDoc(progressRef, initialProgress);
            addToast({ title: 'Progress Reset', message: `All progress for "${name}" has been reset.`, icon: 'restart_alt' });
        } catch (error) {
            console.error("Failed to reset progress:", error);
            addToast({ title: 'Error', message: 'Could not reset user progress.', icon: 'error' });
        }
    }
};