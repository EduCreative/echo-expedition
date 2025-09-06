/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import Logo from './Logo';

export default function AboutModal({ onClose }) {
  return (
    <div className="about-modal-overlay" onClick={onClose}>
      <div className="about-modal" onClick={e => e.stopPropagation()}>
        <button className="icon-button about-modal-close-button" onClick={onClose} aria-label="Close">
            <span className="icon">close</span>
        </button>
        <h2><Logo /> About Echo Expedition</h2>
        <p>
          This is an application for English language learners of all levels to improve their listening comprehension, pronunciation, and spoken fluency through AI-powered exercises. Progress through the expedition map, test your skills in game modes, or have free-form conversations with the AI tutor.
        </p>
        <div className="contact-section">
            <h3>Contact & Support</h3>
            <ul className="contact-list">
                <li>
                    <a href="https://wa.me/923331306603" target="_blank" rel="noopener noreferrer">
                        <span className="icon">sms</span>
                        <span>Chat on WhatsApp</span>
                    </a>
                </li>
                <li>
                    <a href="mailto:kmasroor50@gmail.com">
                        <span className="icon">email</span>
                        <span>kmasroor50@gmail.com</span>
                    </a>
                </li>
            </ul>
        </div>
      </div>
    </div>
  );
}