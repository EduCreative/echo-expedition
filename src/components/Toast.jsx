/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState } from 'react';
import useStore from '../lib/store';

export default function Toast({ id, title, message, icon, duration, action }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // If there's an action, don't auto-dismiss with a timer,
    // unless a specific duration is provided.
    if (action && !duration) return;

    const toastDuration = duration || 5000;
    // Start exit animation 500ms before removal from the store
    const timer = setTimeout(() => {
      setExiting(true);
    }, toastDuration - 500);

    return () => clearTimeout(timer);
  }, [duration, action]);

  const dismissToast = () => {
    setExiting(true);
    // Allow animation to play before removing from store
    setTimeout(() => {
      useStore.setState(state => {
        state.toasts = state.toasts.filter(t => t.id !== id);
      });
    }, 500);
  };

  const handleActionClick = () => {
    if (action?.onClick) {
      action.onClick();
    }
    dismissToast();
  };

  return (
    <div className="toast" style={{ animation: exiting ? 'slideOutRight 0.5s ease-in forwards' : 'slideInRight 0.5s ease-out forwards' }}>
      <div className="toast-main-content">
        {icon && <span className="icon toast-icon">{icon}</span>}
        <div className="toast-content">
          <h4>{title}</h4>
          <p>{message}</p>
        </div>
      </div>
      {action && (
        <button className="toast-action-button" onClick={handleActionClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
