/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState } from 'react';
import { startPracticeLesson, goToDashboard } from '../lib/actions';
import { levels } from '../lib/prompts';

export default function PracticeSelection() {
  const [levelId, setLevelId] = useState('');
  const [lessonIndex, setLessonIndex] = useState('');
  
  const availableLessons = levelId ? levels[levelId].lessons : [];

  const handleStart = () => {
    if (levelId && lessonIndex !== '') {
      startPracticeLesson(levelId, parseInt(lessonIndex, 10));
    }
  };

  return (
    <div className="practice-selection-container">
      <button className="button back-to-dashboard" onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>
      <div className="practice-selection-card">
        <h2><span className="icon">fitness_center</span> Practice Mode</h2>
        <p>Choose any lesson from the expedition map to practice. Your scores and progress won't be saved.</p>
        <div className="practice-form">
          <select value={levelId} onChange={e => { setLevelId(e.target.value); setLessonIndex(''); }}>
            <option value="" disabled>-- Select a Level --</option>
            {Object.entries(levels).map(([id, data]) => (
              <option key={id} value={id}>{data.name}</option>
            ))}
          </select>
          <select value={lessonIndex} onChange={e => setLessonIndex(e.target.value)} disabled={!levelId}>
            <option value="" disabled>-- Select a Lesson --</option>
            {availableLessons.map((lesson, index) => (
              <option key={index} value={index}>{lesson.title}</option>
            ))}
          </select>
          <button className="button primary" onClick={handleStart} disabled={!levelId || lessonIndex === ''}>
            Start Practice Session
          </button>
        </div>
      </div>
    </div>
  );
}