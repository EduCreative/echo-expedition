
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useMemo } from 'react';
import useStore from '../lib/store';
import { goToDashboard } from '../lib/actions';
import c from 'clsx';

export default function Leaderboard() {
  const [activeBoard, setActiveBoard] = useState('race'); // 'race' or 'drill'
  const { allUsers, user: currentUser } = useStore();

  const sortedUsers = useMemo(() => {
    const scoreKey = activeBoard === 'race' ? 'pronunciationRaceHighScore' : 'listeningDrillHighScore';
    return [...allUsers]
      .filter(u => u[scoreKey] !== undefined)
      .sort((a, b) => b[scoreKey] - a[scoreKey]);
  }, [allUsers, activeBoard]);

  return (
    <div className="leaderboard-view">
      <button className="button back-to-dashboard" onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>

      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h2><span className="icon">leaderboard</span>Leaderboards</h2>
          <div className="leaderboard-tabs">
            <button
              className={c('button', { active: activeBoard === 'race' })}
              onClick={() => setActiveBoard('race')}
            >
              <span className="icon">timer</span> Pronunciation Race
            </button>
            <button
              className={c('button', { active: activeBoard === 'drill' })}
              onClick={() => setActiveBoard('drill')}
            >
              <span className="icon">hearing</span> Echo Drill
            </button>
          </div>
        </div>
        
        <div className="leaderboard-list">
          <div className="leaderboard-row header">
            <span className="rank">#</span>
            <span className="name">Player</span>
            <span className="score">Score</span>
          </div>
          {sortedUsers.map((user, index) => {
            const isCurrentUser = user.name === currentUser.name;
            const score = activeBoard === 'race' ? user.pronunciationRaceHighScore : user.listeningDrillHighScore;
            
            return (
              <div key={user.id} className={c('leaderboard-row', { 'current-user': isCurrentUser })}>
                <span className="rank">{index + 1}</span>
                <span className="name">
                  {user.name}
                  {isCurrentUser && <span className="you-badge">You</span>}
                </span>
                <span className="score">{score}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}