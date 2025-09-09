

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store';
import { levels, getFeedbackPrompt, getPronunciationRacePrompt } from './prompts';
import { courseData } from './course-data';
import { generate, translateToUrdu } from './llm';
import { GoogleGenAI } from '@google/genai';
import { getCachedCustomLesson, setCachedCustomLesson } from './cache';
import { achievements } from './achievements';
import { pronunciationWords } from './pronunciation-words';
import { listeningSentences } from './listening-sentences';

import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, writeBatch, query, collection, getDocs, deleteDoc, increment } from 'firebase/firestore';

const get = useStore.getState;
const set = useStore.setState;

const XP_PER_LEVEL = 500;
const STREAK_THRESHOLD = 70; // Min score to continue a streak
const COMBO_BONUS_MULTIPLIER = 0.1; // 10% bonus XP per streak level
const RACE_SUCCESS_THRESHOLD = 90; // Min score for a "perfect" pronunciation in the race
const RACE_FAIL_THRESHOLD = 70; // Score below this costs a life

let recognition;
let mediaRecorder;
let audioChunks = [];
let lastTranscript = '';

// --- Toast Notifications ---
let toastId = 0;
export const addToast = (message) => {
  const id = toastId++;
  set(state => { state.toasts.push({ id, ...message }); });
  setTimeout(() => removeToast(id), 5000); // Auto-dismiss after 5 seconds
};

const removeToast = (id) => {
  set(state => {
    state.toasts = state.toasts.filter(t => t.id !== id);
  });
};

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const initializeMedia = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        lastTranscript = transcript;
        const { pronunciationRaceState, currentLesson, conversationState } = get();

        if (pronunciationRaceState.isActive) {
           set(state => { state.pronunciationRaceState.userTranscript = transcript; });
        } else if (conversationState.isActive) {
           // Transcript for conversation is handled in onstop
        }
        else if (currentLesson) {
           set(state => {
            if (state.currentLesson) {
              let prompt = (state.currentLesson.prompts) ? state.currentLesson.prompts[state.currentLesson.currentPromptIndex] : state.currentLesson.prompt;
              if (prompt) prompt.userTranscript = transcript;
            }
           });
        }
      };
      recognition.onerror = (event) => set({ isRecording: false, isProcessing: false, error: `Speech recognition error: ${event.error}` });
      recognition.onend = () => { if (get().isRecording) stopRecording(); };
    } else {
      throw new Error("Speech Recognition not supported");
    }

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioChunks = [];
      
      const stateAtStop = get();
      const lessonAtStop = stateAtStop.currentLesson;
      const raceAtStop = stateAtStop.pronunciationRaceState;
      const conversationAtStop = stateAtStop.conversationState;

      // Get the last transcript from our module-level variable, which is reliably updated during onresult.
      const finalTranscript = lastTranscript;
      lastTranscript = ''; // Reset for the next recording.

      let transcript;
      if (raceAtStop.isActive) {
        transcript = raceAtStop.userTranscript || finalTranscript;
      } else if (conversationAtStop.isActive) {
        transcript = finalTranscript; // We always need the latest for conversation.
      } else if (lessonAtStop) {
        let currentPromptObject = (lessonAtStop.prompts) ? lessonAtStop.prompts[lessonAtStop.currentPromptIndex] : lessonAtStop.prompt;
        transcript = currentPromptObject?.userTranscript || finalTranscript;
      }


      if (!transcript) {
        set({ isProcessing: false, error: 'Could not understand your speech. Please try again.' });
        return;
      }
      
      set({ isProcessing: true, error: null });

      try {
        const base64Audio = await blobToBase64(audioBlob);
        const audioData = { data: base64Audio, mimeType: audioBlob.type };
        await processRecording(transcript, audioData, lessonAtStop);
      } catch (e) {
        console.error("Error processing recording:", e);
        set({ isProcessing: false, error: e.message || "Failed to analyze audio." });
      }
    };
  } catch (e)
 {
    console.error("Failed to initialize media devices:", e);
    recognition = null;
    mediaRecorder = null;
    set({ error: "Microphone access is required. Please allow microphone permissions and refresh." });
  }
};
initializeMedia();

