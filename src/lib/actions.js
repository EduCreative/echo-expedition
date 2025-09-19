/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore, { initialSessionState } from './store';
import { auth, db, googleProvider } from './firebase';
import {
  signInWithRedirect,
  signOut,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { levels, getFeedbackPrompt, getPronunciationRacePrompt } from './prompts';
import { courseData } from './course-data.js';
import { pronunciationWords } from './pronunciation-words.js';
import { listeningSentences } from './listening-sentences.js';
import { achievements } from './achievements';
import { getCachedCustomLesson, setCachedCustomLesson } from './cache';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    error: null,
  });
};
export const goToAdminPanel = () => useStore.setState({ view: 'admin' });
export const goToLeaderboard = () => useStore.setState({ view: 'leaderboard' });
export const startPracticeMode = () => useStore.setState({ view: 'practice_selection' });


// --- Authentication Actions ---

export const signInWithGoogle = async (rememberMe = true) => {
  useStore.setState({ isProcessing: true, error: null });
  try {
    // Set the session persistence based on the user's choice.
    // 'local' persists across sessions (browser close/reopen), 'session' does not.
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Google sign-in redirect failed to initiate:", error);
    useStore.setState({ isProcessing: false, error: 'Could not start the sign-in process.' });
  }
};

export const signInAsLocalGuest = () => {
  const guestUser = {
    uid: `guest_${Date.now()}`,
    displayName: 'Guest',
    isAnonymous: true, // This flag prevents any data from being written to Firebase
  };
  // Directly set the user in the store without calling Firebase
  useStore.getState().setUser(guestUser);
  addToast({
    title: 'Guest Mode',
    message: 'Your progress will not be saved in this session.',
    icon: 'info',
  });
};

export const logout = async () => {
  if (window.confirm("Are you sure you want to log out?")) {
    const { user } = useStore.getState();

    // First, sign out from Firebase if the user is not a local guest.
    // This clears Firebase's session state (e.g., in IndexedDB).
    // The onAuthStateChanged listener will also fire, but our manual
    // session clear below ensures the UI updates immediately.
    if (user && !user.isAnonymous) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Error signing out from Firebase:", error);
        // Still proceed to clear local state even if Firebase signout fails.
      }
    }

    // Always clear the local session state for all user types (Firebase or guest).
    // This provides immediate UI feedback by resetting the store.
    useStore.getState().clearUserSession();
    addToast({ title: 'Logged Out', message: 'You have been successfully signed out.', icon: 'logout' });
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
    message: `AI-powered feedback is now ${!isEnabled ? 'on' : 'off'}.`,
    icon: !isEnabled ? 'toggle_on' : 'toggle_off',
  });
};

export const setSpeechSetting = (key, value) => {
  useStore.setState(state => {
    state.speechSettings[key] = value;
  });
};

export const speakText = (text) => {
  if (typeof speechSynthesis === 'undefined' || !text) return;
  const { speechSettings } = useStore.getState();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.voiceURI === speechSettings.voice);
  utterance.voice = selectedVoice || null;
  utterance.rate = speechSettings.rate || 1;
  speechSynthesis.speak(utterance);
};


// --- Onboarding Actions ---

export const closeOnboarding = async () => {
  const { user } = useStore.getState();
  useStore.setState({ showOnboarding: false });
  if (user && !user.isAnonymous) {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { hasOnboarded: true }).catch(e => console.error("Error updating onboarding status:", e));
  }
};

export const speakOnboardingStep = (step) => {
  const textToSpeak = `${step.title}. ${step.content}`;
  speakText(textToSpeak);
};

// --- Lesson & Game Start Actions ---
export const startLesson = (levelId, lessonIndex) => {
  const lessonData = courseData[levelId]?.[lessonIndex];
  if (!lessonData) return useStore.setState({ error: 'Could not load lesson.' });
  const lessonInfo = levels[levelId].lessons[lessonIndex];

  let lessonState;
  if (['roleplay', 'boss_battle'].includes(lessonInfo.type)) {
    lessonState = { ...lessonData, levelId, lessonId: lessonIndex, title: lessonInfo.title, lessonType: lessonInfo.type };
  } else {
    lessonState = {
      levelId,
      lessonId: lessonIndex,
      title: lessonInfo.title,
      lessonType: lessonInfo.type,
      prompts: lessonData.prompts.map(p => ({ ...p, userTranscript: null, feedback: null, score: null, xpGained: 0, pendingRecording: null })),
      currentPromptIndex: 0,
      ...(lessonData.story && { story: lessonData.story }),
    };
  }
  useStore.setState({ view: 'exercise', currentLesson: lessonState, error: null, currentStreak: 0 });
};

