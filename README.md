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
    -   Add your Gemini API key to this file. **Note:** The variable name must start with `VITE_` for Vite to expose it to the application.
        ```
        VITE_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    -   Replace `YOUR_GEMINI_API_KEY` with your actual key.
    -   The application code will access this key via `process.env.API_KEY` (this mapping is handled in `vite.config.js`).

4.  **Configure Firebase:**
    -   Navigate to `src/lib/` and open the file named `firebase.js`.
    -   Go to your Firebase project's settings and find your web app's configuration object.
    -   Replace the placeholder values in `src/lib/firebase.js` with your actual Firebase config.

5.  **Authorize Domains for Authentication (CRITICAL):**
    -   **This step is mandatory for Google Sign-In to work.** If this is not configured, signing in with Google will fail silently and leave you as a "Guest" user.
    -   In your Firebase Console, navigate to **Authentication** -> **Settings** tab -> **Authorized domains**.
    -   Click **Add domain** and enter `localhost` for local development.
    -   If your development server uses a different address (e.g., `127.0.0.1`), add that as well.
    -   **For deployment, you must add your production domains.** These typically include `your-project-id.web.app` and `your-project-id.firebaseapp.com`.

## Running the Application

Once the setup is complete, you can run the development server:

```bash
npm run dev
```

This will start the Vite development server, and you can view the application by navigating to `http://localhost:5173` (or the URL provided in your terminal) in your web browser.

## Troubleshooting

### "Sign in with Google" returns to the app as a Guest

-   **Symptom:** You click "Continue with Google," select your account, and the app reloads, but you are still logged in as a "Guest" instead of with your Google account. You may not see any errors in the console.
-   **Cause:** This is a classic sign that your development domain (e.g., `localhost`) or your production domain has not been authorized in your Firebase project's authentication settings.
-   **Solution:** Follow step 5 in the **Project Setup** section above.
    -   For **local development**, ensure `localhost` is in your list of authorized domains in the Firebase Console.
    -   For your **deployed site**, you must add your Firebase Hosting domains. For a project with the ID `echo-expedition`, you would add `echo-expedition.web.app` and `echo-expedition.firebaseapp.com`.

## Available Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Serves the production build locally for previewing.

---

## Deployment & Hosting Setup

The application is configured to deploy directly to Firebase Hosting under the project ID `echo-expedition` (e.g. `https://echo-expedition.web.app/login`).

### 1. Automatic GitHub Deployment Configurations
Provide the following environment variables (defined in your GitHub Secrets or environment) when executing your workflow builds:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

If not set, the client SDK will fall back to default template configurations safely.

### 2. Manual Firebase CLI Deploy
Run:
```bash
# Connect to your active Firebase project
firebase use echo-expedition

# Production build and deploy hosting
npm run build
firebase deploy --only hosting
```

## Responsive Layout & Theme Harmony

- **Responsive Adaptivity**: The application UI is built using mobile-first Tailwind utility grids, fluid layouts and flexible margins, scaling optimally across smartphones, tablets, laptops, and ultra-wide desktops.
- **Light & Dark Theme Styling**: Consistent contrast supports both classic light modes and midnight themes with clear typography, responsive chart components, and readable body texts.

## Full-Stack Server & Secure AI Proxy

To resolve the browser API key required error, the application features an integrated node server-side proxy (`/server.ts`):
- **Full-stack Express Backend**: Integrates Vite Dev Middleware inside a single unified container workspace, ensuring immediate reload times in development and production builds.
- **Proxy Endpoints**: Routes all client-side calls through secure `/api/gemini/generateContent` and `/api/gemini/generateImages` endpoints.
- **Enhanced Security**: Keeps all third-party and Gemini API keys hidden from client-side bundles and browser inspector panels. Highly responsive error fallbacks are automatically returned to frontend states on connection timeouts.

