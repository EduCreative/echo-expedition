/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from '../lib/store';
import { goToDashboard } from '../lib/actions';
import ExerciseCard from './ExerciseCard';
import c from 'clsx';

export default function ExerciseView() {
  const { error, currentLesson } = useStore();

  const isLastPrompt = currentLesson?.prompts &&
    currentLesson.currentPromptIndex === currentLesson.prompts.length - 1;

  const lastPromptIsDone = isLastPrompt &&
    currentLesson.prompts[currentLesson.currentPromptIndex].feedback;
  
  const isInteractiveLesson = ['roleplay', 'boss_battle'].includes(currentLesson?.lessonType);
  const interactiveLessonIsDone = isInteractiveLesson && currentLesson?.prompt?.feedback;

  const shouldBlinkBack = lastPromptIsDone || interactiveLessonIsDone;

  return (
    <div className="exercise-view">
      <button className={c("button back-to-dashboard", { 'blink-guide': shouldBlinkBack })} onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>
      {error && <p className="error-message">{error}</p>}
      <ExerciseCard />
    </div>
  );
}