// --- Auth & Navigation ---
export const signInWithGoogle = async () => {
    set({ isProcessing: true });
    try {
        await signInWithPopup(auth, googleProvider);
        // onAuthStateChanged in App.jsx will handle the rest. The view change will
        // implicitly handle the loading state, but we add a finally for robustness.
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        switch (error.code) {
            case 'auth/network-request-failed':
                addToast({ 
                    title: 'Offline', 
                    message: 'An internet connection is required to sign in.', 
                    icon: 'wifi_off' 
                });
                break;
            case 'auth/popup-closed-by-user':
            case 'auth/cancelled-popup-request':
                // These are user-driven actions (closing the popup or clicking again).
                // No error toast is needed. We just log it for debugging.
                console.log(`Google Sign-in flow cancelled by user: ${error.code}`);
                break;
            case 'auth/popup-blocked':
                addToast({
                    title: 'Popup Blocked',
                    message: 'Please allow popups for this site to use Google Sign-In.',
                    icon: 'block'
                });
                break;
            default:
                addToast({ title: 'Sign-in Failed', message: 'An unexpected error occurred. Please try again.', icon: 'error' });
                console.error(`Unhandled sign-in error: ${error.message}`);
        }
    } finally {
        set({ isProcessing: false });
    }
};

export const signInAnonymouslyAction = async () => {
    set({ isProcessing: true });
    try {
        await signInAnonymously(auth);
        // onAuthStateChanged in App.jsx will handle the rest
    } catch (error) {
        console.error("Error during anonymous sign-in:", error);
        if (error.code === 'auth/network-request-failed') {
            addToast({ 
                title: 'Offline', 
                message: 'An internet connection is required to sign in.', 
                icon: 'wifi_off' 
            });
        } else {
            addToast({ title: 'Sign-in Failed', message: 'An unexpected error occurred. Please try again.', icon: 'error' });
        }
    } finally {
        set({ isProcessing: false });
    }
};

export const logout = () => {
    signOut(auth);
};

export const goToDashboard = () => {
    endPronunciationRace(false);
    endListeningDrill(false);
    endConversation();
    set({ view: 'dashboard', currentLesson: null, error: null });
};
export const goToAdminPanel = () => set({ view: 'admin' });
export const goToLeaderboard = () => set({ view: 'leaderboard' });


// --- UI, Settings & Status ---
export const closeOnboarding = () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    updateDoc(userRef, { hasOnboarded: true });
    set({ showOnboarding: false }); // Also update local state immediately
};
export const setSpeechSetting = (setting, value) => set(state => { state.speechSettings[setting] = value; });
export const setOnlineStatus = (isOnline) => set({ isOnline });
export const setInstallPromptEvent = (event) => set({ installPromptEvent: event, installPromptDismissed: false });
export const dismissInstallPrompt = () => set({ installPromptDismissed: true });

const getVoices = () => {
  return new Promise(resolve => {
    if (typeof window.speechSynthesis === 'undefined') {
      resolve([]);
      return;
    }
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
  });
};

export const speakText = (text, lang = 'en-US') => {
  if (!text || typeof window.speechSynthesis === 'undefined') return;

  const { speechSettings } = get();
  
  getVoices().then(availableVoices => {
      let selectedVoice = null;
      if (lang === 'ur-PK') {
          // Prioritize Urdu voices
          selectedVoice = availableVoices.find(v => v.lang === 'ur-PK');
      } else if (speechSettings.voice) {
          // Use user-selected voice for English
          selectedVoice = availableVoices.find(v => v.voiceURI === speechSettings.voice);
      }
      
      // Fallback to any English voice if user selection not found or for default
      if (!selectedVoice && lang.startsWith('en')) {
        selectedVoice = availableVoices.find(v => v.lang.startsWith('en'));
      }
    
      speechSynthesis.cancel(); // Stop any currently speaking utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice || null; // Use selected voice or system default
      utterance.lang = lang; // Set the language
      utterance.rate = speechSettings.rate || 1;
      speechSynthesis.speak(utterance);
  });
};

