# Echo Expedition II: Fluent Frontiers

An application for English language learners of all levels to improve their listening comprehension, pronunciation, and spoken fluency through AI-powered exercises. This project is built with React, Vite, Zustand, Firebase, and the Google Gemini API.

## Features

-   **Firebase Integration:** Full backend support with Firebase Authentication for users and Cloud Firestore for real-time, cross-device data synchronization.
-   **Interactive Lessons:** Practice speaking with AI-powered feedback on pronunciation and content.
-   **Expedition Map:** Progress through levels from Beginner (A1) to Proficient (C2).
-   **Gamified Modes:** Test your skills in the "Pronunciation Race" and "Echo Drill".
-   **Free-Form Conversation:** Have an open-ended chat with the AI on any topic.
-   **Offline Support:** Standard lessons and progress are available offline, with changes automatically synced upon reconnection via Firestore.
-   **Custom Lesson Generation:** Create your own lessons on any topic you want to practice.
-   **Voice Commands:** Navigate and control the app with your voice.
-   **Brand Assets:** A standalone `logo.svg` file is available at the project root for branding and promotional use.

## Prerequisites

-   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
-   `npm` or a compatible package manager
-   A [Google Gemini API Key](https://ai.google.dev/)
-   A [Firebase Project](https://firebase.google.com/docs/web/setup) with Authentication (Google & Anonymous providers enabled) and Firestore enabled.

## Project Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment variables:**
    -   Create a new file named `.env` in the root of the project.
    -   Add your Gemini API key to this file:
        ```
        VITE_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    -   Replace `YOUR_GEMINI_API_KEY` with your actual key.

4.  **Configure Firebase:**
    -   Navigate to `src/lib/` and create a new file named `firebase.js`.
    -   Go to your Firebase project's settings and find your web app's configuration object.
    -   Paste the following code into `src/lib/firebase.js`, replacing the placeholder values with your actual Firebase config:
    ```javascript
    import { initializeApp } from 'firebase/app';
    import { getAuth, GoogleAuthProvider } from 'firebase/auth';
    import { getFirestore } from 'firebase/firestore';

    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };

    const app = initializeApp(firebaseConfig);
    export const auth = getAuth(app);
    export const db = getFirestore(app);
    export const googleProvider = new GoogleAuthProvider();
    ```

## Running the Application

Once the setup is complete, you can run the development server:

```bash
npm run dev
```

This will start the Vite development server, and you can view the application by navigating to `http://localhost:5173` (or the URL provided in your terminal) in your web browser.

## Available Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Serves the production build locally for previewing.