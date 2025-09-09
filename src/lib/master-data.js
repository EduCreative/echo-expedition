/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { mockUsers } from './mock-users';

// Helper to create an initial progress object for a user
const createInitialProgress = (user) => ({
  progress: {}, // { [levelId]: { [lessonId]: score } }
  dailyStreak: { count: 0, lastUpdated: null },
  achievements: [],
  pronunciationRaceHighScore: user.pronunciationRaceHighScore || 0,
  listeningDrillHighScore: user.listeningDrillHighScore || 0,
  user: { xp: 0, level: 1 },
});

const initialProgressData = {};
mockUsers.forEach(user => {
  if (user.email) {
      initialProgressData[user.email] = createInitialProgress(user);
  }
});

// This object acts as the initial, master source of truth for the application.
// In a real app, this would be fetched from a server on startup.
// By initializing the Zustand store from this, we ensure a consistent state
// for the entire user session, simulating a central database.
export const masterData = {
  users: mockUsers,
  progress: initialProgressData,
};