export const speakOnboardingStep = async (step) => {
    const availableVoices = await getVoices();
    const hasUrduVoice = availableVoices.some(v => v.lang === 'ur-PK');

    if (hasUrduVoice) {
        const textToSpeak = `${step.urduTitle}. ${step.urduContent}`;
        speakText(textToSpeak, 'ur-PK');
    } else {
        const textToSpeak = `${step.title}. ${step.content}`;
        speakText(textToSpeak, 'en-US');
    }
};

export const promptToInstall = async () => {
  const { installPromptEvent } = get();
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  const { outcome } = await installPromptEvent.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  set({ installPromptEvent: null }); // The prompt can only be used once.
};


const parseJsonFromAi = (text, errorMessage) => {
  try {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    const cleanJsonString = match ? match[1] : text;
    return JSON.parse(cleanJsonString);
  } catch (e) {
    console.error(errorMessage, e, "Response was:", text);
    throw new Error("Could not understand the data from the AI.");
  }
}

// --- Voice Commands ---
export const toggleVoiceCommands = () => {
    set(state => {
        // Don't allow turning on if speech recognition isn't supported.
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition && !state.voiceCommandState.isListening) {
            addToast({ title: 'Unsupported Feature', message: 'Voice commands are not supported by your browser.', icon: 'warning' });
            return;
        }
        state.voiceCommandState.isListening = !state.voiceCommandState.isListening;
        if (state.voiceCommandState.isListening) {
             addToast({ title: 'Voice Commands On', message: 'Listening for commands.', icon: 'mic' });
        } else {
             addToast({ title: 'Voice Commands Off', message: 'No longer listening.', icon: 'mic_off' });
        }
    });
};


// --- Lesson Management ---
const createLessonData = (levelId, lessonId, isPractice = false) => {
  const lessonMeta = levels[levelId].lessons[lessonId];
  const lessonContent = courseData[levelId]?.[lessonId];

  if (!lessonContent) {
    return null;
  }
  
  const lessonData = {
    levelId,
    lessonId,
    lessonType: lessonMeta.type,
    title: lessonMeta.title,
    isPractice, // Flag for practice mode
    ...lessonContent,
  };

  // Hydrate with empty user progress fields if they don't exist
  if (lessonData.prompts) {
    lessonData.prompts = lessonData.prompts.map(p => ({ userTranscript: null, feedback: null, score: null, ...p }));
    lessonData.currentPromptIndex = 0;
  } else {
    lessonData.prompt = { userTranscript: null, feedback: null, score: null, ...lessonData.prompt };
  }
  
  return lessonData;
}

export const startLesson = async (levelId, lessonId) => {
  const lessonMeta = levels[levelId].lessons[lessonId];
  
  const isInteractive = ['roleplay', 'boss_battle'].includes(lessonMeta.type);
  if (isInteractive && !get().isOnline) {
    alert("This lesson requires an internet connection for a real-time conversation with the AI.");
    return;
  }
  
  const lessonData = createLessonData(levelId, lessonId);
  if (!lessonData) {
    set({ error: "Lesson content not found." });
    return;
  }

  set({
    view: 'exercise',
    isProcessing: false,
    error: null,
    currentStreak: 0,
    currentLesson: lessonData,
  });
};

export const startPracticeMode = () => set({ view: 'practice_selection' });

export const startPracticeLesson = async (levelId, lessonId) => {
  const lessonMeta = levels[levelId].lessons[lessonId];
  
  const isInteractive = ['roleplay', 'boss_battle'].includes(lessonMeta.type);
  if (isInteractive && !get().isOnline) {
    alert("This lesson requires an internet connection for a real-time conversation with the AI.");
    return;
  }

  const lessonData = createLessonData(levelId, lessonId, true); // Set isPractice to true
  if (!lessonData) {
    set({ error: "Lesson content not found." });
    return;
  }

  set({
    view: 'exercise',
    isProcessing: false,
    error: null,
    currentStreak: 0,
    currentLesson: lessonData,
  });
};

