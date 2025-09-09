/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {createRoot} from 'react-dom/client';
import './main.css';
import App from './components/App';

// --- Service Worker Registration ---
// Registering the service worker here in the main entry point is more robust.
// It ensures the registration logic runs as early as possible, independent of React's component lifecycle.
if ('serviceWorker' in navigator) {
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