export const startPracticeLesson = (levelId, lessonIndex) => {
  startLesson(levelId, lessonIndex);
  useStore.setState(state => {
    if(state.currentLesson) {
      state.currentLesson.isPractice = true;
      state.currentLesson.title = `Practice: ${state.currentLesson.title}`;
    }
  });
};

export const startCustomLesson = async (topic) => {
  useStore.setState({ isProcessing: true, error: null });
  const cached = getCachedCustomLesson(topic);
  if (cached) {
    useStore.setState({ view: 'exercise', currentLesson: cached, isProcessing: false });
    addToast({ title: 'Lesson Loaded', message: 'Loaded custom lesson from cache.', icon: 'cached' });
    return;
  }
  
  addToast({ title: 'Generating Lesson', message: 'AI is creating your custom lesson...', icon: 'auto_awesome' });
  try {
    // Fix: Use the existing `ai` instance and a response schema for reliable JSON output,
    // as recommended by the @google/genai guidelines. This is more robust than parsing from a text prompt.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create an English lesson with 5 prompts about: "${topic}". Provide Urdu translations for each prompt.`,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: {
                        type: Type.ARRAY,
                        description: "An array of 5 lesson prompts.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { 
                                    type: Type.STRING,
                                    description: "The English sentence for the lesson prompt."
                                },
                                translation: { 
                                    type: Type.STRING,
                                    description: "The Urdu translation of the English sentence."
                                }
                            },
                            required: ["text", "translation"],
                        }
                    }
                },
                required: ["prompts"],
            }
        }
    });
    const parsed = JSON.parse(response.text.trim());
    if (!parsed.prompts || !Array.isArray(parsed.prompts)) {
        throw new Error("AI response did not contain valid prompts array.");
    }
    const newLesson = {
      levelId: 'custom',
      lessonId: topic,
      title: `Custom: ${topic}`,
      lessonType: 'sentence',
      prompts: parsed.prompts.map(p => ({ ...p, userTranscript: null, feedback: null, score: null, xpGained: 0, pendingRecording: null })),
      currentPromptIndex: 0,
    };
    setCachedCustomLesson(topic, newLesson);
    useStore.setState({ view: 'exercise', currentLesson: newLesson, isProcessing: false });
  } catch (error) {
    console.error("Error generating custom lesson:", error);
    useStore.setState({ isProcessing: false, error: "AI couldn't create a lesson for that topic. Try again." });
  }
};

export const startPronunciationRace = () => {
  const allWords = [...pronunciationWords.easy, ...pronunciationWords.medium];
  const shuffled = allWords.sort(() => 0.5 - Math.random());
  useStore.setState({
    view: 'pronunciation_race',
    pronunciationRaceState: {
      isActive: true,
      words: shuffled.slice(0, 25),
      currentWordIndex: 0,
      streak: 0,
      lives: 3,
      lastResult: null,
    },
  });
};

export const startListeningDrill = () => {
  const allSentences = [...listeningSentences.easy, ...listeningSentences.medium];
  const shuffled = allSentences.sort(() => 0.5 - Math.random());
  useStore.setState({
    view: 'listening_drill',
    listeningDrillState: {
      isActive: true,
      sentences: shuffled.slice(0, 15),
      currentSentenceIndex: 0,
      streak: 0,
      lives: 3,
      lastResult: null,
    },
  });
};

export const startConversation = (scenario) => {
  useStore.setState({
    view: 'conversation',
    conversationState: {
      isActive: true,
      scenarioTitle: scenario.title,
      chatHistory: [{ role: 'ai', text: scenario.startPrompt }],
    },
  });
};

// --- In-Game Actions ---

