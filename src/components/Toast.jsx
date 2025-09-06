
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState } from 'react';

export default function Toast({ title, message, icon }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, 4500); // Start exit animation before removal

    return () => clearTimeout(timer);
  }, []);

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

// Add animation keyframes to main.css if they don't exist
const keyframes = `
@keyframes slideInRight {
  from { transform: translateX(110%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(110%); opacity: 0; }
}
`;

// A simple way to inject CSS, assuming it's not already in main.css
// In a real app, this would be part of the CSS build process.
if (!document.getElementById('toast-animations')) {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.id = "toast-animations";
  styleSheet.innerText = keyframes;
  document.head.appendChild(styleSheet);
}
