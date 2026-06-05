/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {create} from 'zustand';
import {immer}from 'zustand/middleware/immer';

export const initialSessionState = {
  view: 'login', // or 'dashboard' once authenticated
  user: null, // This will hold the Firebase auth user object { uid, displayName, photoURL, email, isAnonymous }
  progress: {},
  dailyStreak: { count: 0, lastUpdated: null },
  achievements: [],
  pronunciationRaceHighScore: 0,
  listeningDrillHighScore: 0,
  vocabularyBuilderHighScore: 0,
  showOnboarding: false,
  currentLesson: null,
  currentStreak: 0,
  toasts: [],
  pronunciationRaceState: { isActive: false, words: [], currentWordIndex: 0, streak: 0, lives: 3, lastResult: null, difficulty: 'easy' },
  listeningDrillState: { isActive: false, sentences: [], currentSentenceIndex: 0, streak: 0, lives: 3, lastResult: null, difficulty: 'easy' },
  vocabularyBuilderState: { isActive: false, words: [], currentWordIndex: 0, score: 0, lives: 3, lastResult: null, currentImage: null, isGeneratingImage: false, pendingRecording: null },
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

/**
 * Recursively sanitizes data from Firestore to prevent circular reference errors.
 * It converts Firestore Timestamps to ISO strings and ensures all objects and arrays are plain.
 * @param {*} data The data to sanitize.
 * @returns A sanitized, plain JavaScript object or primitive.
 */
function sanitizeFirestoreData(data) {
  if (data === null || data === undefined) {
    return data;
  }
  // Handle Firestore Timestamps
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFirestoreData(item));
  }
  // Handle plain objects, avoiding class instances
  if (typeof data === 'object' && data.constructor === Object) {
    const sanitized = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // FIX: The recursive call was incorrect. It should pass the property's value, not the parent object.
        sanitized[key] = sanitizeFirestoreData(data[key]);
      }
    }
    return sanitized;
  }
  // Handle primitives and other types
  return data;
}


const useStore = create(
  immer((set, get) => ({
    ...initialSessionState,
    
    // ACTIONS
    
    // Sets user auth data and view
    setUser: (firebaseUser) => set(state => {
      state.user = firebaseUser;
      state.view = 'dashboard';
    }),

    // Clears all session data and starts a new guest session.
    // This is the default state for new visitors and logged-out users.
    startGuestSession: () => set(state => {
        const guestUser = {
            uid: `guest_${Date.now()}`,
            displayName: 'Guest',
            isAnonymous: true,
        };
        // Reset everything to initial, then set user and view for guest mode
        Object.assign(state, {
            ...initialSessionState,
            user: guestUser,
            view: 'dashboard',
            isAuthenticating: false,
            showOnboarding: false, // Don't show for guests
        });
    }),

    // Updates the session state with data from Firestore
    updateProgressFromSnapshot: (rawData) => set(state => {
      if (!rawData) return;
      
      // Sanitize the raw data from Firestore to remove any complex objects
      // or circular references that can occur with offline cache data.
      const sanitizedData = sanitizeFirestoreData(rawData);

      // Now, update the state using ONLY the sanitizedData object, providing defaults.
      state.progress = sanitizedData.progress || {};
      state.achievements = sanitizedData.achievements || [];
      state.pronunciationRaceHighScore = sanitizedData.pronunciationRaceHighScore || 0;
      state.listeningDrillHighScore = sanitizedData.listeningDrillHighScore || 0;
      state.vocabularyBuilderHighScore = sanitizedData.vocabularyBuilderHighScore || 0;
      state.dailyStreak = sanitizedData.dailyStreak || { count: 0, lastUpdated: null };
      
      if (state.user && sanitizedData.user) {
        state.user.xp = sanitizedData.user.xp || 0;
        state.user.level = sanitizedData.user.level || 1;
      }
    }),

  }))
);

export default useStore;