export const changePrompt = (newIndex) => {
  useStore.setState(state => {
    if (state.currentLesson?.prompts) {
      if (newIndex >= 0 && newIndex < state.currentLesson.prompts.length) {
        state.currentLesson.currentPromptIndex = newIndex;
      }
    }
  });
};

export const goToNextRaceWord = () => {
  useStore.setState(state => {
    if (state.pronunciationRaceState.currentWordIndex < state.pronunciationRaceState.words.length - 1) {
      state.pronunciationRaceState.currentWordIndex++;
      state.pronunciationRaceState.lastResult = null;
    } else {
      state.pronunciationRaceState.lives = 0; // End game
    }
  });
};

export const submitListeningDrillGuess = (guess) => {
    useStore.setState(state => {
        const { sentences, currentSentenceIndex, streak, lives } = state.listeningDrillState;
        const correct = sentences[currentSentenceIndex];
        // Normalize strings for comparison
        const normalizedGuess = guess.trim().toLowerCase().replace(/[.,!?]/g, '');
        const normalizedCorrect = correct.trim().toLowerCase().replace(/[.,!?]/g, '');

        if (normalizedGuess === normalizedCorrect) {
            state.listeningDrillState.streak = streak + 1;
            state.listeningDrillState.lastResult = { status: 'success', guess, correct };
        } else {
            state.listeningDrillState.lives = lives - 1;
            state.listeningDrillState.streak = 0;
            state.listeningDrillState.lastResult = { status: 'fail', guess, correct };
        }
    });
};

export const goToNextDrillSentence = () => {
    useStore.setState(state => {
        const { currentSentenceIndex, sentences } = state.listeningDrillState;
        if (currentSentenceIndex < sentences.length - 1) {
            state.listeningDrillState.currentSentenceIndex++;
            state.listeningDrillState.lastResult = null;
        } else {
            state.listeningDrillState.lives = 0; // End game
        }
    });
};

export const recordAgain = () => {
    useStore.setState(s => {
        if (!s.currentLesson || !s.currentLesson.prompts) return;
        
        const isInteractive = ['roleplay', 'boss_battle'].includes(s.currentLesson.lessonType);

        if (isInteractive) {
            // This is not implemented in the UI for interactive lessons, but as a safeguard...
            const promptState = s.currentLesson.prompt;
            Object.assign(promptState, {
                userTranscript: null,
                feedback: null,
                score: null,
                pronunciationScore: null,
                xpGained: 0,
            });
        } else {
            const index = s.currentLesson.currentPromptIndex;
            const prompt = s.currentLesson.prompts[index];
            // Reset all user-generated fields for the prompt
            Object.assign(prompt, {
                userTranscript: null,
                feedback: null,
                score: null,
                pronunciationScore: null,
                xpGained: 0,
                pendingRecording: null,
                userRecordingBase64: null,
                userRecordingMimeType: null,
            });
        }
    });
};

// --- Admin Actions ---
export const fetchAllUsersForAdmin = async () => {
  // Fetch from both collections in parallel for efficiency
  const [usersSnapshot, progressSnapshot] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "progress"))
  ]);

  // Create a map of progress data for easy lookup
  const progressData = new Map();
  progressSnapshot.forEach(doc => {
    progressData.set(doc.id, doc.data());
  });
  
  // Map over users and combine with their progress
  return usersSnapshot.docs.map(doc => {
    const userData = doc.data();
    // Using || {} as a fallback for users who might not have a progress document yet.
    const userProgress = progressData.get(doc.id) || {};
    
    const serializeTimestamp = (timestamp) => {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      return timestamp;
    };

    return {
      id: doc.id,
      name: userData.name,
      email: userData.email,
      registrationDate: serializeTimestamp(userData.registrationDate),
      lastLogin: serializeTimestamp(userData.lastLogin),
      status: userData.status || 'active',
      // Add new progress fields with defaults
      level: userProgress.user?.level || 1,
      xp: userProgress.user?.xp || 0,
      pronunciationRaceHighScore: userProgress.pronunciationRaceHighScore || 0,
    };
  });
};

export const suspendUser = async (userId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const actionVerb = newStatus === 'suspended' ? 'suspend' : 'reactivate';
  if (window.confirm(`Are you sure you want to ${actionVerb} this user?`)) {
    await updateDoc(doc(db, "users", userId), { status: newStatus });
    addToast({ title: 'User Updated', message: `User status set to ${newStatus}.`, icon: 'security' });
  }
};

