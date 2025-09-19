/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState } from 'react';
import useStore from '../lib/store';
import { startCustomLesson, startPronunciationRace, startListeningDrill, goToLeaderboard, startPracticeMode } from '../lib/actions';
import ConversationStarterModal from './ConversationStarterModal';

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

export default function AdditionalTools() {
    return (
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
    );
}