export const startCustomLesson = async (topic) => {
  if (!get().isOnline) {
    alert("Custom lesson generation requires an internet connection.");
    return;
  }
  const cachedLesson = getCachedCustomLesson(topic);
  if (cachedLesson) {
    set({ view: 'exercise', isProcessing: false, error: null, currentStreak: 0, currentLesson: cachedLesson });
    return;
  }

  set({ view: 'exercise', isProcessing: true, error: null, currentStreak: 0, currentLesson: { title: topic } });

  try {
    const generationPrompt = `Generate a JSON object containing an array of 5-10 English sentences about "${topic}" for an English learner. The sentences should cover a range of difficulties from simple to more complex. The JSON object must have a single key "prompts" which holds an array of strings. Output only the raw JSON object.`;
    const responseText = await generate(generationPrompt);
    const parsed = parseJsonFromAi(responseText, "Failed to parse custom lesson prompts from AI:");
    const promptsList = parsed.prompts;
    const translations = await Promise.all(promptsList.map(p => translateToUrdu(p).catch(() => null)));
    
    const newLessonData = {
      levelId: 'custom',
      lessonId: topic,
      lessonType: 'sentence',
      title: topic,
      prompts: promptsList.map((p, index) => ({
        text: p,
        translation: translations[index],
        userTranscript: null, feedback: null, score: null
      })),
      currentPromptIndex: 0,
    };
    
    setCachedCustomLesson(topic, newLessonData);
    set({ isProcessing: false, currentLesson: newLessonData });
  } catch (e) {
    console.error(e);
    set({ isProcessing: false, error: e.message || 'Failed to generate custom lesson from AI.' });
  }
};

export const changePrompt = (newIndex) => {
  set(state => {
    const { currentLesson } = state;
    if (!currentLesson || !currentLesson.prompts || newIndex < 0 || newIndex >= currentLesson.prompts.length) return;
    state.currentLesson.currentPromptIndex = newIndex;
  });
};

// --- Pronunciation Race Actions ---
const getNextRaceWord = () => {
    const { streak } = get().pronunciationRaceState;
    let wordList;
    if (streak < 5) wordList = pronunciationWords.easy;
    else if (streak < 15) wordList = pronunciationWords.medium;
    else wordList = pronunciationWords.hard;
    return wordList[Math.floor(Math.random() * wordList.length)];
}

export const startPronunciationRace = () => {
    if (!get().isOnline) {
        alert("Pronunciation Race requires an internet connection to get feedback.");
        return;
    }
    const firstWord = getNextRaceWord();
    set({
        view: 'pronunciation_race',
        error: null,
        pronunciationRaceState: {
            isActive: true,
            words: [firstWord],
            currentWordIndex: 0,
            streak: 0,
            lives: 3,
            lastResult: null,
            userTranscript: null,
        }
    });
}

const endPronunciationRace = async (updateHighScore = true) => {
    const { pronunciationRaceState } = get();
    if (!pronunciationRaceState.isActive) return;

    if (updateHighScore && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const progressRef = doc(db, 'progress', uid);
        const progressDoc = await getDoc(progressRef);
        const currentHighScore = progressDoc.data()?.pronunciationRaceHighScore || 0;

        if (pronunciationRaceState.streak > currentHighScore) {
            await updateDoc(progressRef, { pronunciationRaceHighScore: pronunciationRaceState.streak });
            // The onSnapshot listener in App.jsx will update the local state.
        }
    }
};

export const goToNextRaceWord = () => {
    const newWord = getNextRaceWord();
    set(state => {
        state.pronunciationRaceState.words.push(newWord);
        state.pronunciationRaceState.currentWordIndex += 1;
        state.pronunciationRaceState.lastResult = null;
        state.pronunciationRaceState.userTranscript = null;
    });
}

