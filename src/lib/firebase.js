/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- FIREBASE CONFIGURATION ---
// IMPORTANT: Replace this with your own Firebase project's configuration.
// You can find this in the Firebase Console:
// Go to Project Settings > General tab > Your apps > Web app > Firebase SDK snippet > Config

// ====================================================================================
// !!! CRITICAL DEPLOYMENT STEP FOR GOOGLE SIGN-IN !!!
//
// For Google Sign-In ("signInWithRedirect") to work on your deployed Firebase Hosting site,
// you MUST authorize your production domains in the Firebase Console.
//
// TO FIX THIS:
// 1. Go to your Firebase Console.
// 2. Navigate to "Authentication" -> "Settings" tab -> "Authorized domains".
// 3. Click "Add domain" and add the following domains:
//    - your-project-id.web.app
//    - your-project-id.firebaseapp.com
//    (Replace "your-project-id" with your actual Firebase Project ID).
//
// Failure to do this will result in Google Sign-In failing silently after deployment,
// often returning the user to the app as a "Guest". This also applies to localhost
// for local development.
// ====================================================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBTTRyCxHOgrN6SSFMN9yzOeOf379gtspk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "echo-expedition.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "echo-expedition",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "echo-expedition.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "782862941084",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:782862941084:web:f82a7a5c633f4d858f2659",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FDKY8PNWX1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence. This is a best-effort attempt.
// It might fail if another tab has persistence enabled, but the app will continue to work online.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Firestore persistence could not be enabled. Another tab might be open.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all of the features required for Firestore persistence.');
    }
  });


// Get Firebase services and export them
export const auth = getAuth(app);
export const storage = getStorage(app);
