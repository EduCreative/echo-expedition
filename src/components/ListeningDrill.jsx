

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState, useMemo } from 'react';
import useStore from '../lib/store';
import { goToDashboard, startListeningDrill, submitListeningDrillGuess, goToNextDrillSentence } from '../lib/actions';
import c from 'clsx';
import { diffWords } from 'diff';

function DrillEndSummary({ score, highScore }) {
  return (
    <div className="race-end-overlay">
      <div className="race-end-modal">
        <h2>Drill Over!</h2>
        <div className="final-scores">
          <div className="final-score-item">
            <span className="final-score-label">Final Streak</span>
            <span className="final-score-value">🎯 {score}</span>
          </div>
          <div className="final-score-item">
            <span className="final-score-label">High Score</span>
            <span className="final-score-value">🏆 {highScore}</span>
          </div>
        </div>
        {score > highScore && <p className="new-high-score">New High Score!</p>}
        <div className="race-end-buttons">
          <button className="button" onClick={startListeningDrill}>Play Again</button>
          <button className="button" onClick={goToDashboard}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}

function DiffViewer({ guess, correct }) {
    const diffResult = useMemo(() => {
        return diffWords(correct, guess, { ignoreCase: true });
    }, [guess, correct]);

    return (
        <div className="drill-diff-view">
            <h4>Your attempt:</h4>
            <p className="diff-line">
                {diffResult.map((part, index) => {
                    if (part.added) {
                        return <span key={index} className="incorrect">{part.value}</span>;
                    }
                    if (part.removed) {
                        return null; // Don't show what was missed in the user's line
                    }
                    return <span key={index}>{part.value}</span>;
                })}
            </p>
            <h4>Correct sentence:</h4>
            <p className="diff-line">
                {diffResult.map((part, index) => {
                     if (part.added) {
                        return null; // Don't show user's extra words in correct line
                    }
                    if (part.removed) {
                       return <span key={index} className="missing">{part.value}</span>;
                    }
                    return <span key={index} className="correct">{part.value}</span>;
                })}
            </p>
        </div>
    );
}

function DrillFeedback({ result }) {
  if (!result) return null;

  const { status, guess, correct } = result;
  const isSuccess = status === 'success';

  return (
    <div className={c("drill-feedback-container", status)}>
        <h3 className="drill-feedback-message">{isSuccess ? "Correct!" : "Not Quite!"}</h3>
        
        {!isSuccess && <DiffViewer guess={guess} correct={correct} />}

        <div className="drill-feedback-actions">
           <button className="button primary" onClick={goToNextDrillSentence}>
            {isSuccess ? "Next Sentence" : "Continue"}<span className="icon">arrow_forward</span>
          </button>
        </div>
    </div>
  );
}

export default function ListeningDrill() {
  const { 
    listeningDrillState, 
    listeningDrillHighScore,
    speechSettings
  } = useStore();
  const [currentGuess, setCurrentGuess] = useState('');

  const { isActive, sentences, currentSentenceIndex, streak, lives, lastResult } = listeningDrillState;

  useEffect(() => {
    // This can happen if the component is mounted manually or state is cleared
    if (!isActive) {
      goToDashboard();
    }
  }, [isActive]);
  
  if (!isActive) return null;

  const currentSentence = sentences[currentSentenceIndex];
  const isGameOver = lives <= 0;

  const handleListen = () => {
    if (!currentSentence) return;
    const availableVoices = window.speechSynthesis.getVoices();
    const selectedVoice = availableVoices.find(v => v.voiceURI === speechSettings.voice);
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentSentence);
    utterance.voice = selectedVoice || null;
    utterance.rate = speechSettings.rate || 1;
    speechSynthesis.speak(utterance);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentGuess.trim()) return;
    submitListeningDrillGuess(currentGuess);
    setCurrentGuess('');
  };

  return (
    <div className="listening-drill-container">
       <button className="button back-to-dashboard" onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>

      <div className="drill-hud">
          <div className="drill-hud-item lives">
            <span className="drill-hud-label">Lives</span>
            <div className="drill-hud-value">
                {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={c("icon", i < lives ? 'filled' : '')}>favorite</span>
                ))}
            </div>
          </div>
          <div className="drill-hud-item streak">
            <span className="drill-hud-label">Streak</span>
            <span className="drill-hud-value">🎯 {streak}</span>
          </div>
      </div>

      <div className="drill-card">
        {!lastResult ? (
          <div className="drill-input-area">
            <button className="button primary drill-listen-button" onClick={handleListen}>
                <span className="icon">volume_up</span> Listen to Sentence
            </button>
            <form onSubmit={handleSubmit} className="drill-input-form">
                <input
                    type="text"
                    value={currentGuess}
                    onChange={(e) => setCurrentGuess(e.target.value)}
                    placeholder="Type what you hear..."
                    aria-label="Your transcription"
                    autoFocus
                />
                <button type="submit" className="button" disabled={!currentGuess.trim()}>Submit</button>
            </form>
          </div>
        ) : (
            <DrillFeedback result={lastResult} />
        )}
      </div>

      {isGameOver && <DrillEndSummary score={streak} highScore={listeningDrillHighScore} />}
    </div>
  );
}