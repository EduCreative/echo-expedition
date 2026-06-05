/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect } from 'react';
import useStore from '../lib/store';
import { signInWithEmail, signUpWithEmail, sendPasswordResetEmail, continueAsGuest } from '../lib/actions';
import Logo from './Logo';

export default function Login() {
  const { isProcessing, error } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    // Clear any previous global errors when the component mounts
    useStore.setState({ error: null });
  }, []);

  useEffect(() => {
    // Clear form-specific errors and global errors when toggling between sign-in/sign-up
    setFormErrors({});
    useStore.setState({ error: null });
  }, [isSignUp]);

  const validateForm = () => {
    const newErrors = {};
    if (isSignUp) {
      if (!name.trim()) newErrors.name = 'Full name is required.';
    }

    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

    if (isSignUp) {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password.';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      if (isSignUp) {
        signUpWithEmail(name, email, password, rememberMe);
      } else {
        signInWithEmail(email, password, rememberMe);
      }
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setFormErrors({ email: 'Please enter your email address to reset your password.' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setFormErrors({ email: 'Please enter a valid email address.' });
      return;
    }
    setFormErrors({});
    sendPasswordResetEmail(email);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1><Logo /> Echo Expedition</h1>
        <p>{isSignUp ? 'Create an account to save your progress.' : 'Sign in to continue your expedition.'}</p>
        
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {isSignUp && (
            <div className="form-group">
              <input type="text" id="name" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required aria-invalid={!!formErrors.name} aria-describedby="name-error" />
              {formErrors.name && <p id="name-error" className="form-error">{formErrors.name}</p>}
            </div>
          )}
          <div className="form-group">
            <input type="email" id="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={!!formErrors.email} aria-describedby="email-error" />
            {formErrors.email && <p id="email-error" className="form-error">{formErrors.email}</p>}
          </div>
          <div className="form-group">
            <input type={showPassword ? 'text' : 'password'} id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={!!formErrors.password} aria-describedby="password-error" />
            <button type="button" className="icon-button password-toggle" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
              <span className="icon">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
            {formErrors.password && <p id="password-error" className="form-error">{formErrors.password}</p>}
          </div>
          {isSignUp && (
            <div className="form-group">
              <input type="password" id="confirmPassword" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required aria-invalid={!!formErrors.confirmPassword} aria-describedby="confirm-password-error" />
              {formErrors.confirmPassword && <p id="confirm-password-error" className="form-error">{formErrors.confirmPassword}</p>}
            </div>
          )}
          {!isSignUp && (
            <div className="form-options">
              <div className="remember-me-container">
                <input type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <label htmlFor="remember-me">Remember me</label>
              </div>
              <button type="button" className="forgot-password-link" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>
          )}
          <button type="submit" className="button primary" disabled={isProcessing}>
            {isProcessing ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="login-separator">OR</div>

        <div className="login-buttons">
           <button className="button" onClick={continueAsGuest}>
            <span className="icon">person_off</span>
            Continue as Guest
          </button>
        </div>
        
        <button type="button" className="form-toggle-link" onClick={() => setIsSignUp(p => !p)}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
        
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}