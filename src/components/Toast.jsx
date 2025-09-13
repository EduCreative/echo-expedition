/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState } from 'react';

export default function Toast({ title, message, icon, duration }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const toastDuration = duration || 5000;
    // Start exit animation 500ms before removal from the store
    const timer = setTimeout(() => {
      setExiting(true);
    }, toastDuration - 500);

    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="toast" style={{ animation: exiting ? 'slideOutRight 0.5s ease-in forwards' : 'slideInRight 0.5s ease-out forwards' }}>
      {icon && <span className="icon toast-icon">{icon}</span>}
      <div className="toast-content">
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    </div>
  );
}
