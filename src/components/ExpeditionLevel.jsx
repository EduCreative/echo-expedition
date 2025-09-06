

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { startLesson } from '../lib/actions';
import useStore from '../lib/store';
import c from 'clsx';

// A single lesson icon on the map
function LessonNode({
  levelId,
  lesson,
  lessonIndex,
  isCompleted,
  isUnlocked,
}) {
  const { isProcessing, isOnline } = useStore();
  const isInteractive = lesson.type === 'roleplay' || lesson.type === 'boss_battle';
  const isDisabled = isProcessing || !isUnlocked || (isInteractive && !isOnline);
  const isBoss = lesson.type === 'boss_battle';

  let title;
  if (isDisabled && isInteractive && !isOnline) {
      title = "This lesson requires an internet connection.";
  } else if (isUnlocked) {
    title = `${lesson.title} (${lesson.difficulty})${isCompleted ? ' - Completed' : ''}`;
  } else {
    title = 'Locked';
  }

  return (
    <button
      className={c('lesson-node', lesson.difficulty?.toLowerCase(), { completed: isCompleted, 'boss-battle': isBoss })}
      onClick={() => startLesson(levelId, lessonIndex)}
      disabled={isDisabled}
      title={title}
      aria-label={`Start lesson: ${lesson.title}`}
    >
      <span className="icon">{isCompleted ? 'check' : lesson.icon}</span>
    </button>
  );
}

// A level "zone" on the map
export default function ExpeditionLevel({
  levelId,
  levelData,
  progress,
  isUnlocked,
  isEven,
  unlockThreshold,
  prevLevelAverageScore,
  prevLevelCompletedCount,
  prevLevelName,
}) {
  const completedCount = Object.keys(progress).length;
  const totalCount = levelData.lessons.length;
  const isLevelComplete = completedCount === totalCount && totalCount > 0;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  let lockedTitle = '';
  if (!isUnlocked && prevLevelName) {
    if (prevLevelCompletedCount > 0) {
      lockedTitle = `Average score of ${unlockThreshold}+ required in '${prevLevelName}'. Your current average: ${Math.round(prevLevelAverageScore)}.`;
    } else {
      lockedTitle = `Complete lessons in '${prevLevelName}' to unlock. An average score of ${unlockThreshold}+ is required.`;
    }
  }

  return (
    <div className={c('expedition-level', { locked: !isUnlocked, even: isEven, odd: !isEven })}>
      <div
        className={c('level-node', { completed: isLevelComplete })}
        title={lockedTitle}
      >
        <span className="level-emoji">{levelData.emoji}</span>
        <div className="level-info">
          <h3 className="level-title">{levelData.name}</h3>
          
          {isUnlocked ? (
            <>
              <span className="level-status">
                {isLevelComplete ? '🎉 Level Complete!' : `${completedCount} / ${totalCount} Lessons`}
              </span>
              {totalCount > 0 && (
                <div className="level-progress-bar" title={`${Math.round(progressPercentage)}% Complete`}>
                  <div className="level-progress-bar-inner" style={{ width: `${progressPercentage}%` }}></div>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="level-status with-icon">
                <span className="icon">lock</span>
                {prevLevelName
                  ? `Avg. score ${unlockThreshold}+ in '${prevLevelName}'`
                  : 'Locked'}
              </span>
              {prevLevelCompletedCount > 0 && (
                <span className="level-unlock-progress">
                  Current Average: {Math.round(prevLevelAverageScore)} / {unlockThreshold}
                </span>
              )}
            </>
          )}

        </div>
      </div>
      {isUnlocked && (
        <div className="lesson-path">
          {levelData.lessons.map((lesson, index) => (
              <LessonNode
                key={index}
                levelId={levelId}
                lesson={lesson}
                lessonIndex={index}
                isCompleted={progress[index] !== undefined}
                isUnlocked={isUnlocked}
              />
          ))}
        </div>
      )}
    </div>
  );
}