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
// We only register the service worker in production mode to avoid conflicts with Vite's HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // We use the 'load' event to ensure the page is fully loaded, preventing contention for resources.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      // This logic handles PWA updates.
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed. We dispatch an event
              // to notify the app and prompt the user to refresh.
              console.log('New content is available and waiting to be installed.');
              window.dispatchEvent(new CustomEvent('new-sw-installed'));
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');
            }
          }
        };
      };
    }).catch(err => {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}


createRoot(document.getElementById('root')).render(<App />);
