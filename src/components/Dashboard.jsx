/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useMemo, useEffect, lazy, Suspense } from 'react';
import useStore from '../lib/store';
import InstallPrompt from './InstallPrompt';
import Onboarding from './Onboarding';

const LazyAdditionalTools = lazy(() => import('./AdditionalTools'));
const LazyAchievementsWidget = lazy(() => import('./AchievementsWidget'));
const LazyExpeditionMap = lazy(() => import('./ExpeditionMap'));

const XP_PER_LEVEL = 500;

function Loader({ text }) {
  return (
    <div className="suspense-loader-container">
      <div className="loader">
        <span className="icon">hourglass_top</span> {text}
      </div>
    </div>
  );
}

function UserProfileSummary({ user }) {
  if (!user) return null;
  
  // FIX: Use default values to prevent NaN if user.level or user.xp are not yet loaded.
  const currentLevel = user.level || 1;
  const currentXp = user.xp || 0;

  const xpForNextLevel = currentLevel * XP_PER_LEVEL;
  const xpPercentage = (currentXp / xpForNextLevel) * 100;

  return (
    <div className="user-profile-summary">
      <div className="level-badge">LVL {currentLevel}</div>
      <div className="xp-details">
        <div className="xp-bar">
          <div className="xp-bar-inner" style={{ width: `${xpPercentage}%` }}></div>
        </div>
        <div className="xp-text">{currentXp} / {xpForNextLevel} XP</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isProcessing, progress, dailyStreak, showOnboarding, justCompleted } = useStore();

  // Effect to clear the lesson completion highlight after a few seconds
  useEffect(() => {
    if (justCompleted) {
        const timer = setTimeout(() => {
            useStore.setState({ justCompleted: null });
        }, 5000); // Highlight for 5 seconds

        return () => clearTimeout(timer);
    }
  }, [justCompleted]);

  const { totalLessonsCompleted, totalXpEarned } = useMemo(() => {
    if (!user) return { totalLessonsCompleted: 0, totalXpEarned: 0 };
    
    const lessonsCompleted = Object.values(progress).reduce(
      (acc, levelProgress) => acc + Object.keys(levelProgress).length,
      0
    );

    // FIX: Use default values for level and XP to prevent NaN calculations.
    const xpFromLevels = ((user.level || 1) - 1) * XP_PER_LEVEL;
    const totalXp = xpFromLevels + (user.xp || 0);

    return { totalLessonsCompleted: lessonsCompleted, totalXpEarned: totalXp };
  }, [progress, user]);

  if (isProcessing && !useStore.getState().isSyncing) {
    return (
      <div className="loader">
        <span className="icon">hourglass_top</span> Loading...
      </div>
    );
  }

  return (
    <div className="dashboard">
      {showOnboarding && <Onboarding />}
      <div className="dashboard-header">
        <h2>Welcome back, {user?.displayName || 'Explorer'}!</h2>
        <p>Embark on your expedition to fluency. Complete lessons to unlock new levels.</p>
        <UserProfileSummary user={user} />
      </div>

      <div className="dashboard-stats">
        <div className="stat-item streak">
          <span className="icon stat-icon">local_fire_department</span>
          <span className="stat-value">{dailyStreak.count} Day</span>
          <span className="stat-label">Daily Streak</span>
        </div>
        <div className="stat-item">
          <span className="icon stat-icon">library_books</span>
          <span className="stat-value">{totalLessonsCompleted}</span>
          <span className="stat-label">Lessons Completed</span>
        </div>
        <div className="stat-item">
          <span className="icon stat-icon">star</span>
          <span className="stat-value">{totalXpEarned.toLocaleString()}</span>
          <span className="stat-label">Total XP Earned</span>
        </div>
      </div>
      
      <Suspense fallback={<Loader text="Loading Achievements..." />}>
        <LazyAchievementsWidget />
      </Suspense>

      <Suspense fallback={<Loader text="Loading Expedition Map..." />}>
        <LazyExpeditionMap justCompleted={justCompleted} />
      </Suspense>
      
      <Suspense fallback={<Loader text="Loading Tools..." />}>
        <LazyAdditionalTools />
      </Suspense>

      <InstallPrompt />
    </div>
  );
}