export const resetUserProgress = async (userId, userName) => {
  if (window.confirm(`Reset all progress for ${userName}? This cannot be undone.`)) {
    await setDoc(doc(db, "progress", userId), initialSessionState.progress);
    addToast({ title: 'Progress Reset', message: `Progress for ${userName} has been reset.`, icon: 'restart_alt' });
  }
};

export const deleteUser = async (userId, userName) => {
    if (window.confirm(`PERMANENTLY DELETE ${userName}? This will delete their progress and user data. Their auth account must be deleted manually from the Firebase console.`)) {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", userId));
        batch.delete(doc(db, "progress", userId));
        await batch.commit();
        addToast({ title: 'User Deleted', message: `Firestore data for ${userName} deleted.`, icon: 'delete_forever' });
    }
};

// --- Voice Commands ---
export const toggleVoiceCommands = () => {
    const isListening = useStore.getState().voiceCommandState.isListening;
    if(!isListening && (!window.SpeechRecognition && !window.webkitSpeechRecognition)){
        addToast({ title: 'Unsupported Browser', message: 'Voice commands are not supported here.', icon: 'error' });
        return;
    }
    useStore.setState(state => { state.voiceCommandState.isListening = !isListening; });
};


// --- Audio Recording & AI Processing ---
const STREAK_THRESHOLD = 70; // Score needed to continue a streak in a lesson
let recognition;
let mediaRecorder;
let audioChunks = [];
let audioMimeType;
let recordedTranscript = '';

// Helper function to find a browser-supported MIME type for audio recording.
const getSupportedMimeType = () => {
    const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
        'audio/mp4',
    ];
    for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }
    }
    return undefined; // Let the browser use its default
};

const processUserResponse = async (transcript, audioBase64, mimeType) => {
    const { view } = useStore.getState();
    // Dispatch to the correct handler based on the current view
    switch (view) {
        case 'exercise':
            await processExerciseFeedback(transcript, audioBase64, mimeType);
            break;
        case 'pronunciation_race':
            await processRaceFeedback(transcript, audioBase64, mimeType);
            break;
        case 'conversation':
            await processConversationResponse(transcript, audioBase64, mimeType);
            break;
    }
    useStore.setState({ isProcessing: false });
};

export const submitForFeedback = () => {
  const { currentLesson } = useStore.getState();
  if (!currentLesson) return;

  const promptIndex = currentLesson.currentPromptIndex;
  const prompt = currentLesson.prompts[promptIndex];
  const { pendingRecording } = prompt;

  if (pendingRecording) {
    useStore.setState({ isProcessing: true });
    processUserResponse(pendingRecording.transcript, pendingRecording.audioBase64, pendingRecording.audioMimeType);
  }
};

export const discardRecording = () => {
  const { currentLesson } = useStore.getState();
  if (!currentLesson) return;
  
  const promptIndex = currentLesson.currentPromptIndex;
  useStore.setState(s => {
    if(s.currentLesson.prompts[promptIndex]) {
      s.currentLesson.prompts[promptIndex].pendingRecording = null;
    }
  });
};

const processConversationResponse = async (transcript, audioBase64, mimeType) => {
    const { conversationState } = useStore.getState();

    useStore.setState(s => {
        s.conversationState.chatHistory.push({ role: 'user', text: transcript, audioBase64, audioMimeType: mimeType });
    });

    try {
        const history = conversationState.chatHistory.map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
        }));

        const chat = ai.chats.create({ model, history: history.slice(0, -1) });
        const result = await chat.sendMessage({ message: transcript });
        const responseText = result.text.trim();
        
        useStore.setState(s => {
            s.conversationState.chatHistory.push({ role: 'ai', text: responseText });
        });
    } catch (error) {
        console.error("Error in conversation:", error);
        addToast({ title: 'AI Error', message: 'Could not get a response.', icon: 'error' });
        useStore.setState(s => {
            s.conversationState.chatHistory.push({ role: 'ai', text: "Sorry, I encountered an error. Please try again." });
        });
    }
};

