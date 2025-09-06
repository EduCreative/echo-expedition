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
const initialUserStats = { xp: 0, level: 1 };

const loginUser = (googleProfile) => {
    const { allUsers, progress } = get();
    let userInSystem = allUsers.find(u => u.email === googleProfile.email);
    let isNewUser = false;

    if (!userInSystem) {
        isNewUser = true;
        const newUser = {
            id: allUsers.length > 0 ? Math.max(...allUsers.map(u => u.id)) + 1 : 1,
            name: googleProfile.name,
            email: googleProfile.email,
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            lessonsCompleted: 0,
            status: 'active',
            pronunciationRaceHighScore: 0,
            listeningDrillHighScore: 0,
        };
        set(state => { state.allUsers.push(newUser); });
        userInSystem = newUser;
    } else {
        // Update last login for existing user
        set(state => {
            const user = state.allUsers.find(u => u.id === userInSystem.id);
            if (user) {
                user.lastLogin = new Date().toISOString();
            }
        });
    }

    const hasProgress = Object.keys(progress).length > 0;
    
    if (isNewUser) {
        // For a new user, reset all progress-related state to ensure a clean slate.
        set({
            progress: {},
            dailyStreak: { count: 0, lastUpdated: null },
            achievements: [],
            user: { ...initialUserStats, name: googleProfile.name, avatar: googleProfile.picture, email: googleProfile.email },
            showOnboarding: true,
            pronunciationRaceHighScore: 0,
            listeningDrillHighScore: 0,
        });
    } else {
        // For an existing user, we keep their progress that's already in the store
        // from zustand/persist and just update their identity.
        set({
            user: { 
                ...(get().user || initialUserStats), // Preserve existing xp/level
                name: userInSystem.name, 
                avatar: googleProfile.picture, 
                email: userInSystem.email 
            },
            showOnboarding: !hasProgress, // Show onboarding if they exist but have no progress
            pronunciationRaceHighScore: userInSystem.pronunciationRaceHighScore || 0,
            listeningDrillHighScore: userInSystem.listeningDrillHighScore || 0,
        });
    }

    set({ view: 'dashboard' });
};

export const handleGoogleLogin = (response) => {
  try {
    const userObject = JSON.parse(atob(response.credential.split('.')[1]));
    const profile = {
      name: userObject.name,
      email: userObject.email,
      picture: userObject.picture,
    };
    loginUser(profile);
  } catch (error) {
    console.error("Error with Google Sign-In:", error);
    set({ error: "There was a problem signing in with Google." });
  }
};

const performGuestLogin = (userProfile) => {
    // Reset state for a clean guest session
    set({
        user: { ...initialUserStats, ...userProfile },
        view: 'dashboard',
        showOnboarding: true,
        progress: {},
        dailyStreak: { count: 0, lastUpdated: null },
        achievements: [],
        pronunciationRaceHighScore: 0,
        listeningDrillHighScore: 0,
    });
};

export const continueAsGuest = () => performGuestLogin({ name: 'Guest', avatar: null, email: 'guest@example.com' });

