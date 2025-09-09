/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * ## The Message Behind the New Logo
 * 
 * I've redesigned the logo to be more symbolic and to visually represent the name "Echo Expedition". 
 * The new design is sleek, modern, and packed with meaning that reflects the app's core purpose.
 * 
 * - **The Speech Bubble:** The foundation of our logo remains the speech bubble, the universal symbol for 
 *   communication, conversation, and language. It immediately grounds the app in its purpose: helping you 
 *   master spoken English.
 * 
 * - **The Expedition Path & Mountain:** Inside the bubble, you'll now see a stylized mountain range with a 
 *   path climbing towards the summit. This is the "Expedition." It represents your personal journey from 
 *   foundational knowledge to the peak of fluency. Each lesson is a step forward on this path, a new 
 *   height achieved.
 * 
 * - **The Echo Waves:** Radiating from the mountain peak are two sound waves. This is the "Echo." They 
 *   symbolize the app's core mechanic: listening to a prompt (the sound) and repeating it (creating an echo). 
 *   It’s through this cycle of listening, speaking, and receiving feedback that your pronunciation and 
 *   confidence grow.
 * 
 * Together, the new logo tells the story of a guided journey. It visually communicates that Echo Expedition 
 * is your partner in the adventure of mastering English, turning every word you speak into a confident step 
 * towards the summit of fluency.
 */
export default function Logo() {
  return (
    <svg
      className="logo-svg"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby="logoTitle"
      role="img"
    >
      <title id="logoTitle">Echo Expedition Logo</title>
      <g>
        {/* Speech Bubble Outline */}
        <path
          className="logo-primary"
          d="M21 2H5a2 2 0 00-2 2v10a2 2 0 002 2h12l4 4V4a2 2 0 00-2-2z"
        />
        {/* Mountain Shape */}
        <path
          className="logo-secondary"
          d="M7 14s1.5-2 3-2 3 2 3 2l3-2.5s1.5 1.5 3 0v2H7v-2z"
        />
        {/* Expedition Path */}
        <path
          className="logo-accent-stroke"
          strokeLinecap="round"
          strokeWidth="1.5"
          fill="none"
          d="M7 12l3-3 3 2 3-3"
        />
        {/* Echo Waves */}
        <path
          className="logo-secondary-stroke"
          strokeLinecap="round"
          strokeWidth="1.5"
          fill="none"
          d="M16 6a3 3 0 010 4M18 4a6 6 0 010 8"
        />
      </g>
    </svg>
  );
}