/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { masterData } from './master-data';

const initialSessionState = {
  view: 'login',
  user: null, // { name, avatar, email, xp, level }
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
  lastSynced: null,
  // syncQueue is now persisted, but we reset it in the initial session state
  isSyncing: false,
  installPromptEvent: null,
  installPromptDismissed: false,
  speechSettings: { voice: null, rate: 1, autoPlayPrompts: false },
  isRecording: false,
  isProcessing: false,
  error: null,
  voiceCommandState: { isListening: false },
};


const useStore = create(
  persist(
    immer((set, get) => ({
      // --- PERSISTED STATE ---
      activeUserEmail: null,
      allUserProgress: masterData.progress,
      syncQueue: [], 
      
      // --- "DATABASE" STATE (not persisted, lives for the session) ---
      // Initialized from a single master source to simulate a central DB
      allUsers: masterData.users,

      // --- SESSION STATE (transient, per-user) ---
      ...initialSessionState,
      
      // --- ACTIONS ---
      loadActiveUser: () => set(state => {
        const email = state.activeUserEmail;
        if (!email) {
            // No user, reset session state to default but keep DB state
            Object.assign(state, initialSessionState);
            state.view = 'login';
            return;
        }

        const userData = state.allUserProgress[email];
        const userInfo = state.allUsers.find(u => u.email === email);

        if (userData && userInfo) {
          state.user = {
            name: userInfo.name,
            avatar: userInfo.picture,
            email: userInfo.email,
            ...userData.user, // xp, level
          };
          state.progress = userData.progress;
          state.dailyStreak = userData.dailyStreak;
          state.achievements = userData.achievements;
          state.pronunciationRaceHighScore = userData.pronunciationRaceHighScore;
          state.listeningDrillHighScore = userData.listeningDrillHighScore;
          state.view = 'dashboard';
        } else {
          // Data inconsistency, log out
          state.activeUserEmail = null;
          Object.assign(state, initialSessionState); // Reset session state
          state.view = 'login';
        }
      }),

      clearSession: () => set(state => {
        // Resets the active user's session state, but leaves the "DB" state intact.
        Object.assign(state, initialSessionState);
      }),

    })),
    {
      name: 'echo-expedition-storage',
      // Persist the user's email, all their progress data, and any pending sync items.
      partialize: (state) => ({ 
        activeUserEmail: state.activeUserEmail,
        allUserProgress: state.allUserProgress,
        syncQueue: state.syncQueue,
      }),
      onRehydrateStorage: () => (state) => {
        // On app load, if we have a persisted email, load that user's session data.
        // The persisted `allUserProgress` and `syncQueue` are automatically rehydrated.
        if (state) {
          state.loadActiveUser();
        }
      },
    }
  )
);

export default useStore;
