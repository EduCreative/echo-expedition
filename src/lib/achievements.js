
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { levels } from './prompts';

const STREAK_THRESHOLD = 70; // Min score for a lesson to count towards achievements

// Helper to count completed lessons
const countCompletedLessons = (progress) => {
  return Object.values(progress).reduce((acc, level) => acc + Object.keys(level).length, 0);
};

// Helper to check for a perfect score
const hasPerfectScore = (progress) => {
  return Object.values(progress).some(level => Object.values(level).some(score => score === 100));
};

// Helper to count completed levels
const countCompletedLevels = (progress) => {
  return Object.entries(levels).reduce((count, [levelId, levelData]) => {
    const levelProgress = progress[levelId] || {};
    if (Object.keys(levelProgress).length === levelData.lessons.length) {
      return count + 1;
    }
    return count;
  }, 0);
};

export const achievements = [
  {
    id: 'first_step',
    name: 'First Step',
    description: 'Complete your first lesson.',
    icon: 'footprint',
    check: (state) => countCompletedLessons(state.progress) >= 1,
  },
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Complete 5 lessons.',
    icon: 'school',
    check: (state) => countCompletedLessons(state.progress) >= 5,
  },
  {
    id: 'journeyman',
    name: 'Journeyman',
    description: 'Complete 10 lessons.',
    icon: 'local_library',
    check: (state) => countCompletedLessons(state.progress) >= 10,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Complete 25 lessons.',
    icon: 'map',
    check: (state) => countCompletedLessons(state.progress) >= 25,
  },
  {
    id: 'level_clear_a1',
    name: 'Beginner Graduate',
    description: 'Complete all lessons in the Beginner (A1) level.',
    icon: 'workspace_premium',
    check: (state) => {
      const levelProgress = state.progress.a1 || {};
      return Object.keys(levelProgress).length === levels.a1.lessons.length;
    },
  },
  {
    id: 'perfect_score',
    name: 'Perfectionist',
    description: 'Achieve a perfect score of 100 on any lesson.',
    icon: 'star',
    check: (state) => hasPerfectScore(state.progress),
  },
  {
    id: 'streak_3_days',
    name: 'On a Roll',
    description: 'Maintain a 3-day practice streak.',
    icon: 'filter_3',
    check: (state) => state.dailyStreak.count >= 3,
  },
  {
    id: 'streak_7_days',
    name: 'Week-Long Warrior',
    description: 'Maintain a 7-day practice streak.',
    icon: 'filter_7',
    check: (state) => state.dailyStreak.count >= 7,
  },
  {
    id: 'boss_slayer',
    name: 'Challenge Conqueror',
    description: 'Complete your first Final Challenge lesson.',
    icon: 'sports_kabaddi',
    check: (state) => {
        return Object.entries(levels).some(([levelId, levelData]) => {
            const bossLessonIndex = levelData.lessons.findIndex(l => l.type === 'boss_battle');
            if (bossLessonIndex === -1) return false;
            const levelProgress = state.progress[levelId] || {};
            return levelProgress[bossLessonIndex] !== undefined;
        });
    }
  },
  {
    id: 'custom_creator',
    name: 'Creative Mind',
    description: 'Generate your first custom lesson.',
    icon: 'edit',
    check: (state) => state.currentLesson?.levelId === 'custom',
  }
];