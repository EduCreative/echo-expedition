/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Helper function to generate a random date in the past
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};
const now = new Date();
const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

export const mockUsers = [
  {
    id: 1,
    name: 'Masroor Khan',
    email: 'kmasroor50@gmail.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: new Date().toISOString(),
    lessonsCompleted: 42,
    status: 'active',
    pronunciationRaceHighScore: 35,
    listeningDrillHighScore: 28,
  },
  {
    id: 2,
    name: 'Ben Carter',
    email: 'ben.carter@example.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: randomDate(oneYearAgo, now),
    lessonsCompleted: 15,
    status: 'active',
    pronunciationRaceHighScore: 52,
    listeningDrillHighScore: 41,
  },
  {
    id: 3,
    name: 'Chen Wei',
    email: 'chen.wei@example.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: randomDate(oneYearAgo, now),
    lessonsCompleted: 5,
    status: 'suspended',
    pronunciationRaceHighScore: 18,
    listeningDrillHighScore: 15,
  },
  {
    id: 4,
    name: 'Sofia Rossi',
    email: 'sofia.rossi@example.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: randomDate(oneYearAgo, now),
    lessonsCompleted: 88,
    status: 'active',
    pronunciationRaceHighScore: 78,
    listeningDrillHighScore: 65,
  },
  {
    id: 5,
    name: 'David Miller',
    email: 'david.miller@example.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: randomDate(oneYearAgo, now),
    lessonsCompleted: 0,
    status: 'active',
    pronunciationRaceHighScore: 8,
    listeningDrillHighScore: 5,
  },
   {
    id: 6,
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@example.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: randomDate(oneYearAgo, now),
    lessonsCompleted: 23,
    status: 'active',
    pronunciationRaceHighScore: 45,
    listeningDrillHighScore: 50,
  },
  {
    id: 7,
    name: 'Liam O\'Connell',
    email: 'liam.oconnell@example.com',
    registrationDate: randomDate(oneYearAgo, now),
    lastLogin: randomDate(oneYearAgo, now),
    lessonsCompleted: 7,
    status: 'active',
    pronunciationRaceHighScore: 29,
    listeningDrillHighScore: 33,
  },
  {
    id: 0,
    name: 'Guest',
    email: 'guest@example.com',
    registrationDate: null,
    lastLogin: new Date().toISOString(),
    lessonsCompleted: 0,
    status: 'active',
    pronunciationRaceHighScore: 0,
    listeningDrillHighScore: 0,
  }
];