/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useMemo, useEffect } from 'react';
import useStore from '../lib/store';
import { goToDashboard, addToast } from '../lib/actions';
import c from 'clsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function fetchLeaderboardData() {
    const usersCollection = collection(db, 'users');
    const progressCollection = collection(db, 'progress');

    const [usersSnapshot, progressSnapshot] = await Promise.all([
        getDocs(usersCollection),
        getDocs(progressCollection)
    ]);

    const usersData = {};
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        // SAFE: Only extract primitive data to avoid circular references
        usersData[doc.id] = { name: data.name };
    });

    const progressData = {};
    progressSnapshot.forEach(doc => {
        const data = doc.data();
        // SAFE: Only extract primitive data
        progressData[doc.id] = {
            pronunciationRaceHighScore: data.pronunciationRaceHighScore,
            listeningDrillHighScore: data.listeningDrillHighScore,
        };
    });

    // Now, when combining, we are working with clean, safe objects.
    const combinedData = Object.keys(usersData).map(uid => {
        const user = usersData[uid] || {};
        const progress = progressData[uid] || {};
        return {
            id: uid,
            name: user.name || 'Anonymous',
            pronunciationRaceHighScore: progress.pronunciationRaceHighScore || 0,
            listeningDrillHighScore: progress.listeningDrillHighScore || 0,
        };
    });

    return combinedData;
}


export default function Leaderboard() {
  const [activeBoard, setActiveBoard] = useState('race'); // 'race' or 'drill'
  const { user: currentUser, isOnline } = useStore();
  const [allUsersData, setAllUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
        if (!isOnline) {
            addToast({ title: 'Offline', message: 'Leaderboard cannot be loaded while offline.', icon: 'wifi_off' });
            setIsLoading(false);
            setAllUsersData([]); // Clear stale data
            return;
        }
        setIsLoading(true);
        try {
            const data = await fetchLeaderboardData();
            setAllUsersData(data);
        } catch (error) {
            console.error("Failed to fetch leaderboard data:", error);
            addToast({ title: 'Error', message: 'Could not load leaderboard.', icon: 'error' });
            setAllUsersData([]);
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [isOnline]);

  const sortedUsers = useMemo(() => {
    const scoreKey = activeBoard === 'race' ? 'pronunciationRaceHighScore' : 'listeningDrillHighScore';
    return [...allUsersData]
      .filter(u => u[scoreKey] > 0)
      .sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0));
  }, [allUsersData, activeBoard]);

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
        
        {isLoading ? (
            <div className="loader"><span className="icon">hourglass_top</span> Loading Leaderboard...</div>
        ) : (
            <div className="leaderboard-list">
            <div className="leaderboard-row header">
                <span className="rank">#</span>
                <span className="name">Player</span>
                <span className="score">Score</span>
            </div>
            {sortedUsers.map((user, index) => {
                const isCurrentUser = user.id === currentUser.uid;
                const score = activeBoard === 'race' ? user.pronunciationRaceHighScore : user.listeningDrillHighScore;
                
                return (
                <div key={user.id} className={c('leaderboard-row', { 'current-user': isCurrentUser })}>
                    <span className="rank">{index + 1}</span>
                    <span className="name">
                    {user.name}
                    {isCurrentUser && <span className="you-badge">You</span>}
                    </span>
                    <span className="score">{score || 0}</span>
                </div>
                );
            })}
            </div>
        )}
      </div>
    </div>
  );
}