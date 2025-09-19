/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, useState } from 'react';
import useStore from '../lib/store';
import { goToDashboard, startRecording, stopRecording, startPronunciationRace, goToNextRaceWord } from '../lib/actions';
import c from 'clsx';
import UserAudioPlayer from './UserAudioPlayer';

function RaceEndSummary({ score, highScore }) {
  return (
    <div className="race-end-overlay">
      <div className="race-end-modal">
        <h2>Race Over!</h2>
        <div className="final-scores">
          <div className="final-score-item">
            <span className="final-score-label">Final Streak</span>
            <span className="final-score-value">🔥 {score}</span>
          </div>
          <div className="final-score-item">
            <span className="final-score-label">High Score</span>
            <span className="final-score-value">🏆 {highScore}</span>
          </div>
        </div>
        {score > highScore && <p className="new-high-score">New High Score!</p>}
        <div className="race-end-buttons">
          <button className="button" onClick={startPronunciationRace}>Play Again</button>
          <button className="button" onClick={goToDashboard}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}

function RaceFeedback({ result, onNext, onRetry, currentWord, onListen }) {
  if (!result) return null;

  const { score, feedbackTip, status } = result;

  if (status === 'OFFLINE_PRACTICE') {
      return (
          <div className="offline-comparison-section">
              <h3 className="offline-header"><span className="icon">wifi_off</span>Offline Practice</h3>
              <p className="offline-instruction">Compare your recording to the original.</p>
              <h2 className="race-word" style={{marginBottom: '24px'}}>{currentWord}</h2>
              <div className="audio-players-container">
                  <div className="audio-player">
                      <button className="button" onClick={() => onListen(currentWord)}>
                          <span className="icon">play_arrow</span> Original Audio
                      </button>
                  </div>
                  <div className="audio-player">
                      <UserAudioPlayer audioBase64={result.userRecordingBase64} audioMimeType={result.userRecordingMimeType} />
                  </div>
              </div>
              <div className="race-feedback-actions">
                  <button className="button primary" onClick={onNext}>Next Word <span className="icon">arrow_forward</span></button>
              </div>
          </div>
      );
  }

  const getFeedbackMessage = () => {
    if (status === 'success') return 'Perfect!';
    if (status === 'retry') return 'Good, try for perfect!';
    return 'Oops, try again!';
  };
  
  return (
    <div className={c("race-feedback-container", status)}>
        <div className="race-feedback-score">
            <span className="score-value">{score}</span>
            <span className="score-max">/ 100</span>
        </div>
        <h3 className="race-feedback-message">{getFeedbackMessage()}</h3>
        {feedbackTip && <p className="race-feedback-tip">💡 {feedbackTip}</p>}

        <div className="race-feedback-actions">
            {status === 'success' && (
                <button className="button primary" onClick={onNext}>Next Word <span className="icon">arrow_forward</span></button>
            )}
            {status === 'retry' && (
                <button className="button primary" onClick={onRetry}>Retry <span className="icon">refresh</span></button>
            )}
             {status === 'fail' && (
                <button className="button" onClick={onRetry}>Try Again <span className="icon">refresh</span></button>
            )}
        </div>
    </div>
  );
}

export default function PronunciationRace() {
  const { 
    pronunciationRaceState, 
    isRecording, 
    isProcessing,
    pronunciationRaceHighScore,
    speechSettings,
    isOnline,
    isAiEnabled,
  } = useStore();

  const { isActive, words, currentWordIndex, streak, lives, lastResult } = pronunciationRaceState;

  useEffect(() => {
    if (!isActive) {
      goToDashboard(); // Should not be on this screen if race is not active
    }
  }, [isActive]);
  
  if (!isActive) return null;

  const currentWord = words[currentWordIndex];
  const isGameOver = lives <= 0;

  const handleRecord = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const handleListen = (text) => {
    if (!text) return;
    const availableVoices = window.speechSynthesis.getVoices();
    const selectedVoice = availableVoices.find(v => v.voiceURI === speechSettings.voice);
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice || null;
    utterance.rate = speechSettings.rate || 1;
    speechSynthesis.speak(utterance);
  };
  
  const handleRetry = () => {
    useStore.setState(state => {
        state.pronunciationRaceState.lastResult = null;
    });
  }

  return (
    <div className="pronunciation-race-container">
       <button className="button back-to-dashboard" onClick={goToDashboard}>
        <span className="icon">arrow_back</span> Back to Dashboard
      </button>

      <div className="race-hud">
          <div className="race-hud-item lives">
            <span className="race-hud-label">Lives</span>
            <div className="race-hud-value">
                {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className={c("icon", i < lives ? 'filled' : '')}>favorite</span>
                ))}
            </div>
          </div>
          <div className="race-hud-item streak">
            <span className="race-hud-label">Streak</span>
            <span className="race-hud-value">🔥 {streak}</span>
          </div>
      </div>

      <div className="race-card">
        {isProcessing && !lastResult && (
            <div className="loader">
                <span className="icon">hourglass_top</span> Analyzing...
            </div>
        )}

        {!isProcessing && !lastResult && (
            <div className="race-word-area">
                {(!isOnline || !isAiEnabled) && <p className="offline-warning" style={{marginBottom: '24px'}}><span className="icon">wifi_off</span>Offline mode: Scores and AI feedback are unavailable.</p>}
                <p className="race-instruction">Pronounce the word:</p>
                <div className="race-word-wrapper">
                    <h2 className="race-word">{currentWord}</h2>
                     <button className="icon-button listen-prompt-button" onClick={() => handleListen(currentWord)} aria-label="Listen to word" disabled={isRecording}>
                        <span className="icon">volume_up</span>
                    </button>
                </div>
                <button
                    className={c('button record-button', { primary: !isRecording, recording: isRecording })}
                    onClick={handleRecord}
                    disabled={isProcessing}
                >
                    <span className="icon">mic</span>
                    {isRecording ? 'Recording...' : 'Record'}
                </button>
            </div>
        )}

        {lastResult && (
            <RaceFeedback result={lastResult} onNext={goToNextRaceWord} onRetry={handleRetry} currentWord={currentWord} onListen={handleListen}/>
        )}
      </div>

      {isGameOver && <RaceEndSummary score={streak} highScore={pronunciationRaceHighScore} />}
    </div>
  );
}