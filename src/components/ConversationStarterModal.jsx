/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { conversationScenarios } from '../lib/prompts';
import { startConversation } from '../lib/actions';

export default function ConversationStarterModal({ onClose }) {
  const handleSelectScenario = (scenario) => {
    startConversation(scenario);
    // The view will change automatically, unmounting the dashboard and this modal
  };

  return (
    <div className="conversation-starter-overlay" onClick={onClose}>
      <div className="conversation-starter-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><span className="icon">checklist</span> Choose a Scenario</h3>
          <button className="icon-button close-button" onClick={onClose} aria-label="Close">
            <span className="icon">close</span>
          </button>
        </div>
        <p>Select a topic to guide your conversation or start with an open chat.</p>
        <ul className="scenario-list">
          {conversationScenarios.map(scenario => (
            <li key={scenario.id}>
              <button className="scenario-item" onClick={() => handleSelectScenario(scenario)}>
                <span className="icon scenario-icon">{scenario.icon}</span>
                <div className="scenario-content">
                  <span className="scenario-title">{scenario.title}</span>
                  <span className="scenario-description">{scenario.description}</span>
                </div>
                <span className="icon arrow">chevron_right</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}