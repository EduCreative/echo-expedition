/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from '../lib/store';
import { levels } from '../lib/prompts';
import ExpeditionLevel from './ExpeditionLevel';

const SCORE_UNLOCK_THRESHOLD = 70; // Average score required to unlock the next level

export default function ExpeditionMap({ justCompleted }) {
  const { progress } = useStore();
  const levelEntries = Object.entries(levels);

  return (
    <div className="expedition-map">
      <div className="expedition-path">
        {levelEntries.map(([levelId, levelData], index) => {
          let isUnlocked = false;
          let prevLevelAverageScore = 0;
          let prevLevelCompletedCount = 0;
          let prevLevelName = '';

          if (index === 0) {
            isUnlocked = true;
          } else {
            const prevLevelId = levelEntries[index - 1][0];
            const prevLevelData = levelEntries[index - 1][1];
            prevLevelName = prevLevelData.name;
            const prevLevelProgress = progress[prevLevelId] || {};
            const completedLessonsScores = Object.values(prevLevelProgress);
            prevLevelCompletedCount = completedLessonsScores.length;

            if (prevLevelCompletedCount > 0) {
              const sumOfScores = completedLessonsScores.reduce((sum, score) => sum + score, 0);
              prevLevelAverageScore = sumOfScores / prevLevelCompletedCount;
              isUnlocked = prevLevelAverageScore >= SCORE_UNLOCK_THRESHOLD;
            } else {
              // Level remains locked if no lessons in the previous level are complete.
              isUnlocked = false;
            }
          }

          return (
            <ExpeditionLevel
              key={levelId}
              levelId={levelId}
              levelData={levelData}
              progress={progress[levelId] || {}}
              isUnlocked={isUnlocked}
              isEven={index % 2 === 0}
              unlockThreshold={SCORE_UNLOCK_THRESHOLD}
              prevLevelAverageScore={prevLevelAverageScore}
              prevLevelCompletedCount={prevLevelCompletedCount}
              prevLevelName={prevLevelName}
              justCompleted={justCompleted}
            />
          );
        })}
      </div>
    </div>
  );
}