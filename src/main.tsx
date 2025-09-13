// Fix: Manually define Vite's `import.meta.env` type because the `vite/client`
// type reference was failing, likely due to a project configuration issue. This
// ensures the code type-checks correctly.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly PROD: boolean;
    };
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {createRoot} from 'react-dom/client';
import './main.css';
import './lib/fonts.css'; // Import local fonts
import App from './components/App';

// --- Service Worker Registration ---
// Registering the service worker here in the main entry point is more robust.
// It ensures the registration logic runs as early as possible, independent of React's component lifecycle.
// We only register the service worker in production mode to avoid conflicts with Vite's HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // We use the 'load' event to ensure the page is fully loaded, preventing contention for resources.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(err => {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}


createRoot(document.getElementById('root')).render(<App />);