const processPronunciationRaceAttempt = async (transcript, audioData) => {
    const state = get();
    const { words, currentWordIndex } = state.pronunciationRaceState;
    const targetWord = words[currentWordIndex];

    try {
        const { prompt, schema } = getPronunciationRacePrompt(targetWord, transcript);
        const result = await getFeedbackFromAI(prompt, schema, audioData);
        const { pronunciationScore, feedbackTip } = result;

        if (pronunciationScore >= RACE_SUCCESS_THRESHOLD) {
            set(state => {
                state.pronunciationRaceState.streak += 1;
                state.pronunciationRaceState.lastResult = { score: pronunciationScore, feedbackTip, status: 'success' };
            });
        } else if (pronunciationScore < RACE_FAIL_THRESHOLD) {
            set(state => {
                state.pronunciationRaceState.lives -= 1;
                state.pronunciationRaceState.lastResult = { score: pronunciationScore, feedbackTip, status: 'fail' };
                if (state.pronunciationRaceState.lives <= 0) {
                    endPronunciationRace();
                }
            });
        } else { // Score is between fail and success threshold (e.g. 70-89)
            set(state => {
                state.pronunciationRaceState.lastResult = { score: pronunciationScore, feedbackTip, status: 'retry' };
            });
        }
    } catch (e) {
        console.error("Pronunciation race AI error:", e);
        set({ error: "Failed to get feedback from AI." });
    } finally {
        set({ isProcessing: false });
    }
}

// --- Listening Drill Actions ---
const getNextDrillSentence = () => {
    const { streak } = get().listeningDrillState;
    let sentenceList;
    if (streak < 5) sentenceList = listeningSentences.easy;
    else if (streak < 15) sentenceList = listeningSentences.medium;
    else sentenceList = listeningSentences.hard;
    return sentenceList[Math.floor(Math.random() * sentenceList.length)];
};

export const startListeningDrill = () => {
    const firstSentence = getNextDrillSentence();
    set({
        view: 'listening_drill',
        error: null,
        listeningDrillState: {
            isActive: true,
            sentences: [firstSentence],
            currentSentenceIndex: 0,
            streak: 0,
            lives: 3,
            lastResult: null,
        }
    });
};

const endListeningDrill = async (updateHighScore = true) => {
    const { listeningDrillState } = get();
    if (!listeningDrillState.isActive) return;
    if (updateHighScore && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const progressRef = doc(db, 'progress', uid);
        const progressDoc = await getDoc(progressRef);
        const currentHighScore = progressDoc.data()?.listeningDrillHighScore || 0;

        if (listeningDrillState.streak > currentHighScore) {
            await updateDoc(progressRef, { listeningDrillHighScore: listeningDrillState.streak });
        }
    }
};

export const goToNextDrillSentence = () => {
    const newSentence = getNextDrillSentence();
    set(state => {
        state.listeningDrillState.sentences.push(newSentence);
        state.listeningDrillState.currentSentenceIndex += 1;
        state.listeningDrillState.lastResult = null;
    });
};

export const submitListeningDrillGuess = (guess) => {
    const { sentences, currentSentenceIndex } = get().listeningDrillState;
    const correctSentence = sentences[currentSentenceIndex];

    // Normalize strings for comparison: lowercase, trim, remove punctuation
    const normalize = (str) => str.toLowerCase().trim().replace(/[.,?!]/g, '');
    
    const isCorrect = normalize(guess) === normalize(correctSentence);

    if (isCorrect) {
        set(state => {
            state.listeningDrillState.streak += 1;
            state.listeningDrillState.lastResult = { status: 'success', correct: correctSentence, guess };
        });
    } else {
        set(state => {
            state.listeningDrillState.lives -= 1;
            state.listeningDrillState.lastResult = { status: 'fail', correct: correctSentence, guess };
            if (state.listeningDrillState.lives <= 0) {
                endListeningDrill();
            }
        });
    }
};