const processExerciseFeedback = async (transcript, audioBase64, mimeType) => {
  const state = useStore.getState();
  const { currentLesson, user, isOnline, isAiEnabled } = state;
  if (!currentLesson) return;

  const isInteractive = ['roleplay', 'boss_battle'].includes(currentLesson.lessonType);
  const isPractice = currentLesson.isPractice || currentLesson.levelId === 'custom';

  if (isInteractive) {
    if (!isOnline || !isAiEnabled) {
      addToast({ title: 'Feature Unavailable', message: 'Interactive lessons require an internet connection and AI features.', icon: 'sync_disabled'});
      return;
    }
    useStore.setState(s => { s.currentLesson.chatHistory.push({ role: 'user', text: transcript, audioBase64, audioMimeType: mimeType }); });
    try {
      const updatedHistory = useStore.getState().currentLesson.chatHistory;
      const context = { scenario: currentLesson.scenario, lastAiMessage: updatedHistory[updatedHistory.length - 2].text };
      const { prompt, schema } = getFeedbackPrompt(currentLesson.lessonType, context, transcript);
      
      const feedbackPromise = ai.models.generateContent({ model, contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: audioBase64 } }] }, config: { responseMimeType: "application/json", responseSchema: schema } });
      const historyForChat = updatedHistory.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] }));
      const chat = ai.chats.create({ model, history: historyForChat.slice(0, -1) });
      const responsePromise = chat.sendMessage({ message: transcript });
      const [feedbackResult, responseResult] = await Promise.all([feedbackPromise, responsePromise]);

      const feedbackData = JSON.parse(feedbackResult.text.trim());
      const aiResponseText = responseResult.text.trim();
      const averageScore = Math.round((feedbackData.score + feedbackData.pronunciationScore) / 2);
      const xpGained = averageScore >= 50 ? Math.round(averageScore / 10) : 0;
      
      useStore.setState(s => {
        s.currentLesson.chatHistory.push({ role: 'ai', text: aiResponseText });
        s.currentLesson.prompt = { ...s.currentLesson.prompt, userTranscript: transcript, ...feedbackData, xpGained };
        if (s.user && !isPractice) s.user.xp += xpGained;
        if (!isPractice) {
          const { levelId, lessonId } = currentLesson;
          if (!s.progress[levelId]) s.progress[levelId] = {};
          s.progress[levelId][lessonId] = averageScore;
          s.justCompleted = { levelId, lessonId };
        }
      });
      addToast({ title: 'Challenge Complete!', message: `You scored ${averageScore}.`, icon: 'military_tech' });
      speakText(`Challenge complete! You scored ${averageScore}. Well done!`);
      useStore.setState({ congratsAnimation: { show: true, text: 'Challenge Complete!' } });
      checkAndUpdateStreak();
    } catch (error) {
      console.error("Error in interactive lesson:", error);
      addToast({ title: 'AI Error', message: 'Could not get a response.', icon: 'error' });
      useStore.setState(s => { s.currentLesson.chatHistory.push({ role: 'ai', text: "Sorry, an AI error occurred." }); });
    }
  } else {
    const promptIndex = currentLesson.currentPromptIndex;
    const currentPrompt = currentLesson.prompts[promptIndex];
    if (!isOnline || !isAiEnabled) {
      useStore.setState(s => { s.currentLesson.prompts[promptIndex] = { ...currentPrompt, userTranscript: transcript, userRecordingBase64: audioBase64, userRecordingMimeType: mimeType, feedback: 'OFFLINE_RECORDING' }; });
      addToast({ title: 'Recording Saved', message: 'AI feedback is unavailable.', icon: isOnline ? 'toggle_off' : 'wifi_off' });
      return;
    }
    try {
      let context;
      switch (currentLesson.lessonType) {
        case 'sentence_ordering': context = { jumbledText: currentPrompt.jumbledText, correctText: currentPrompt.correctText }; break;
        case 'fill_in_the_blank': context = { promptText: currentPrompt.text, correctText: currentPrompt.correctText }; break;
        case 'comprehension': context = { story: currentLesson.story, question: currentPrompt.question, correctAnswer: currentPrompt.correctAnswer }; break;
        default: context = { promptText: currentPrompt.text, levelId: currentLesson.levelId }; break;
      }
      const { prompt, schema } = getFeedbackPrompt(currentLesson.lessonType, context, transcript);
      const result = await ai.models.generateContent({ model, contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: audioBase64 } }] }, config: { responseMimeType: "application/json", responseSchema: schema }});
      const feedbackData = JSON.parse(result.text.trim());
      const averageScore = Math.round((feedbackData.score + feedbackData.pronunciationScore) / 2);
      const xpGained = averageScore >= 50 ? Math.round(averageScore / 10) : 0;
      useStore.setState(s => {
        s.currentLesson.prompts[promptIndex] = { ...currentPrompt, userTranscript: transcript, userRecordingBase64: audioBase64, userRecordingMimeType: mimeType, ...feedbackData, xpGained, pendingRecording: null };
        if (averageScore >= STREAK_THRESHOLD) s.currentStreak++; else s.currentStreak = 0;
        if (!isPractice && s.user) {
          s.user.xp += xpGained;
          const { levelId, lessonId } = currentLesson;
          if (!s.progress[levelId]) s.progress[levelId] = {};
          if (!s.progress[levelId][lessonId]) s.progress[levelId][lessonId] = {};
          s.progress[levelId][lessonId][promptIndex] = Math.max(s.progress[levelId][lessonId][promptIndex] || 0, averageScore);
        }
      });
      const allPromptsDone = useStore.getState().currentLesson.prompts.every(p => p.feedback);
      if (allPromptsDone && !isPractice) {
        const { prompts } = useStore.getState().currentLesson;
        const totalScore = prompts.reduce((sum, p) => sum + Math.round((p.score + p.pronunciationScore) / 2), 0);
        const lessonAverage = Math.round(totalScore / prompts.length);
        useStore.setState(s => {
          const { levelId, lessonId } = currentLesson;
          s.progress[levelId][lessonId] = lessonAverage;
          s.justCompleted = { levelId, lessonId };
        });
        addToast({ title: 'Lesson Complete!', message: `Average score: ${lessonAverage}.`, icon: 'military_tech' });
        speakText(`Lesson complete! Your average score was ${lessonAverage}.`);
        useStore.setState({ congratsAnimation: { show: true, text: 'Lesson Complete!' } });
        checkAndUpdateStreak();
      }
    } catch (error) {
       console.error("Error getting exercise feedback:", error);
       addToast({ title: 'AI Error', message: 'Could not get feedback.', icon: 'error' });
       useStore.setState(s => { s.currentLesson.prompts[promptIndex].feedback = 'AI_ERROR'; });
    }
  }

  if (!isPractice && user && !user.isAnonymous) {
      const { progress, user: updatedUser, dailyStreak } = useStore.getState();
      const progressRef = doc(db, "progress", user.uid);
      await updateDoc(progressRef, { progress, 'user.xp': updatedUser.xp, dailyStreak }).catch(err => console.error("Failed to save progress:", err));
  }
  checkAndAwardAchievements();
};

