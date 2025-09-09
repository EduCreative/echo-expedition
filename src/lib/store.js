/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

const initialSessionState = {
  view: 'login', // or 'dashboard' once authenticated
  user: null, // This will hold the Firebase auth user object { uid, displayName, photoURL, email, isAnonymous }
  progress: {},
  dailyStreak: { count: 0, lastUpdated: null },
  achievements: [],
  pronunciationRaceHighScore: 0,
  listeningDrillHighScore: 0,
  showOnboarding: false,
  currentLesson: null,
  currentStreak: 0,
  toasts: [],
  pronunciationRaceState: { isActive: false, words: [], currentWordIndex: 0, streak: 0, lives: 3, lastResult: null },
  listeningDrillState: { isActive: false, sentences: [], currentSentenceIndex: 0, streak: 0, lives: 3, lastResult: null },
  conversationState: { isActive: false, chatHistory: [], scenarioTitle: null },
  isOnline: navigator.onLine,
  isSyncing: false, // Retained for visual feedback, though Firestore handles sync
  installPromptEvent: null,
  installPromptDismissed: false,
  speechSettings: { voice: null, rate: 1, autoPlayPrompts: false, showPhonetics: false },
  isRecording: false,
  isProcessing: false,
  error: null,
  voiceCommandState: { isListening: false },
  unsubscribeFromProgress: null, // To store the Firestore listener unsubscribe function
};


const useStore = create(
  immer((set, get) => ({
    ...initialSessionState,
    
    // ACTIONS
    
    // Sets user auth data and view
    setUser: (firebaseUser) => set(state => {
      state.user = firebaseUser;
      state.view = 'dashboard';
    }),

    // Clears all session data on logout
    clearUserSession: () => {
      // Unsubscribe from any active Firestore listener
      const unsubscribe = get().unsubscribeFromProgress;
      if (unsubscribe) {
        unsubscribe();
      }
      set(initialSessionState);
    },

    // Updates the session state with data from Firestore
    updateProgressFromSnapshot: (progressData) => set(state => {
      state.progress = progressData.progress || {};
      state.dailyStreak = progressData.dailyStreak || { count: 0, lastUpdated: null };
      state.achievements = progressData.achievements || [];
      state.pronunciationRaceHighScore = progressData.pronunciationRaceHighScore || 0;
      state.listeningDrillHighScore = progressData.listeningDrillHighScore || 0;
      if (state.user) {
        state.user.xp = progressData.user?.xp || 0;
        state.user.level = progressData.user?.level || 1;
      }
    }),
    
    setUnsubscribe: (unsubFunc) => set({ unsubscribeFromProgress: unsubFunc }),

  }))
);

export default useStore;