export const logout = () => {
    // Clear all user-specific data from the store on logout.
    set({
        view: 'login',
        user: null,
        progress: {},
        currentLesson: null,
        currentStreak: 0,
        dailyStreak: { count: 0, lastUpdated: null },
        achievements: [],
        toasts: [],
        pronunciationRaceHighScore: 0,
        listeningDrillHighScore: 0,
        pronunciationRaceState: { isActive: false, words: [], currentWordIndex: 0, streak: 0, lives: 3, lastResult: null },
        listeningDrillState: { isActive: false, sentences: [], currentSentenceIndex: 0, streak: 0, lives: 3, lastResult: null },
        conversationState: { isActive: false, chatHistory: [] },
    });
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
export const closeOnboarding = () => set({ showOnboarding: false });
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
export const startLesson = async (levelId, lessonId) => {
  const lessonMeta = levels[levelId].lessons[lessonId];
  const lessonContent = courseData[levelId]?.[lessonId];
  
  const isInteractive = ['roleplay', 'boss_battle'].includes(lessonMeta.type);
  if (isInteractive && !get().isOnline) {
    alert("This lesson requires an internet connection for a real-time conversation with the AI.");
    return;
  }
  
  if (!lessonContent) {
    set({ error: "Lesson content not found." });
    return;
  }
  
  const lessonData = {
    levelId,
    lessonId,
    lessonType: lessonMeta.type,
    title: lessonMeta.title,
    ...lessonContent,
  };

  // Hydrate with empty user progress fields if they don't exist
  if (lessonData.prompts) {
    lessonData.prompts = lessonData.prompts.map(p => ({ userTranscript: null, feedback: null, score: null, ...p }));
    lessonData.currentPromptIndex = 0;
  } else {
    lessonData.prompt = { userTranscript: null, feedback: null, score: null, ...lessonData.prompt };
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

const endPronunciationRace = (updateHighScore = true) => {
    const { streak, isActive } = get().pronunciationRaceState;
    if (!isActive) return;

    if (updateHighScore) {
      const currentHighScore = get().pronunciationRaceHighScore;
      const currentUser = get().user;
      if (streak > currentHighScore) {
        set(state => {
            state.pronunciationRaceHighScore = streak;
            const userInLeaderboard = state.allUsers.find(u => u.email === currentUser.email);
            if (userInLeaderboard) {
                userInLeaderboard.pronunciationRaceHighScore = streak;
            }
        });
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

const endListeningDrill = (updateHighScore = true) => {
    const { streak, isActive } = get().listeningDrillState;
    if (!isActive) return;
    if (updateHighScore) {
        const currentHighScore = get().listeningDrillHighScore;
        const currentUser = get().user;
        if (streak > currentHighScore) {
            set(state => {
                state.listeningDrillHighScore = streak;
                const userInLeaderboard = state.allUsers.find(u => u.email === currentUser.email);
                if (userInLeaderboard) {
                    userInLeaderboard.listeningDrillHighScore = streak;
                }
            });
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
export const startConversation = () => {
    if (!get().isOnline) {
        alert("The conversation mode requires an internet connection.");
        return;
    }
    set({
        view: 'conversation',
        error: null,
        conversationState: {
            isActive: true,
            chatHistory: [{ role: 'ai', text: 'Hello! What would you like to talk about today?' }],
        }
    });
}

const endConversation = () => {
    set(state => {
        state.conversationState.isActive = false;
        state.conversationState.chatHistory = [];
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

const updateStreak = () => {
  set(state => {
    const today = new Date().toDateString();
    const lastUpdated = state.dailyStreak.lastUpdated;

    if (lastUpdated !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastUpdated === yesterday.toDateString()) {
        state.dailyStreak.count += 1; // Continue streak
      } else {
        state.dailyStreak.count = 1; // Reset streak
      }
      state.dailyStreak.lastUpdated = today;
    }
  });
};

const checkForAchievements = () => {
  const currentState = get();
  for (const achievement of achievements) {
    if (!currentState.achievements.includes(achievement.id)) {
      if (achievement.check(currentState)) {
        set(state => { state.achievements.push(achievement.id); });
        addToast({
          title: 'Achievement Unlocked!',
          message: achievement.name,
          icon: achievement.icon
        });
      }
    }
  }
};

const handleScoringAndProgress = (contentScore, isCustom, levelId, lessonId) => {
  const streak = get().currentStreak;
  const comboBonus = contentScore * streak * COMBO_BONUS_MULTIPLIER;
  const xpGained = Math.round(contentScore + comboBonus);

  set(state => {
    if (contentScore >= STREAK_THRESHOLD) state.currentStreak += 1;
    else state.currentStreak = 0;

    const currentBestScore = state.progress[levelId]?.[lessonId];
    if (isCustom || currentBestScore === undefined || contentScore > currentBestScore) {
      state.user.xp += xpGained;
      if (!isCustom) {
        if (!state.progress[levelId]) state.progress[levelId] = {};
        state.progress[levelId][lessonId] = contentScore;
      }
      const xpForNextLevel = state.user.level * XP_PER_LEVEL;
      if (state.user.xp >= xpForNextLevel) {
        state.user.level += 1;
        state.user.xp -= xpForNextLevel;
      }
    }
  });

  // Update streak and check for achievements after scoring
  if (contentScore >= STREAK_THRESHOLD) {
    updateStreak();
  }
  checkForAchievements();

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

  if (isOnline) {
    await processOnline(transcript, audioData, lessonState);
  } else {
    processOffline(transcript, audioData, lessonState);
  }
};

const processOnline = async (transcript, audioData, lessonState) => {
  const { lessonType, levelId, lessonId } = lessonState;
  const isCustom = levelId === 'custom';

  try {
    let context, result, xpGained, promptToUpdate;
    const currentLesson = get().currentLesson;

    switch (lessonType) {
      case 'sentence':
      case 'word_scramble':
      case 'situational_prompt':
        const promptIndex = currentLesson.currentPromptIndex;
        promptToUpdate = currentLesson.prompts[promptIndex];
        context = (lessonType === 'word_scramble')
          ? { scrambledText: promptToUpdate.scrambledText, correctText: promptToUpdate.correctText }
          : { levelId, promptText: promptToUpdate.text };
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
    xpGained = handleScoringAndProgress(result.score, isCustom, levelId, lessonId);

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

const processOffline = (transcript, audioData, lessonState) => {
  const { levelId, lessonId, currentPromptIndex } = lessonState;

  set(state => {
    let promptToUpdate = (state.currentLesson.prompts) ? state.currentLesson.prompts[currentPromptIndex] : state.currentLesson.prompt;
    promptToUpdate.userTranscript = transcript;
    promptToUpdate.userRecordingBase64 = audioData.data;
    promptToUpdate.userRecordingMimeType = audioData.mimeType;
    promptToUpdate.feedback = 'Awaiting Sync';
    promptToUpdate.score = null;

    state.syncQueue.push({
      levelId,
      lessonId,
      promptIndex: currentPromptIndex,
      transcript,
      audioBase64: audioData.data,
      audioMimeType: audioData.mimeType,
    });
    
    state.isProcessing = false;
  });
};

export const syncProgress = async () => {
    const { syncQueue, isOnline } = get();
    if (!isOnline || syncQueue.length === 0) return;

    set({ isSyncing: true, error: null });

    const queueToProcess = [...syncQueue];
    // Clear queue immediately to prevent duplicate processing
    set(state => { state.syncQueue = []; });

    for (const item of queueToProcess) {
        try {
            const { levelId, lessonId, promptIndex, transcript, audioBase64, audioMimeType } = item;
            const lessonMeta = levels[levelId]?.lessons[lessonId];
            const lessonContent = courseData[levelId]?.[lessonId];
            
            if (!lessonMeta || !lessonContent) continue;

            const lessonType = lessonMeta.type;
            const isCustom = levelId === 'custom';

            let context, promptData;
            if (lessonContent.prompts) {
              promptData = lessonContent.prompts[promptIndex];
              context = (lessonType === 'word_scramble')
                ? { scrambledText: promptData.scrambledText, correctText: promptData.correctText }
                : { levelId, promptText: promptData.text };
            } else {
              // This logic is for non-prompt-array lessons, which are online-only,
              // so they shouldn't be in the sync queue. This is a safeguard.
              continue; 
            }
            
            const audioData = { data: audioBase64, mimeType: audioMimeType };
            const { prompt, schema } = getFeedbackPrompt(lessonType, context, transcript);
            const result = await getFeedbackFromAI(prompt, schema, audioData);
            const xpGained = handleScoringAndProgress(result.score, isCustom, levelId, lessonId);

            // Important: We need to update the *persisted* user progress, not just in-memory `currentLesson`.
            // The user might not be on the exercise screen when syncing.
            // For now, let's just log it. A more complex app might update a DB.
            console.log(`Synced: ${levelId}/${lessonId}/${promptIndex}. Score: ${result.score}`);
        } catch (e) {
            console.error('Failed to sync an item:', e);
            // Optional: add item back to queue for retry
            // set(state => { state.syncQueue.unshift(item); });
        }
    }

    set({ isSyncing: false, lastSynced: new Date().toISOString() });
};

// --- Admin Panel Actions ---
export const suspendUser = (userId) => {
    set(state => {
        const user = state.allUsers.find(u => u.id === userId);
        if (user) {
            user.status = user.status === 'active' ? 'suspended' : 'active';
        }
    });
};

export const deleteUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to permanently delete user: ${userName}? This action cannot be undone.`)) {
        set(state => {
            state.allUsers = state.allUsers.filter(u => u.id !== userId);
        });
    }
};

export const resetUserProgress = (userId, userName) => {
    if (window.confirm(`Are you sure you want to reset all progress for user: ${userName}?`)) {
        set(state => {
            const user = state.allUsers.find(u => u.id === userId);
            if (user) {
                user.lessonsCompleted = 0;
                // In a real app, you'd also reset their 'progress' object, etc.
                // For this mock, just resetting the count is sufficient.
            }
        });
    }
};