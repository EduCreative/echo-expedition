
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Type } from '@google/genai';

// The lesson content is now stored in `course-data.js`.
// This file now only defines the structure and metadata of the expedition map.
export const levels = {
  a1: {
    name: 'Beginner (A1)',
    emoji: '👋',
    lessons: [
      { title: 'Greetings', icon: 'waving_hand', difficulty: 'Easy', type: 'sentence' },
      { title: 'Family', icon: 'family_restroom', difficulty: 'Easy', type: 'sentence' },
      { title: 'Food', icon: 'restaurant', difficulty: 'Easy', type: 'sentence' },
      { title: 'Colors', icon: 'palette', difficulty: 'Easy', type: 'sentence' },
      { title: 'Animals', icon: 'pets', difficulty: 'Easy', type: 'sentence' },
      { title: 'Numbers & Time', icon: 'schedule', difficulty: 'Easy', type: 'sentence' },
      { title: 'Clothing', icon: 'checkroom', difficulty: 'Easy', type: 'sentence' },
      { title: 'At School', icon: 'school', difficulty: 'Easy', type: 'sentence' },
      { title: 'A1 Final Challenge', icon: 'flag', type: 'boss_battle', difficulty: 'Medium' },
    ],
  },
  a2: {
    name: 'Elementary (A2)',
    emoji: '🚶',
    lessons: [
      { title: 'Daily Routine', icon: 'schedule', difficulty: 'Easy', type: 'sentence' },
      { title: 'The Weather', icon: 'partly_cloudy_day', difficulty: 'Easy', type: 'sentence' },
      { title: 'Directions', icon: 'signpost', difficulty: 'Easy', type: 'sentence' },
      { title: 'Hobbies', icon: 'sports_esports', difficulty: 'Easy', type: 'sentence' },
      { title: 'Past Events', icon: 'event_repeat', difficulty: 'Medium', type: 'sentence' },
      { title: 'Shopping', icon: 'shopping_cart', difficulty: 'Medium', type: 'sentence' },
      { title: 'Travel', icon: 'luggage', difficulty: 'Medium', type: 'sentence' },
      { title: 'Feelings', icon: 'sentiment_satisfied', difficulty: 'Medium', type: 'sentence' },
      { title: 'A2 Final Challenge', icon: 'flag', type: 'boss_battle', difficulty: 'Hard' },
    ],
  },
  b1: {
    name: 'Intermediate (B1)',
    emoji: '👍',
    lessons: [
      { title: 'Experiences', icon: 'flight_takeoff', difficulty: 'Easy', type: 'sentence' },
      { title: 'Future Plans', icon: 'edit_calendar', difficulty: 'Easy', type: 'sentence' },
      { title: 'Role Play: Cafe', icon: 'local_cafe', type: 'roleplay', difficulty: 'Medium' },
      { title: 'Describe a Situation', icon: 'image', type: 'situational_prompt', difficulty: 'Medium' },
      { title: 'Phrasal Verbs', icon: 'dynamic_form', difficulty: 'Medium', type: 'sentence' },
      { title: 'Giving Opinions', icon: 'reviews', difficulty: 'Medium', type: 'sentence' },
      { title: 'Word Scramble', icon: 'shuffle', type: 'word_scramble', difficulty: 'Medium' },
      { title: 'Making Suggestions', icon: 'lightbulb_outline', difficulty: 'Medium', type: 'sentence' },
      { title: 'B1 Final Challenge', icon: 'flag', type: 'boss_battle', difficulty: 'Medium' },
    ],
  },
  b2: {
    name: 'Upper-Intermediate (B2)',
    emoji: '🏃',
    lessons: [
      { title: 'Work & Careers', icon: 'work', difficulty: 'Medium', type: 'sentence' },
      { title: 'Role Play: Hotel', icon: 'hotel', type: 'roleplay', difficulty: 'Medium' },
      { title: 'Hypotheticals', icon: 'psychology_alt', difficulty: 'Hard', type: 'sentence' },
      { title: 'Describe a Memory', icon: 'art_track', type: 'situational_prompt', difficulty: 'Hard' },
      { title: 'Reported Speech', icon: 'chat_bubble', difficulty: 'Medium', type: 'sentence' },
      { title: 'Advantages/Disadvantages', icon: 'balance', difficulty: 'Hard', type: 'sentence' },
      { title: 'Word Scramble', icon: 'shuffle', type: 'word_scramble', difficulty: 'Hard' },
      { title: 'Common Idioms', icon: 'theater_comedy', difficulty: 'Medium', type: 'sentence' },
      { title: 'B2 Final Challenge', icon: 'flag', type: 'boss_battle', difficulty: 'Hard' },
    ],
  },
  c1: {
    name: 'Advanced (C1)',
    emoji: '🚀',
    lessons: [
      { title: 'Society & Culture', icon: 'groups', difficulty: 'Hard', type: 'sentence' },
      { title: 'The Environment', icon: 'forest', difficulty: 'Hard', type: 'sentence' },
      { title: 'Abstract Concepts', icon: 'lightbulb', difficulty: 'Hard', type: 'sentence' },
      { title: 'Problem & Solution', icon: 'checklist', difficulty: 'Hard', type: 'sentence' },
      { title: 'Idiomatic Language', icon: 'format_quote', difficulty: 'Hard', type: 'sentence' },
      { title: 'Technology & AI', icon: 'smart_toy', difficulty: 'Hard', type: 'sentence' },
      { title: 'Media & News', icon: 'newspaper', difficulty: 'Hard', type: 'sentence' },
      { title: 'Formal vs. Informal', icon: 'compare_arrows', difficulty: 'Hard', type: 'sentence' },
    ],
  },
  c2: {
    name: 'Proficient (C2)',
    emoji: '🏆',
    lessons: [
      { title: 'Global Issues', icon: 'public', difficulty: 'Hard', type: 'sentence' },
      { title: 'Ethics & Morality', icon: 'gavel', difficulty: 'Hard', type: 'sentence' },
      { title: 'Linguistic Nuance', icon: 'spellcheck', difficulty: 'Hard', type: 'sentence' },
      { title: 'Persuasive Argument', icon: 'campaign', difficulty: 'Hard', type: 'sentence' },
      { title: 'Literature & Arts', icon: 'menu_book', difficulty: 'Hard', type: 'sentence' },
      { title: 'Economics & Finance', icon: 'monitoring', difficulty: 'Hard', type: 'sentence' },
      { title: 'Politics & Governance', icon: 'account_balance', difficulty: 'Hard', 'type': 'sentence' },
      { title: 'Philosophy', icon: 'psychology', difficulty: 'Hard', 'type': 'sentence' },
    ],
  }
};

