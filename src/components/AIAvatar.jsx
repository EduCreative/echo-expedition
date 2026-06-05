/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import c from 'clsx';

/**
 * A reusable avatar component for AI characters in chat interfaces.
 * @param {{ icon: string, className?: string }} props
 */
export default function AIAvatar({ icon, className }) {
  return (
    <div className={c('ai-avatar', className)}>
      <span className="icon">{icon || 'auto_awesome'}</span>
    </div>
  );
}