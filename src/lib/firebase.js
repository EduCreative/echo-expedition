/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Replace this with your own Firebase project's configuration.
// You can find this in the Firebase Console:
// Go to Project Settings > General tab > Your apps > Web app > Firebase SDK snippet > Config
//
// *** CRITICAL STEP FOR AUTHENTICATION ***
// You MUST authorize the domain you are developing on (e.g., 'localhost')
// in the Firebase Console.
// Go to: Authentication > Settings > Authorized domains > Add domain
// Failure to do this will result in "auth/unauthorized-domain" errors.
const firebaseConfig = {
  apiKey: "AIzaSyBTTRyCxHOgrN6SSFMN9yzOeOf379gtspk",
  authDomain: "echo-expedition.firebaseapp.com",
  projectId: "echo-expedition",
  storageBucket: "echo-expedition.appspot.com",
  messagingSenderId: "782862941084",
  appId: "1:782862941084:web:f82a7a5c633f4d858f2659",
  measurementId: "G-FDKY8PNWX1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence enabled. This allows the app
// to work offline by caching data locally in IndexedDB. The SDK automatically
// handles multi-tab synchronization and falls back to in-memory cache if needed.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
});

// Get Firebase services and export them
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();