// --- Free-Form Conversation Actions ---
export const startConversation = (scenario) => {
    if (!get().isOnline) {
        alert("The conversation mode requires an internet connection.");
        return;
    }
    const startMessage = scenario ? scenario.startPrompt : 'Hello! What would you like to talk about today?';
    const scenarioTitle = scenario ? scenario.title : 'Open Conversation';

    set({
        view: 'conversation',
        error: null,
        conversationState: {
            isActive: true,
            scenarioTitle: scenarioTitle,
            chatHistory: [{ role: 'ai', text: startMessage }],
        }
    });
}

const endConversation = () => {
    set(state => {
        state.conversationState.isActive = false;
        state.conversationState.chatHistory = [];
        state.conversationState.scenarioTitle = null;
    });
}

const processConversationTurn = async (transcript, audioData) => {
    // 1. Add user message to state immediately for responsiveness
    set(state => {
        state.conversationState.chatHistory.push({
            role: 'user',
            text: transcript,
            audioBase64: audioData.data,
            audioMimeType: audioData.mimeType,
        });
    });

    // 2. Prepare prompt and get AI response
    try {
        const currentChatHistory = get().conversationState.chatHistory;
        const conversation = currentChatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
        const prompt = `You are a friendly and helpful English tutor having a conversation with a student. Keep your responses natural and concise. Continue the conversation based on the history below. Provide only your next line of dialogue as a single string, without any prefixes like "AI:".

Conversation History:
${conversation}

Your response:`;

        const aiResponse = await generate(prompt);

        // 3. Add AI response to state
        set(state => {
            state.conversationState.chatHistory.push({ role: 'ai', text: aiResponse });
        });
    } catch (e) {
        console.error("Conversation AI error:", e);
        set({ error: "Sorry, I couldn't generate a response. Please try again." });
    } finally {
        set({ isProcessing: false });
    }
};


// --- Recording & Processing ---
export const startRecording = () => {
  if (!recognition || !mediaRecorder) {
    set({ error: 'Media recording is not initialized. Please check microphone permissions.' });
    return;
  }
  set(state => {
    state.isRecording = true;
    state.error = null;
    if (state.pronunciationRaceState.isActive) {
        state.pronunciationRaceState.lastResult = null;
        state.pronunciationRaceState.userTranscript = null;
    } else if (state.conversationState.isActive) {
        // No specific state to clear before recording
    }
    else if (state.currentLesson) {
        let prompt = (state.currentLesson.prompts) ? state.currentLesson.prompts[state.currentLesson.currentPromptIndex] : state.currentLesson.prompt;
        if (prompt) {
          prompt.userTranscript = null;
          prompt.feedback = null;
          prompt.score = null;
          prompt.pronunciationScore = null;
          prompt.xpGained = 0;
          prompt.userRecordingBase64 = null;
        }
    }
  });
  audioChunks = [];
  mediaRecorder.start();
  recognition.start();
};

export const stopRecording = () => {
  if (recognition) recognition.stop();
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  set({ isRecording: false });
};

const getFeedbackFromAI = async (prompt, schema, audioData) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const audioPart = { inlineData: { mimeType: audioData.mimeType, data: audioData.data } };
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [textPart, audioPart] },
    config: { responseMimeType: "application/json", responseSchema: schema },
  });
  return JSON.parse(response.text);
};

const updateStreak = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const progressRef = doc(db, 'progress', uid);
    const progressDoc = await getDoc(progressRef);
    if (!progressDoc.exists()) return;

    const userProgress = progressDoc.data();
    const today = new Date().toDateString();
    const lastUpdated = userProgress.dailyStreak.lastUpdated;

    if (lastUpdated !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        let newCount;
        if (lastUpdated === yesterday.toDateString()) {
            newCount = (userProgress.dailyStreak.count || 0) + 1;
        } else {
            newCount = 1;
        }
        await updateDoc(progressRef, {
            'dailyStreak.count': newCount,
            'dailyStreak.lastUpdated': today
        });
    }
};


