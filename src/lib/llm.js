/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';
const imageModel = 'imagen-4.0-generate-001';

/**
 * Robustly extracts the text content from a GenerateContentResponse.
 * This should be used whenever a raw response object is received from generateContent.
 * @param {import('@google/genai').GenerateContentResponse} response The response from the AI model.
 * @returns {string} The extracted text.
 * @throws {Error} If text cannot be extracted.
 */
// Fix: Simplified to use the recommended `response.text` accessor, per @google/genai guidelines.
// The previous implementation used an unsupported fallback path.
export function getText(response) {
  // The `GenerateContentResponse` object has a property called `text` that directly
  // provides the string output. Accessing it is the recommended and safest method.
  if (response && typeof response.text === 'string') {
    return response.text;
  }

  // If we don't have a string, the response is malformed or was blocked.
  console.error('Could not extract text from AI response. The .text property was not a string. Full response:', response);
  throw new Error('Invalid response format from AI: could not find text.');
}


async function callApi(prompt) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    
    const text = getText(response);

    // Clean up potential markdown or unwanted characters
    return text.trim().replace(/^["']|["']$/g, '');

  } catch (error) {
    // This will catch errors from the API call itself, or the error thrown in getText.
    console.error("Error generating content:", error);
    // Re-throw with a generic message
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
