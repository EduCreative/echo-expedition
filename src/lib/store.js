/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';

export const initialSessionState = {
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
  canInstall: false, // Replaces installPromptEvent to prevent circular JSON errors
  speechSettings: { voice: null, rate: 1, autoPlayPrompts: true, showPhonetics: true },
  isAiEnabled: false, // Default to disabled as per user request
  isRecording: false,
  isProcessing: false,
  isAuthenticating: true, // Show loading screen on initial load while checking auth status
  error: null,
  voiceCommandState: { isListening: false },
  congratsAnimation: { show: false, text: '' },
  justCompleted: null, // e.g., { levelId: 'a1', lessonId: 0 }
  justUnlockedAchievements: [], // e.g., ['first_step']
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
      // When logging out, reset to the initial state but explicitly set
      // `isAuthenticating` to false. This prevents the app from showing the
      // "Verifying sign-in..." screen, which is only intended for the initial
      // app load, not for a user-initiated logout.
      set({ ...initialSessionState, isAuthenticating: false });
    },

    // Updates the session state with data from Firestore
    updateProgressFromSnapshot: (progressData) => set(state => {
      if (progressData) {
        // Deep-copy the progress object
        const newProgress = {};
        if (progressData.progress) {
          for (const levelId in progressData.progress) {
            if (Object.prototype.hasOwnProperty.call(progressData.progress, levelId)) {
              newProgress[levelId] = { ...(progressData.progress[levelId] || {}) };
            }
          }
        }
        state.progress = newProgress;

        state.achievements = progressData.achievements ? [...progressData.achievements] : [];
        state.pronunciationRaceHighScore = progressData.pronunciationRaceHighScore || 0;
        state.listeningDrillHighScore = progressData.listeningDrillHighScore || 0;

        if (progressData.dailyStreak) {
          const lastUpdated = progressData.dailyStreak.lastUpdated;
          state.dailyStreak = {
            count: progressData.dailyStreak.count || 0,
            lastUpdated: (lastUpdated && typeof lastUpdated.toDate === 'function')
              ? lastUpdated.toDate().toISOString()
              : lastUpdated,
          };
        } else {
          state.dailyStreak = { count: 0, lastUpdated: null };
        }
      }

      // FIX: Robustly initialize user XP and level to prevent NaN errors.
      // This ensures that even if `progressData.user` is missing from Firestore,
      // the user object in the state will have valid default values.
      if (state.user) {
        state.user.xp = progressData?.user?.xp || 0;
        state.user.level = progressData?.user?.level || 1;
      }
    }),

  }))
);

export default useStore;