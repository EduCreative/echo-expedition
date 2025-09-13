/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useMemo, useEffect, useRef } from 'react';
import useStore from '../lib/store';
import { startCustomLesson, startPronunciationRace, startListeningDrill, startConversation, goToLeaderboard, startPracticeMode } from '../lib/actions';
import ExpeditionMap from './ExpeditionMap';
import InstallPrompt from './InstallPrompt';
import Onboarding from './Onboarding';
import c from 'clsx';
import { achievements } from '../lib/achievements';
import ConversationStarterModal from './ConversationStarterModal';

const XP_PER_LEVEL = 500;

function PronunciationRaceWidget() {
    const { isProcessing, isOnline, pronunciationRaceHighScore, isAiEnabled } = useStore();
    return (
        <div className="pronunciation-race-widget">
            <div className="widget-header">
                <h3><span className="icon">timer</span> Pronunciation Race</h3>
                <p>Test your accuracy and speed. How long can your streak last?</p>
            </div>
            <div className="widget-score">
                High Score: <strong>🏆 {pronunciationRaceHighScore}</strong>
            </div>
            <button
              className="button primary"
              onClick={startPronunciationRace}
              disabled={isProcessing || !isOnline || !isAiEnabled}
              title={!isAiEnabled ? 'AI features are disabled' : ''}
            >
                Start Race!
            </button>
        </div>
    );
}

function ListeningDrillWidget() {
    const { isProcessing, listeningDrillHighScore } = useStore();
    return (
        <div className="listening-drill-widget">
            <div className="widget-header">
                <h3><span className="icon">hearing</span> Echo Drill</h3>
                <p>Listen carefully and type what you hear. Train your ear!</p>
            </div>
            <div className="widget-score">
                High Score: <strong>🎯 {listeningDrillHighScore}</strong>
            </div>
            <button
              className="button primary"
              onClick={startListeningDrill}
              disabled={isProcessing}
            >
                Start Drill
            </button>
        </div>
    );
}

function PracticeModeWidget() {
    const { isProcessing } = useStore();
    return (
        <div className="practice-mode-widget">
            <div className="widget-header">
                <h3><span className="icon">fitness_center</span> Practice Sandbox</h3>
                <p>Revisit any lesson without pressure. Your scores won't be saved.</p>
            </div>
            <p className="widget-score">Perfect for focused skill-building.</p>
            <button
              className="button primary"
              onClick={startPracticeMode}
              disabled={isProcessing}
            >
                Start Practice
            </button>
        </div>
    );
}

function FreeFormConversationWidget() {
    const { isProcessing, isOnline, isAiEnabled } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="free-form-widget">
                <div className="widget-header">
                    <h3><span className="icon">forum</span> Chat & Learn</h3>
                    <p>Have a guided or open conversation with the AI on any topic.</p>
                </div>
                <p className="widget-score">Practice freely without scores.</p>
                <button
                className="button primary"
                onClick={() => setIsModalOpen(true)}
                disabled={isProcessing || !isOnline || !isAiEnabled}
                title={!isAiEnabled ? 'AI features are disabled' : ''}
                >
                    Choose a Scenario
                </button>
            </div>
            {isModalOpen && <ConversationStarterModal onClose={() => setIsModalOpen(false)} />}
        </>
    );
}

function LeaderboardWidget() {
    return (
        <div className="leaderboard-widget">
            <div className="widget-header">
                <h3><span className="icon">leaderboard</span> Compete & Climb</h3>
                <p>Check the leaderboards to see how you rank against others.</p>
            </div>
            <button
              className="button primary"
              onClick={goToLeaderboard}
            >
                View Leaderboards
            </button>
        </div>
    );
}

function CustomLessonCreator() {
  const [topic, setTopic] = useState('');
  const { isProcessing, isOnline, isAiEnabled } = useStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim() && !isProcessing && isOnline && isAiEnabled) {
      startCustomLesson(topic.trim());
    }
  };

  return (
    <div className="custom-lesson-creator">
      <div className="widget-header">
        <h3><span className="icon">edit</span> Practice Any Topic</h3>
        <p>Enter a topic, scenario, or phrase you want to practice.</p>
      </div>
      <form onSubmit={handleSubmit} className="custom-lesson-form">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={!isAiEnabled ? 'Enable AI features to generate lessons' : (isOnline ? "e.g., Ordering coffee..." : "Internet connection required")}
          disabled={isProcessing || !isOnline || !isAiEnabled}
          aria-label="Custom lesson topic"
        />
        <button type="submit" className="button primary" disabled={!topic.trim() || isProcessing || !isOnline || !isAiEnabled}>
          <span className="icon">auto_awesome</span> Generate
        </button>
      </form>
    </div>
  );
}

function UserProfileSummary({ user }) {
  if (!user) return null;
  const xpForNextLevel = user.level * XP_PER_LEVEL;
  const xpPercentage = (user.xp / xpForNextLevel) * 100;

  return (
    <div className="user-profile-summary">
      <div className="level-badge">LVL {user.level}</div>
      <div className="xp-details">
        <div className="xp-bar">
          <div className="xp-bar-inner" style={{ width: `${xpPercentage}%` }}></div>
        </div>
        <div className="xp-text">{user.xp} / {xpForNextLevel} XP</div>
      </div>
    </div>
  );
}

function AchievementsWidget() {
  const { achievements: unlockedAchievements, justUnlockedAchievements } = useStore();

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

export default function Dashboard() {
  const { user, isProcessing, progress, dailyStreak, showOnboarding, justCompleted, justUnlockedAchievements } = useStore();

  // Effect to clear highlight animations after a few seconds
  useEffect(() => {
    if (justCompleted || justUnlockedAchievements.length > 0) {
        const timer = setTimeout(() => {
            useStore.setState({ justCompleted: null, justUnlockedAchievements: [] });
        }, 5000); // Highlight for 5 seconds

        return () => clearTimeout(timer);
    }
  }, [justCompleted, justUnlockedAchievements]);

  const { totalLessonsCompleted, totalXpEarned } = useMemo(() => {
    if (!user) return { totalLessonsCompleted: 0, totalXpEarned: 0 };
    const lessonsCompleted = Object.values(progress).reduce(
      (acc, levelProgress) => acc + Object.keys(levelProgress).length,
      0
    );

    const xpFromLevels = (user.level - 1) * XP_PER_LEVEL;
    const totalXp = xpFromLevels + user.xp;

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
      
      <AchievementsWidget />
      <ExpeditionMap justCompleted={justCompleted} />
      
      <div className="additional-tools">
        <h3 className="additional-tools-header">Additional Tools for Fluency</h3>
        <div className="dashboard-widgets">
          <PronunciationRaceWidget />
          <ListeningDrillWidget />
          <PracticeModeWidget />
          <FreeFormConversationWidget />
          <LeaderboardWidget />
        </div>
        <CustomLessonCreator />
      </div>
      <InstallPrompt />
    </div>
  );
}