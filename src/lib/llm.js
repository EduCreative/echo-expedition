

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';
const imageModel = 'imagen-4.0-generate-001';

async function callApi(prompt) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
    });
    
    const text = response.text;

    // The most robust way to prevent React rendering errors is to ensure we ONLY
    // return a string. If the response.text accessor does not return a string,
    // something is wrong with the response and we should treat it as an error.
    if (typeof text === 'string') {
      // Clean up potential markdown or unwanted characters
      return text.trim().replace(/^["']|["']$/g, '');
    }

    // If text is not a string, log the unexpected response and throw an error.
    console.warn('AI response.text was not a string. Full response:', response);
    throw new Error('Invalid response format from AI: response.text is not a string.');

  } catch (error) {
    // This will catch errors from the API call itself, or the error thrown above.
    console.error("Error generating content:", error);
    // Return a user-friendly error message that is guaranteed to be a string.
    throw new Error("Could not get a response from the AI.");
  }
}

export const generate = async (prompt) => {
  return callApi(prompt);
};

export const generateImage = async (prompt) => {
  try {
    const response = await ai.models.generateImages({
      model: imageModel,
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Could not generate an image from the AI.");
  }
};

export const translateToUrdu = async (text) => {
  const prompt = `Translate the following English text to Urdu. Provide only the Urdu translation, with no extra text or explanations.

English text: "${text}"`;
  return callApi(prompt);
};

export const getPhoneticTranscription = async (text) => {
  if (!text) return '';
  const prompt = `Provide the International Phonetic Alphabet (IPA) transcription for the following English text.
Output ONLY the transcription string, without any extra text, labels, or markdown.
For example, for 'hello', you should output '/həˈloʊ/'.

Text: "${text}"`;
  return callApi(prompt);
};
