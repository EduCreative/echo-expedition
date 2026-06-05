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

## Experimental Deployment & Hosting Guide

Since this app is full-stack (it has a frontend web interface and a secure AI database proxy to protect your API keys), pure static hosting is not enough on its own. Here is how you can easily deploy it for experimental purposes to **Vercel** and **Firebase**.

---

### Option A: Deploying to Vercel (Easiest & Free)

Vercel is the easiest option for experimental full-stack projects because it sets up both your React frontend and your serverless backend endpoints automatically!

#### Step 1: Push your code to GitHub
Make sure all your latest code (including the brand new `api` folder and `vercel.json` file) is pushed to your GitHub repository.

#### Step 2: Import your repository to Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New** -> **Project**.
2. Connect your GitHub account and select your repository.

#### Step 3: Configure Environment Variables
Before clicking "Deploy", expand the **Environment Variables** section and add:
- `GEMINI_API_KEY`: Paste your Google Gemini API Key here.

#### Step 4: Deploy!
- Click **Deploy**. Vercel will build your static files and deploy the `/api/*` folder as a Serverless function automatically.

---

### Option B: Deploying to Firebase (Complete Full-Stack)

To host a full-stack site on Firebase, we use **Firebase Hosting** for the fast static React page, and **Firebase Cloud Functions** to run our secure AI endpoints.

#### Step 1: Install Firebase CLI
If you don't have it already, open your terminal and install the Firebase command line tools:
```bash
npm install -g firebase-tools
```

#### Step 2: Build your React App
Run the production build script locally to generate your static files:
```bash
npm run build
```

#### Step 3: Set up Cloud Functions Secrets
We need to give your Cloud Function access to your Gemini API Key. Run this command in your terminal:
```bash
firebase functions:secrets:set GEMINI_API_KEY="your_actual_gemini_api_key"
```

#### Step 4: Deploy both Hosting and Functions
Now, trigger the deployment for the entire full-stack configuration:
```bash
firebase deploy
```
This single command will upload your static React user interface to Firebase Hosting and host your server proxy code under Cloud Functions under the same custom link safely!

---

## Responsive Layout & Theme Harmony

- **Responsive Adaptivity**: The application UI is built using mobile-first Tailwind utility grids, fluid layouts, and flexible margins, scaling optimally across smartphones, tablets, laptops, and ultra-wide desktops.
- **Light & Dark Theme Styling**: Consistent contrast supports both classic light modes and midnight themes with clear typography, responsive chart components, and readable body texts.

## Full-Stack Server & Secure AI Proxy

To resolve the browser API key required error, the application features an integrated server-side proxy (`/server.ts`):
- **Full-stack Express Backend**: Integrates Vite Dev Middleware inside a single unified container workspace, ensuring immediate reload times in development and production builds.
- **Proxy Endpoints**: Routes all client-side calls through secure `/api/gemini/generateContent` and `/api/gemini/generateImages` endpoints.
- **Enhanced Security**: Keeps all third-party and Gemini API keys hidden from client-side bundles and browser inspector panels. Highly responsive error fallbacks are automatically returned to frontend states on connection timeouts.

