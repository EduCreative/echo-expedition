/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ipaData } from '../lib/ipa-data';
import { speakText } from '../lib/actions';

function IpaTable({ title, data }) {
    // We only want to speak the first example word for clarity.
    const handlePlaySound = (exampleText) => {
        const firstWord = exampleText.split(',')[0].trim();
        speakText(firstWord);
    };

    return (
        <div className="ipa-section">
            <h4>{title}</h4>
            <table className="ipa-table">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Example</th>
                        <th>Sound</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(({ symbol, example }) => (
                        <tr key={symbol}>
                            <td className="ipa-symbol">/{symbol}/</td>
                            <td className="ipa-example">{example}</td>
                            <td>
                                <button
                                    className="icon-button ipa-play-button"
                                    onClick={() => handlePlaySound(example)}
                                    aria-label={`Listen to example for ${symbol}`}
                                >
                                    <span className="icon">volume_up</span>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function PronunciationKeyModal({ onClose }) {
  return (
    <div className="pronunciation-key-overlay" onClick={onClose}>
      <div className="pronunciation-key-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
            <h3><span className="icon">menu_book</span> Pronunciation Key (IPA)</h3>
            <button className="icon-button close-button" onClick={onClose} aria-label="Close">
                <span className="icon">close</span>
            </button>
        </div>
        <div className="ipa-tables-container">
            <IpaTable title="Vowels" data={ipaData.vowels} />
            <IpaTable title="Diphthongs (Vowel Combinations)" data={ipaData.diphthongs} />
            <IpaTable title="Consonants" data={ipaData.consonants} />
        </div>
      </div>
    </div>
  );
}
