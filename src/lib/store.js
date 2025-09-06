/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { mockUsers } from './mock-users';

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
  conversationState: { isActive: false, chatHistory: [] },
  isOnline: navigator.onLine,
  lastSynced: null,
  syncQueue: [], 
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
      // This will hold the progress for all users, keyed by email
      allUserProgress: {}, // e.g., { 'user@email.com': { progress: {...}, dailyStreak: {...}, etc. } }
      allUsers: mockUsers,
      activeUserEmail: null,
      
      // --- SESSION STATE (not persisted) ---
      ...initialSessionState,
      
      // --- ACTIONS ---
      loadActiveUser: () => set(state => {
        const email = state.activeUserEmail;
        if (!email) return;

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
          state.user = null;
          state.view = 'login';
        }
      }),

      clearSession: () => set(initialSessionState),

    })),
    {
      name: 'echo-expedition-storage',
      // Only persist these specific slices of state to localStorage
      partialize: (state) => ({ 
        allUserProgress: state.allUserProgress,
        allUsers: state.allUsers,
        activeUserEmail: state.activeUserEmail,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.allUsers || state.allUsers.length === 0) {
            state.allUsers = mockUsers;
          }
          // On app load, if we know who was logged in last, automatically load their session
          if (state.activeUserEmail) {
            state.loadActiveUser();
          }
        }
      },
    }
  )
);

export default useStore;