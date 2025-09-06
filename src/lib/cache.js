
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const CACHE_PREFIX = 'echo-expedition-custom-lesson-';
const CACHE_VERSION = 'v1';

// This cache is now ONLY for user-generated custom lessons.
// Standard expedition lessons are bundled with the app in course-data.js.

const getCacheKey = (topic) => {
  // Sanitize topic for use as a key
  const sanitizedTopic = String(topic).replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 50);
  return `${CACHE_PREFIX}${CACHE_VERSION}-${sanitizedTopic}`;
};

export const getCachedCustomLesson = (topic) => {
  const key = getCacheKey(topic);
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;
    
    const parsed = JSON.parse(cachedItem);
    // Basic validation
    if (parsed && parsed.lessonId === topic && parsed.levelId === 'custom') {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error reading from custom lesson cache:', error);
    localStorage.removeItem(key); // Clear corrupted item
    return null;
  }
};

export const setCachedCustomLesson = (topic, lessonData) => {
  const key = getCacheKey(topic);
  try {
    const dataToCache = {
      ...lessonData,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(dataToCache));
  } catch (error) {
    console.error('Error writing to custom lesson cache:', error);
    if (error.name === 'QuotaExceededError') {
      console.warn('Cache storage limit reached. Clearing old custom lessons might be necessary.');
    }
  }
};
