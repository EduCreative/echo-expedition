/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect } from 'react';
import useStore from '../lib/store';
import c from 'clsx';
import { achievements } from '../lib/achievements';

export default function AchievementsWidget() {
  const { achievements: unlockedAchievements, justUnlockedAchievements } = useStore();

  // Effect to clear the highlight animation after a few seconds
  useEffect(() => {
    if (justUnlockedAchievements.length > 0) {
        const timer = setTimeout(() => {
            useStore.setState({ justUnlockedAchievements: [] });
        }, 5000); // Highlight for 5 seconds

        return () => clearTimeout(timer);
    }
  }, [justUnlockedAchievements]);

  return (
    <div className="achievements-widget">
       <h3><span className="icon">military_tech</span>Achievements</h3>
       <div className="achievements-grid">
        {achievements.map(ach => {
          const isUnlocked = unlockedAchievements.includes(ach.id);
          const isNewlyUnlocked = justUnlockedAchievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={c('achievement-badge', { 
                  unlocked: isUnlocked,
                  'highlight-newly-unlocked': isNewlyUnlocked,
                })}
              title={`${ach.name}\n${ach.description}`}
            >
              <span className="icon">{ach.icon}</span>
            </div>
          );
        })}
       </div>
    </div>
  );
}