const checkForAchievements = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const progressRef = doc(db, 'progress', uid);
    const progressDoc = await getDoc(progressRef);
    if (!progressDoc.exists()) return;
    const userProgress = progressDoc.data();
    
    const stateSnapshot = {
        ...get(), // Get current session state (like currentLesson)
        ...userProgress, // Override with latest DB state for checks
    };

    const newAchievements = [];
    for (const achievement of achievements) {
        if (!userProgress.achievements.includes(achievement.id)) {
            if (achievement.check(stateSnapshot)) {
                newAchievements.push(achievement.id);
                addToast({
                    title: 'Achievement Unlocked!',
                    message: achievement.name,
                    icon: achievement.icon
                });
            }
        }
    }
    
    if (newAchievements.length > 0) {
        await updateDoc(progressRef, {
            achievements: [...userProgress.achievements, ...newAchievements]
        });
    }
};

const handleScoringAndProgress = async (contentScore, isCustom, levelId, lessonId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return 0;
    
    const currentLesson = get().currentLesson;
    if (currentLesson?.isPractice) {
        // For practice mode, just calculate potential XP for the HUD and stop.
        let sessionStreak = get().currentStreak + (contentScore >= STREAK_THRESHOLD ? 1 : -get().currentStreak);
        set({ currentStreak: sessionStreak });
        const comboBonus = contentScore * sessionStreak * COMBO_BONUS_MULTIPLIER;
        return Math.round(contentScore + comboBonus);
    }
    
    const progressRef = doc(db, 'progress', uid);
    const progressDoc = await getDoc(progressRef);
    if (!progressDoc.exists()) return 0;
    const userProgress = progressDoc.data();
    
    let sessionStreak = get().currentStreak;
    if (contentScore >= STREAK_THRESHOLD) {
        sessionStreak += 1;
    } else {
        sessionStreak = 0;
    }
    set({ currentStreak: sessionStreak });

    const comboBonus = contentScore * sessionStreak * COMBO_BONUS_MULTIPLIER;
    let xpGained = 0;
    
    const currentBestScore = userProgress.progress?.[levelId]?.[lessonId];
    if (isCustom || currentBestScore === undefined || contentScore > currentBestScore) {
        xpGained = Math.round(contentScore + comboBonus);
        
        const updates = {};
        if (!isCustom) {
            updates[`progress.${levelId}.${lessonId}`] = contentScore;
        }
        updates['user.xp'] = increment(xpGained);
        
        await updateDoc(progressRef, updates);
        
        // Check for level up
        const newXp = userProgress.user.xp + xpGained;
        const xpForNextLevel = userProgress.user.level * XP_PER_LEVEL;
        if (newXp >= xpForNextLevel) {
            await updateDoc(progressRef, {
                'user.level': increment(1),
                'user.xp': newXp - xpForNextLevel
            });
        }
        
        // Update streaks and achievements
        if (contentScore >= STREAK_THRESHOLD) {
            await updateStreak();
        }
        await checkForAchievements();
    }
    
    return xpGained;
};

export const processRecording = async (transcript, audioData, lessonState) => {
  const { isOnline, pronunciationRaceState, conversationState } = get();

  if (pronunciationRaceState.isActive) {
      if (isOnline) {
        await processPronunciationRaceAttempt(transcript, audioData);
      } else {
        set({ isProcessing: false, error: 'Pronunciation Race requires an internet connection.' });
      }
      return;
  }
  
  if (conversationState.isActive) {
      if (isOnline) {
          await processConversationTurn(transcript, audioData);
      } else {
          set({ isProcessing: false, error: 'Conversation mode requires an internet connection.' });
      }
      return;
  }
  
  // For standard lessons, Firebase offline persistence handles this automatically.
  // We can treat online and offline the same way from the action's perspective.
  await processStandardLesson(transcript, audioData, lessonState);
};

