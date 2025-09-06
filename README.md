# Echo Expedition II: Fluent Frontiers

An application for English language learners of all levels to improve their listening comprehension, pronunciation, and spoken fluency through AI-powered exercises. This project is built with React, Vite, Zustand, and the Google Gemini API.

## Features

-   **Interactive Lessons:** Practice speaking with AI-powered feedback on pronunciation and content.
-   **Expedition Map:** Progress through levels from Beginner (A1) to Proficient (C2).
-   **Gamified Modes:** Test your skills in the "Pronunciation Race" and "Echo Drill".
-   **Free-Form Conversation:** Have an open-ended chat with the AI on any topic.
-   **Offline Support:** Standard lessons are available offline, with progress synced when you reconnect.
-   **Custom Lesson Generation:** Create your own lessons on any topic you want to practice.
-   **Voice Commands:** Navigate and control the app with your voice.

## Prerequisites

-   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
-   `npm` or a compatible package manager
-   A [Google Gemini API Key](https://ai.google.dev/)
-   A Google Cloud Project with an OAuth 2.0 Client ID

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
    -   Add your Gemini API key and your Google Client ID to this file:
        ```
        VITE_API_KEY="YOUR_GEMINI_API_KEY"
        VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
        ```
    -   Replace `YOUR_GEMINI_API_KEY` with your actual key.
    -   To get a Google Client ID, follow the instructions [here](https://developers.google.com/identity/gsi/web/guides/get-google-api-client-id). Make sure to add your development origin (e.g., `http://localhost:5173`) to the "Authorized JavaScript origins".

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