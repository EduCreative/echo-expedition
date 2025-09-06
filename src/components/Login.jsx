/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
import useStore from '../lib/store';
import { handleGoogleLogin, continueAsGuest } from '../lib/actions';

/* global google */

export default function Login() {
  const isProcessing = useStore(state => state.isProcessing);
  const googleButtonRef = useRef(null);
  const isGoogleClientConfigured = !!process.env.GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isGoogleClientConfigured) {
      console.warn("Google Sign-In is disabled because the Google Client ID is not configured.");
      return;
    }

    let gsiCheckInterval;

    const initializeGsi = () => {
      // Ensure the google object and the DOM element are ready
      if (typeof google === 'undefined' || !googleButtonRef.current) {
        return; 
      }

      // Stop polling once we have what we need
      clearInterval(gsiCheckInterval);

      google.accounts.id.initialize({
        client_id: process.env.GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
      });

      google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', shape: 'pill', width: '260' }
      );
    };
    
    // If the GSI script is already loaded, initialize immediately.
    // Otherwise, poll until it's available.
    if (typeof google !== 'undefined') {
        initializeGsi();
    } else {
        gsiCheckInterval = setInterval(initializeGsi, 100);
    }
    
    return () => {
      if (gsiCheckInterval) clearInterval(gsiCheckInterval);
    };
  }, [isGoogleClientConfigured]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Echo Expedition 🚀</h1>
        <p>Your AI-powered journey to fluent English starts here.</p>
        <div className="login-buttons">
          {isGoogleClientConfigured ? (
            <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }}></div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '12px', background: 'var(--warning-light)', borderRadius: '8px', border: '1px solid var(--warning)' }}>
              Google Sign-In is not configured.
              <br />
              Please use Guest Mode.
            </div>
          )}
          <button className="button" onClick={continueAsGuest} disabled={isProcessing}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}