const processRaceFeedback = async (transcript, audioBase64, mimeType) => {
  const { pronunciationRaceState, pronunciationRaceHighScore } = useStore.getState();
  const targetWord = pronunciationRaceState.words[pronunciationRaceState.currentWordIndex];

  try {
    const { prompt, schema } = getPronunciationRacePrompt(targetWord, transcript);
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { mimeType, data: audioBase64 } }
            ]
        },
        config: { responseMimeType: "application/json", responseSchema: schema }
    });
    const feedback = JSON.parse(result.text.trim());
    const score = feedback.pronunciationScore || 0;

    let status;
    let newStreak = pronunciationRaceState.streak;
    let newLives = pronunciationRaceState.lives;

    if (score >= 90) {
      status = 'success';
      newStreak++;
    } else if (score >= 70) {
      status = 'retry';
      newStreak = 0; // Break streak if not perfect
    } else {
      status = 'fail';
      newStreak = 0;
      newLives--;
    }
    
    useStore.setState(state => {
      state.pronunciationRaceState.streak = newStreak;
      state.pronunciationRaceState.lives = newLives;
      state.pronunciationRaceState.lastResult = { status, score, feedbackTip: feedback.feedbackTip };
      if (newStreak > state.pronunciationRaceHighScore) {
        state.pronunciationRaceHighScore = newStreak;
      }
    });

  } catch (error) {
    console.error("Error getting race feedback:", error);
    addToast({ title: 'AI Error', message: 'Could not get feedback.', icon: 'error' });
    // Fail the attempt on AI error
    useStore.setState(state => {
      state.pronunciationRaceState.lives--;
      state.pronunciationRaceState.streak = 0;
      state.pronunciationRaceState.lastResult = { status: 'fail', score: 0, feedbackTip: 'AI analysis failed.' };
    });
  }
};

