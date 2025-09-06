





/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {create} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { mockUsers } from './mock-users';

const useStore = create(
  persist(
    immer((set) => ({
      // 'login', 'dashboard', 'exercise', 'pronunciation_race', 'listening_drill', 'conversation', 'admin', 'leaderboard'
      view: 'login',
      user: null, // { name, avatar, xp, level }
      showOnboarding: false,
      
      // Admin state
      allUsers: mockUsers, // All users for the admin panel

      // Tracks best scores: { a1: { 0: 95, 1: 88 }, b2: { 3: 100 } }
      progress: {},

      // State for the active exercise screen. Structure varies by lessonType.
      currentLesson: null,
      currentStreak: 0,
      
      // --- Gamification State ---
      dailyStreak: { count: 0, lastUpdated: null }, // Tracks consecutive days of practice
      achievements: [], // Array of unlocked achievement IDs
      toasts: [], // For displaying non-blocking notifications like achievements

      // --- Pronunciation Race State ---
      pronunciationRaceHighScore: 0,
      pronunciationRaceState: {
        isActive: false,
        words: [],
        currentWordIndex: 0,
        streak: 0,
        lives: 3,
        lastResult: null, // { score, feedbackTip, status: 'success' | 'fail' }
      },
      
      // --- Listening Drill State ---
      listeningDrillHighScore: 0,
      listeningDrillState: {
        isActive: false,
        sentences: [],
        currentSentenceIndex: 0,
        streak: 0,
        lives: 3,
        lastResult: null, // { status: 'success' | 'fail', correct: string, guess: string }
      },
      
      // --- Free-Form Conversation State ---
      conversationState: {
        isActive: false,
        chatHistory: [], // { role: 'user' | 'ai', text: string, ... }
      },

      // --- Offline & Sync State ---
      isOnline: navigator.onLine,
      lastSynced: null,
      // Stores attempts made while offline to be synced later.
      // Shape: { levelId, lessonId, promptIndex, transcript, audioBase64, audioMimeType }
      syncQueue: [], 
      isSyncing: false,

      // UI and device settings
      installPromptEvent: null, // For PWA installation prompt
      installPromptDismissed: false, // User dismissed the install banner
      speechSettings: {
        voice: null, // Stores the voiceURI of the selected SpeechSynthesisVoice
        rate: 1,     // Playback rate (0.5 to 2)
        autoPlayPrompts: false, // Auto-play prompts for B1+ levels
      },
      isRecording: false,
      isProcessing: false,
      error: null,
      voiceCommandState: {
        isListening: false,
      },
    })),
    {
      name: 'echo-expedition-storage', // name of the item in the storage (must be unique)
       // This function is called when rehydrating the state.
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          // If allUsers isn't in the stored data (e.g., first time a user runs this version),
          // initialize it from the mock data file. This prevents overwriting admin changes
          // on subsequent loads.
          if (!state.allUsers) {
            state.allUsers = mockUsers;
          }
        }
      },
    }
  )
);

export default useStore;