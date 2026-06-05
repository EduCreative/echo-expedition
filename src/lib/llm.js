/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Calls the secure server-side proxy to generate content using Gemini.
 * @param {object} params Parameter object for generateContent.
 * @param {string} params.model The model name to use.
 * @param {object|string} params.contents The prompt string or parts object.
 * @param {object} [params.config] Optional config parameters (e.g. schema, mimeType).
 * @returns {Promise<object>} The mock-up of response with .text property.
 */
export async function generateContent({ model, contents, config }) {
  try {
    const response = await fetch('/api/gemini/generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, contents, config }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    return { text: data.text };
  } catch (error) {
    console.error("Error in generateContent proxy call:", error);
    throw error;
  }
}

/**
 * Calls the secure server-side proxy to generate images using Imagen.
 * @param {object} params Parameter object for generateImages.
 * @param {string} params.model The model name to use.
 * @param {string} params.prompt The visual prompt.
 * @param {object} [params.config] Optional config parameters.
 * @returns {Promise<object>} The server response containing generatedImages.
 */
export async function generateImages({ model, prompt, config }) {
  try {
    const response = await fetch('/api/gemini/generateImages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, config }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in generateImages proxy call:", error);
    throw error;
  }
}

// Proxy-compatible wrapper for standard text generation
async function callApi(prompt) {
  try {
    const response = await generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Could not get a response from the AI.");
  }
}

export const generate = async (prompt) => {
  return callApi(prompt);
};

export const generateImage = async (prompt) => {
  try {
    const response = await generateImages({
      model: 'imagen-4.0-generate-001',
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
