/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useState, useEffect, useRef} from 'react';
import c from 'clsx';
import useStore from '../lib/store';
import { logout, setSpeechSetting, addToast, goToAdminPanel, toggleVoiceCommands, promptToInstall } from '../lib/actions';
import Logo from './Logo';
import AboutModal from './AboutModal';

function VoiceCommandHelpModal({ onClose }) {
  return (
    <div className="voice-command-modal-overlay" onClick={onClose}>
      <div className="voice-command-modal" onClick={e => e.stopPropagation()}>
        <h3><span className="icon">mic</span> Voice Commands</h3>
        <ul className="command-list">
          <li>
            <strong>"Go to dashboard"</strong>
            <p>Navigates back to the main dashboard from any screen.</p>
          </li>
          <li>
            <strong>"Start pronunciation race"</strong>
            <p>Starts a new session of the Pronunciation Race game.</p>
          </li>
          <li>
            <strong>"Next prompt" / "Previous prompt"</strong>
            <p>Navigates between prompts within a standard lesson.</p>
          </li>
          <li>
            <strong>"Repeat that" / "Listen again"</strong>
            <p>Plays the audio for the current lesson prompt again.</p>
          </li>
          <li>
            <strong>"Toggle dark mode" / "Toggle theme"</strong>
            <p>Switches between light and dark themes.</p>
          </li>
        </ul>
        <button className="button" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function DropdownToggleItem({ id, icon, label, checked, onChange }) {
  return (
    <li className="dropdown-item-toggle" onClick={onChange}>
      <label htmlFor={id} className="dropdown-item-label">
        <span className="icon">{icon}</span> {label}
      </label>
      <label className="switch small">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={() => {}} // The parent onClick handles the change
          readOnly
        />
        <span className="slider round"></span>
      </label>
    </li>
  );
}

function DropdownSelectItem({ icon, label, value, onChange, children }) {
  return (
    <li className="dropdown-item-select">
      <label className="dropdown-item-label">
        <span className="icon">{icon}</span> {label}
      </label>
      <select value={value} onChange={onChange}>
        {children}
      </select>
    </li>
  );
}

function DropdownSliderItem({ icon, label, value, onChange, min, max, step }) {
    return (
        <li className="dropdown-item-slider">
            <label className="dropdown-item-label">
                <span className="icon">{icon}</span> {label} ({value.toFixed(1)}x)
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={onChange}
            />
        </li>
    );
}

export default function Header({ isDark, toggleTheme }) {
  const { user, speechSettings, installPromptEvent, voiceCommandState } = useStore();
  const [showProfile, setShowProfile] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [voices, setVoices] = useState([]);
  const profileRef = useRef(null);
  
  const isAdmin = user?.email === 'kmasroor50@gmail.com';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    const populateVoiceList = () => {
      if(typeof speechSynthesis === 'undefined') {
        return;
      }
      const availableVoices = speechSynthesis.getVoices();
      const englishVoices = availableVoices.filter(voice => voice.lang.startsWith('en'));
      setVoices(englishVoices);
    };

    populateVoiceList();
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateVoiceList;
    }
    
    return () => {
      if (typeof speechSynthesis !== 'undefined') {
          speechSynthesis.onvoiceschanged = null;
      }
    }
  }, []);

  const handleShareClick = async () => {
    const shareData = {
      title: 'Echo Expedition: Fluent Frontiers',
      text: 'Check out this AI-powered app for learning English!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing app:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        addToast({ title: 'Link Copied', message: 'App URL copied to your clipboard.', icon: 'link' });
      } catch (err) {
        console.error('Failed to copy link: ', err);
        addToast({ title: 'Error', message: 'Could not copy URL to clipboard.', icon: 'error' });
      }
    }
  };

  return (
    <>
      <header>
        <h1><Logo />Echo Expedition</h1>
        <div className="header-controls">
          <button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">
            <span className="icon">{isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>
          
          <button className="icon-button" onClick={handleShareClick} aria-label="Share app" title="Share App">
            <span className="icon">share</span>
          </button>

          {user && (
            <div className="user-profile" ref={profileRef}>
              <button className="user-profile-button" onClick={() => setShowProfile(p => !p)}>
                {user.avatar ? (
                  <img src={user.avatar} alt="User avatar" className="avatar" />
                ) : (
                  <div className="avatar"><span className="icon">person</span></div>
                )}
                <span className="name">{user.name}</span>
                <span className="icon">arrow_drop_down</span>
              </button>
              <div className={c('profile-dropdown', { active: showProfile })}>
                <ul>
                   <div className="divider"></div>
                   <li className="dropdown-header">Speech Settings</li>
                   {voices.length > 0 && (
                     <DropdownSelectItem
                        icon="record_voice_over"
                        label="Voice"
                        value={speechSettings.voice || ''}
                        onChange={(e) => setSpeechSetting('voice', e.target.value)}
                     >
                       <option value="">Default Voice</option>
                       {voices.map((voice) => (
                         <option key={voice.voiceURI} value={voice.voiceURI}>
                           {voice.name} ({voice.lang})
                         </option>
                       ))}
                     </DropdownSelectItem>
                   )}
                   <DropdownSliderItem
                      icon="speed"
                      label="Speed"
                      value={speechSettings.rate}
                      onChange={(e) => setSpeechSetting('rate', parseFloat(e.target.value))}
                      min="0.5" max="2" step="0.1"
                   />
                   <DropdownToggleItem
                    id="autoplay-toggle"
                    icon="autoplay"
                    label="Auto-play Prompts"
                    checked={speechSettings.autoPlayPrompts}
                    onChange={() => setSpeechSetting('autoPlayPrompts', !speechSettings.autoPlayPrompts)}
                  />

                  <div className="divider"></div>
                  <li className="dropdown-header">App Controls</li>
                  <DropdownToggleItem
                    id="voice-command-toggle"
                    icon="mic"
                    label="Voice Commands"
                    checked={voiceCommandState.isListening}
                    onChange={toggleVoiceCommands}
                  />
                  <li>
                    <button onClick={() => { setShowVoiceHelp(true); setShowProfile(false); }}>
                      <span className="icon">help_outline</span> Voice Command Help
                    </button>
                  </li>
                   <li>
                    <button onClick={() => { setShowAbout(true); setShowProfile(false); }}>
                        <span className="icon">info</span> About App
                    </button>
                  </li>
                  {installPromptEvent && (
                    <li>
                      <button onClick={() => { promptToInstall(); setShowProfile(false); }}>
                        <span className="icon">install_desktop</span> Install App
                      </button>
                    </li>
                  )}
                  
                  {isAdmin && <div className="divider"></div>}
                  {isAdmin && (
                    <li>
                      <button onClick={() => { goToAdminPanel(); setShowProfile(false); }}>
                        <span className="icon">admin_panel_settings</span> Admin Panel
                      </button>
                    </li>
                  )}
                  <div className="divider"></div>
                  <li>
                    <button className="logout" onClick={logout}>
                      <span className="icon">logout</span> Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </header>
      {showVoiceHelp && <VoiceCommandHelpModal onClose={() => setShowVoiceHelp(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}