const handleRecordingStop = () => {
    if (!audioChunks.length) {
        useStore.setState({ isProcessing: false });
        return;
    }

    const audioBlob = new Blob(audioChunks, { type: audioMimeType });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1];
        const state = useStore.getState();
        const { view, currentLesson, isOnline, isAiEnabled } = state;

        const isStandardLesson = view === 'exercise' && currentLesson && !['roleplay', 'boss_battle'].includes(currentLesson.lessonType);
        
        if (isStandardLesson) {
            // For standard lessons, check if we should get AI feedback or just save the recording.
            if (!isOnline || !isAiEnabled) {
                // Offline/No-AI: Skip preview, go directly to saving the recording for playback.
                const promptIndex = currentLesson.currentPromptIndex;
                const currentPrompt = currentLesson.prompts[promptIndex];
                useStore.setState(s => {
                    s.currentLesson.prompts[promptIndex] = {
                        ...currentPrompt,
                        userTranscript: recordedTranscript,
                        userRecordingBase64: base64Audio,
                        userRecordingMimeType: audioMimeType,
                        feedback: 'OFFLINE_RECORDING',
                        pendingRecording: null,
                    };
                    s.isProcessing = false;
                });
                addToast({ title: 'Recording Saved', message: 'You can now compare your recording to the prompt.', icon: isOnline ? 'toggle_off' : 'wifi_off' });
            } else {
                // Online/AI-Enabled: Show preview before submitting for feedback.
                const promptIndex = currentLesson.currentPromptIndex;
                useStore.setState(s => {
                    s.currentLesson.prompts[promptIndex].pendingRecording = {
                        audioBase64: base64Audio,
                        audioMimeType: audioMimeType,
                        transcript: recordedTranscript,
                    };
                });
                useStore.setState({ isProcessing: false });
            }
        } else {
            // For race, conversation, roleplay, etc., process immediately.
            processUserResponse(recordedTranscript, base64Audio, audioMimeType);
        }
    };
};

export const startRecording = async () => {
  if (useStore.getState().isRecording) return;
  recordedTranscript = '';
  audioChunks = [];

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const supportedMimeType = getSupportedMimeType();
    const options = supportedMimeType ? { mimeType: supportedMimeType } : {};
    
    // Media Recorder for audio capture
    mediaRecorder = new MediaRecorder(stream, options);

    // FIX: Read the actual mimeType from the recorder instance.
    // If it's still empty for some reason, provide a sensible default to prevent API errors.
    audioMimeType = mediaRecorder.mimeType || 'audio/webm';
    
    mediaRecorder.addEventListener("dataavailable", e => audioChunks.push(e.data));
    mediaRecorder.addEventListener("stop", handleRecordingStop);
    mediaRecorder.start();

    // Speech Recognition for transcript
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error("Speech Recognition not supported.");
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = e => { recordedTranscript = e.results[0][0].transcript; };
    recognition.onerror = e => { console.error(`Speech recognition error: ${e.error}`); };
    recognition.onend = () => {
        // Stop the media recorder when speech recognition ends (e.g. on pause in speech)
        if (mediaRecorder.state === 'recording') {
            stopRecording();
        }
    };
    recognition.start();

    useStore.setState({ isRecording: true, error: null });
  } catch (err) {
    console.error("Mic/Speech recognition error:", err);
    addToast({ title: 'Error', message: 'Please enable microphone permissions.', icon: 'mic_off' });
  }
};

export const stopRecording = () => {
  if (!useStore.getState().isRecording) return;
  useStore.setState({ isRecording: false, isProcessing: true });
  if (recognition) recognition.stop();
  if (mediaRecorder) mediaRecorder.stop();
};