/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect } from 'react';

export default function GraffitiCongrats({ text, onClose }) {
  useEffect(() => {
    // The total duration of the animation is 2.5s.
    // We'll close the modal slightly after to ensure the fade-out completes.
    const timer = setTimeout(() => {
      onClose();
    }, 2600);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="graffiti-overlay">
      <h1 className="graffiti-text">{text}</h1>
    </div>
  );
}