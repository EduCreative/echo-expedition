/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from '../lib/store';
import { signInWithGoogle, signInAnonymouslyAction } from '../lib/actions';
import Logo from './Logo';

export default function Login() {
  const isProcessing = useStore(state => state.isProcessing);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1><Logo /> Echo Expedition</h1>
        <p>Your AI-powered journey to fluent English starts here.</p>
        <div className="login-buttons">
            <button className="button google" onClick={signInWithGoogle} disabled={isProcessing}>
              <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google logo" style={{ width: '20px', height: '20px', marginRight: '8px' }}/>
               Sign in with Google
            </button>
          <button className="button" onClick={signInAnonymouslyAction} disabled={isProcessing}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}