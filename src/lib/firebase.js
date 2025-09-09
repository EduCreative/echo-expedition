/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Replace this with your own Firebase project's configuration.
// You can find this in the Firebase Console:
// Go to Project Settings > General tab > Your apps > Web app > Firebase SDK snippet > Config
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

// Get Firebase services and export them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence for Firestore.
// This allows the app to work seamlessly offline by caching data locally.
// It will automatically sync changes when the connection is restored.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open. Persistence can only be enabled in one.
      console.warn('Firestore persistence failed: multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support the required features.
      console.warn('Firestore persistence not available in this browser.');
    }
  });