const processStandardLesson = async (transcript, audioData, lessonState) => {
  const { lessonType, levelId, lessonId } = lessonState;
  const isCustom = levelId === 'custom';

  try {
    let context, result, xpGained, promptToUpdate;
    const currentLesson = get().currentLesson;
    const promptIndex = currentLesson.currentPromptIndex;

    switch (lessonType) {
      case 'sentence':
      case 'situational_prompt':
        promptToUpdate = currentLesson.prompts[promptIndex];
        context = { levelId, promptText: promptToUpdate.text };
        break;
      case 'sentence_ordering':
        promptToUpdate = currentLesson.prompts[promptIndex];
        context = { jumbledText: promptToUpdate.jumbledText, correctText: promptToUpdate.correctText };
        break;
      case 'fill_in_the_blank':
        promptToUpdate = currentLesson.prompts[promptIndex];
        context = { promptText: promptToUpdate.text, correctText: promptToUpdate.correctText };
        break;
      case 'comprehension':
        promptToUpdate = currentLesson.prompts[promptIndex];
        context = {
          story: currentLesson.story,
          question: promptToUpdate.question,
          correctAnswer: promptToUpdate.correctAnswer,
        };
        break;
      case 'roleplay':
      case 'boss_battle':
        promptToUpdate = currentLesson.prompt;
        const lastAiMessage = currentLesson.chatHistory.at(-1).text;
        context = { scenario: currentLesson.scenario, lastAiMessage };
        set(state => {
          state.currentLesson.chatHistory.push({ role: 'user', text: transcript, audioBase64: audioData.data, audioMimeType: audioData.mimeType });
        });
        break;
      default:
        throw new Error(`Unknown lesson type: ${lessonType}`);
    }

    const { prompt, schema } = getFeedbackPrompt(lessonType, context, transcript);
    result = await getFeedbackFromAI(prompt, schema, audioData);
    xpGained = await handleScoringAndProgress(result.score, isCustom, levelId, lessonId);

    set(state => {
      const lesson = state.currentLesson;
      let targetPrompt = (lesson.prompts) ? lesson.prompts[lesson.currentPromptIndex] : lesson.prompt;
      targetPrompt.feedback = result.feedback;
      targetPrompt.score = result.score;
      targetPrompt.pronunciationScore = result.pronunciationScore;
      targetPrompt.xpGained = xpGained;
      targetPrompt.userRecordingBase64 = audioData.data;
      targetPrompt.userRecordingMimeType = audioData.mimeType;
      state.isProcessing = false;
    });

    if (lessonType === 'roleplay' || lessonType === 'boss_battle') {
        const currentChatHistory = get().currentLesson.chatHistory;
        const conversation = currentChatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
        const aiResponsePrompt = `You are role-playing. Here is the scenario: "${currentLesson.scenario}". Continue the conversation based on the history below. Provide only your next line of dialogue as a single string. Do not add labels like "AI:" or quotes.\n\nConversation History:\n${conversation}\n\nYour response:`;
        const aiNextLine = await generate(aiResponsePrompt);
        set(state => { state.currentLesson.chatHistory.push({ role: 'ai', text: aiNextLine }); });
    }

  } catch (e) {
    console.error(e);
    set({ isProcessing: false, error: 'Failed to get feedback from AI.' });
  }
};

// --- Admin Panel Actions ---
export const fetchAllUsersForAdmin = async () => {
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return usersList;
};

export const suspendUser = async (userId, currentStatus) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        status: currentStatus === 'active' ? 'suspended' : 'active'
    });
};

export const deleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to permanently delete user: ${userName}? This action cannot be undone.`)) {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        const progressRef = doc(db, 'progress', userId);
        
        batch.delete(userRef);
        batch.delete(progressRef);
        
        await batch.commit();
    }
};

export const resetUserProgress = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to reset all progress for user: ${userName}?`)) {
        const progressRef = doc(db, 'progress', userId);
        await setDoc(progressRef, {
            progress: {},
            dailyStreak: { count: 0, lastUpdated: null },
            achievements: [],
            pronunciationRaceHighScore: 0,
            listeningDrillHighScore: 0,
            user: { xp: 0, level: 1 },
        });

        // Also update the user doc if it tracks things like lessons completed
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { lessonsCompleted: 0 });
    }
};