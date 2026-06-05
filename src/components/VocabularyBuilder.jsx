/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState } from 'react';
import useStore from '../lib/store';
import { goToDashboard, startRecording, stopRecording, startVocabularyBuilder, goToNextVocabularyWord, submitVocabularyBuilderAnswer } from '../lib/actions';
import c from 'clsx';

function GameEndSummary({ score, highScore }) {
  return (
    <div className="race-end-overlay">
      <div className="race-end-modal">
        <h2>Drill Over!</h2>
        <div className="final-scores">
          <div className="final-score-item">
            <span className="final-score-label">Final Score</span>
            <span className="final-score-value">✨ {score}</span>
          </div>
          <div className="final-score-item">
            <span className="final-score-label">High Score</span>
            <span className="final-score-value">🏆 {highScore}</span>
          </div>
        </div>
        {score > highScore && <p className="new-high-score">New High Score!</p>}
        <div className="race-end-buttons">
          <button className="button" onClick={startVocabularyBuilder}>Play Again</button>
          <button className="button" onClick={goToDashboard}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}

function VocabFeedback({ result }) {
  if (!result) return null;
  const { status, feedback } = result;

  return (
    <div className={c("vocab-feedback-container", status)}>
        <h3 className="vocab-feedback-message">{status === 'success' ? "Excellent!" : "Keep Trying!"}</h3>
        <p className="vocab-feedback-text">{feedback}</p>
        <div className="vocab-feedback-actions">
           <button className="button primary" onClick={goToNextVocabularyWord}>
            Next Word <span className="icon">arrow_forward</span>
          </button>
        </div>
    </div>
  );
}


export default function VocabularyBuilder() {
  const { 
    vocabularyBuilderState, 
    isRecording, 
    isProcessing,
    vocabularyBuilderHighScore,
  } = useStore();
  const [spellingGuess, setSpellingGuess] = useState('');

  const { isActive, words, currentWordIndex, score, lives, lastResult, currentImage, isGeneratingImage, pendingRecording } = vocabularyBuilderState;

  useEffect(() => {
    if (!isActive) {
      goToDashboard();
    }
    // Cleanup pending recording if component unmounts
    return () => {
        useStore.setState(s => { if(s.vocabularyBuilderState) s.vocabularyBuilderState.pendingRecording = null; });
    }
  }, [isActive]);
  
  if (!isActive) return null;

  const currentWord = words[currentWordIndex];
  const isGameOver = lives <= 0;

  const handleRecord = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (spellingGuess.trim() && pendingRecording) {
      submitVocabularyBuilderAnswer(spellingGuess);
      setSpellingGuess('');
    }
  };

  return (
    <div className="vocabulary-builder-container">
      <button className="button back-to-dashboard" onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>

      <div className="vocab-hud">
          <div className="vocab-hud-item lives">
            <span className="vocab-hud-label">Lives</span>
            <div className="vocab-hud-value">
                {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={c("icon", i < lives ? 'filled' : '')}>favorite</span>
                ))}
            </div>
          </div>
          <div className="vocab-hud-item score">
            <span className="vocab-hud-label">Score</span>
            <span className="vocab-hud-value">✨ {score}</span>
          </div>
      </div>

      <div className="vocab-card">
        {!lastResult ? (
          <>
            <div className="vocab-image-area">
              {isGeneratingImage && (
                <div className="image-loader loader">
                  <span className="icon">hourglass_top</span> Generating Image...
                </div>
              )}
              {currentImage && <img src={currentImage} alt="Guess the word" className="vocab-image" />}
            </div>

            <form onSubmit={handleSubmit} className="vocab-input-form">
              <div className="input-group">
                  <input
                      type="text"
                      value={spellingGuess}
                      onChange={(e) => setSpellingGuess(e.target.value)}
                      placeholder="Type the word..."
                      aria-label="Your spelling guess"
                      disabled={isGeneratingImage || isProcessing}
                      autoFocus
                  />
                  <button
                      type="button"
                      className={c('button record-button', { primary: !isRecording, recording: isRecording })}
                      onClick={handleRecord}
                      disabled={isProcessing}
                  >
                      <span className="icon">mic</span>
                  </button>
              </div>
              
              {pendingRecording && (
                <div className="recording-indicator">
                    <span className="icon">check_circle</span> Audio Recorded
                </div>
              )}

              <button 
                type="submit" 
                className="button primary" 
                disabled={!spellingGuess.trim() || !pendingRecording || isProcessing || isGeneratingImage}
              >
                {isProcessing ? 'Checking...' : 'Submit Answer'}
              </button>
            </form>
          </>
        ) : (
          <VocabFeedback result={lastResult} />
        )}
      </div>

      {isGameOver && <GameEndSummary score={score} highScore={vocabularyBuilderHighScore} />}
    </div>
  );
}