export const getPronunciationRacePrompt = (targetWord, userTranscript) => {
  const prompt = `
An English learner was asked to pronounce the word: "${targetWord}".
They responded with the attached audio, which was transcribed as: "${userTranscript}".

Analyze their pronunciation of the target word from the audio.
1. **Pronunciation Score:** Provide a numerical score from 0 to 100 for pronunciation, based SOLELY on the audio. Evaluate clarity, accuracy compared to a standard native speaker's pronunciation of "${targetWord}".
2. **Feedback Tip:** Provide a single, very short, actionable tip for improvement if needed (max 5 words), otherwise return an empty string. Example: "Pronounce the 'r' sound." or "Stress the second syllable."

Return ONLY a JSON object with two keys: "pronunciationScore" (an integer) and "feedbackTip" (a string).`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      pronunciationScore: {
        type: Type.INTEGER,
        description: "A numerical score from 0 to 100 for pronunciation accuracy of the target word."
      },
      feedbackTip: {
        type: Type.STRING,
        description: "A very short, actionable tip for improvement, or an empty string."
      }
    },
    required: ["pronunciationScore", "feedbackTip"],
  };

  return { prompt, schema };
};

export const getFeedbackPrompt = (lessonType, context, userTranscript) => {
  let promptIntro;

  switch (lessonType) {
    case 'roleplay':
    case 'boss_battle':
      promptIntro = `In a role-play scenario described as "${context.scenario}", the AI said: "${context.lastAiMessage}". The user responded with the attached audio, which was transcribed as: "${userTranscript}".`;
      break;
    case 'situational_prompt':
      promptIntro = `An English learner was asked to respond to the prompt: "${context.promptText}". They responded with the attached audio, which was transcribed as: "${userTranscript}".`;
      break;
    case 'word_scramble':
      promptIntro = `An English learner was shown a sentence with a scrambled word: "${context.scrambledText}". The correct sentence is: "${context.correctText}". They responded with the attached audio, which was transcribed as: "${userTranscript}".`;
      break;
    case 'sentence':
    default:
      const isQuestion = ['c1', 'c2'].includes(context.levelId);
      promptIntro = isQuestion
        ? `An English learner was asked to respond to the question: "${context.promptText}". They responded with the attached audio, which was transcribed as: "${userTranscript}".`
        : `An English learner was asked to say: "${context.promptText}". They responded with the attached audio, which was transcribed as: "${userTranscript}".`;
      break;
  }

  const commonInstruction = `
Analyze their response based on both the text transcript and the provided audio recording.
1.  **Feedback:** Provide concise, helpful, and encouraging feedback in 2-4 sentences, addressing the student directly as "you". Comment on grammar and vocabulary based on the text, and on clarity and phonetic accuracy based on the audio.
2.  **Content Score:** Provide a numerical score from 0 to 100 for the content. For sentence repetition and situational prompts, this score should primarily reflect accuracy and vocabulary. For role-play and question responses, it should reflect a blend of grammatical accuracy, vocabulary, and conversational appropriateness.
3.  **Pronunciation Score:** Provide a second numerical score from 0 to 100 for pronunciation, based SOLELY on the audio. Evaluate clarity, accuracy compared to a standard native speaker, and natural flow.

Return ONLY a JSON object with three keys: "feedback" (a string), "score" (an integer for content), and "pronunciationScore" (an integer).`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      feedback: {
        type: Type.STRING,
        description: "The written feedback for the user, 2-4 sentences long, combining analysis of text and audio."
      },
      score: {
        type: Type.INTEGER,
        description: "A numerical score from 0 to 100 based on the content (grammar, vocabulary, relevance)."
      },
      pronunciationScore: {
          type: Type.INTEGER,
          description: "A numerical score from 0 to 100 based on the pronunciation in the audio (clarity, accuracy)."
      },
    },
    required: ["feedback", "score", "pronunciationScore"],
  };

  return { prompt: `${promptIntro}${commonInstruction}`, schema };
};