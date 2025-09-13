/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState, useMemo, useRef } from 'react';
import useStore from '../lib/store';
import { startRecording, stopRecording, speakText, changePrompt, submitForFeedback, discardRecording } from '../lib/actions';
import { getPhoneticTranscription } from '../lib/llm';
import c from 'clsx';

function UserAudioPlayer({ audioBase64, audioMimeType }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState('');

  useEffect(() => {
    if (audioBase64 && audioMimeType) {
      setAudioSrc(`data:${audioMimeType};base64,${audioBase64}`);
    } else {
      setAudioSrc('');
    }
  }, [audioBase64, audioMimeType]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setProgress(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);
    setProgress(0);
    setIsPlaying(false);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  const togglePlayPause = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
  
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audio.ended) {
        audio.currentTime = 0;
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(error => {
            console.error("Audio playback failed:", error);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = e.target.value;
    setProgress(e.target.value);
  };
  
  const formatTime = (time) => {
      if (isNaN(time) || time === 0) return '0:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioSrc) return null;

  return (
    <div className="user-audio-player">
      <audio ref={audioRef} src={audioSrc} preload="metadata"></audio>
      <button onClick={togglePlayPause} className="icon-button play-pause-button" aria-label={isPlaying ? "Pause audio" : "Play audio"}>
        <span className="icon">{isPlaying ? 'pause' : 'play_arrow'}</span>
      </button>
      <div className="seek-bar-container">
        <input
          type="range" className="seek-bar" value={progress}
          max={duration || 0} onChange={handleSeek} step="0.01"
          aria-label="Audio progress"
        />
      </div>
      <span className="time-display">{formatTime(progress)} / {formatTime(duration)}</span>
    </div>
  );
}

function FeedbackHUD({ score, pronunciationScore, xpGained, streak }) {
  const [scoreFeedback, setScoreFeedback] = useState('');

  useEffect(() => {
    if (xpGained > 0) {
      setScoreFeedback(`+${xpGained} XP`);
      const timer = setTimeout(() => setScoreFeedback(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [xpGained]);

  return (
    <div className="exercise-hud">
      <div className="hud-item hud-score">
        <span className="hud-label">Content Score</span>
        <span className="hud-value">{score ?? '??'}<span className="hud-suffix">/100</span></span>
        {scoreFeedback && <span className="score-feedback-message">{scoreFeedback}</span>}
      </div>
      <div className="hud-item hud-pronunciation">
        <span className="hud-label">Pronunciation</span>
        <span className="hud-value">{pronunciationScore ?? '??'}<span className="hud-suffix">/100</span></span>
      </div>
      <div className="hud-item hud-combo">
        <span className="hud-label">Streak</span>
        <span className="hud-value">{streak}x</span>
      </div>
    </div>
  );
}

function PromptDisplay({ lesson, prompt, ipa, isIpaLoading }) {
  let promptContent;
  switch (lesson.lessonType) {
    case 'sentence_ordering':
      promptContent = <span className="jumbled-text">{prompt.jumbledText}</span>;
      break;
    case 'fill_in_the_blank':
      promptContent = (
        <span>
          {prompt.text.split('___').map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {i < prompt.text.split('___').length - 1 && <span className="fill-in-the-blank-word">______</span>}
            </React.Fragment>
          ))}
        </span>
      );
      break;
    case 'comprehension':
      promptContent = <span>{prompt.question}</span>;
      break;
    default:
      promptContent = <span>{prompt.text}</span>;
  }

  return (
    <>
      <div className="prompt-text">
        {promptContent}
      </div>
      <p className="phonetic-transcription">
        {isIpaLoading ? '...' : ipa}
      </p>
    </>
  );
}

export default function ExerciseCard() {
  const {
    currentLesson, isRecording, isProcessing, speechSettings,
    isAiEnabled, isOnline, currentStreak,
  } = useStore();
  const [ipa, setIpa] = useState('');
  const [isIpaLoading, setIsIpaLoading] = useState(false);
  const isMultiPrompt = currentLesson?.prompts && currentLesson.prompts.length > 1;

  const currentPrompt = useMemo(() => {
    if (!currentLesson) return null;
    return isMultiPrompt ? currentLesson.prompts[currentLesson.currentPromptIndex] : currentLesson.prompt;
  }, [currentLesson, isMultiPrompt]);

  const textToTranscribe = useMemo(() => {
    if (!currentPrompt) return '';
    return currentPrompt.correctText || currentPrompt.text || '';
  }, [currentPrompt]);

  useEffect(() => {
    let isCancelled = false;
    const fetchIpa = async () => {
      if (speechSettings.showPhonetics && textToTranscribe && isOnline && isAiEnabled) {
        setIsIpaLoading(true);
        try {
          const transcription = await getPhoneticTranscription(textToTranscribe);
          if (!isCancelled) setIpa(transcription);
        } catch (error) {
          console.error("Failed to fetch IPA:", error);
          if (!isCancelled) setIpa('');
        } finally {
          if (!isCancelled) setIsIpaLoading(false);
        }
      } else {
        setIpa('');
      }
    };
    fetchIpa();
    return () => { isCancelled = true };
  }, [textToTranscribe, speechSettings.showPhonetics, isOnline, isAiEnabled]);
  
  useEffect(() => {
    if (speechSettings.autoPlayPrompts && textToTranscribe && !currentPrompt?.feedback && !currentPrompt?.pendingRecording) {
      speakText(textToTranscribe);
    }
  }, [textToTranscribe, speechSettings.autoPlayPrompts, currentPrompt?.feedback, currentPrompt?.pendingRecording]);


  if (!currentLesson) {
    return (
      <div className="loader"><span className="icon">hourglass_top</span> Loading Lesson...</div>
    );
  }

  const { lessonType, title } = currentLesson;
  const isInteractive = lessonType === 'roleplay' || lessonType === 'boss_battle';
  const hasFeedback = currentPrompt?.feedback;
  const { pendingRecording } = currentPrompt || {};
  const isNotLastPrompt = isMultiPrompt && currentLesson.currentPromptIndex < currentLesson.prompts.length - 1;
  const shouldBlinkNext = hasFeedback && isNotLastPrompt;


  const handleRecordClick = () => isRecording ? stopRecording() : startRecording();
  const handleListenClick = () => speakText(textToTranscribe);
  
  return (
    <div className="exercise-card">
      <section className="prompt-section">
        <div className="section-header">
          <h2><span className="icon">hearing</span> 1. Listen & Understand</h2>
          <h3 className="urdu-heading">{title}</h3>
        </div>
        
        {lessonType === 'comprehension' && <p className="story-text">{currentLesson.story}</p>}
        {isInteractive && (
          <div className="scenario-description">{currentLesson.scenario}</div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <PromptDisplay lesson={currentLesson} prompt={currentPrompt} ipa={ipa} isIpaLoading={isIpaLoading} />
          <button
            className="icon-button listen-prompt-button"
            onClick={handleListenClick}
            aria-label="Listen to prompt"
            disabled={isRecording}
          >
            <span className="icon">volume_up</span>
          </button>
        </div>
        
        {isMultiPrompt && (
          <div className="prompt-controls">
            <div className="prompt-navigation">
              <button className="icon-button" onClick={() => changePrompt(currentLesson.currentPromptIndex - 1)} disabled={currentLesson.currentPromptIndex === 0}>
                <span className="icon">arrow_back</span>
              </button>
              <span className="counter">{currentLesson.currentPromptIndex + 1} / {currentLesson.prompts.length}</span>
              <button className={c('icon-button', { 'blink-guide-next': shouldBlinkNext })} onClick={() => changePrompt(currentLesson.currentPromptIndex + 1)} disabled={!isNotLastPrompt}>
                <span className="icon">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {!isInteractive && currentPrompt.translation && (
        <section className="translation-section">
           <div className="section-header">
              <h2><span className="icon">translate</span> 2. Translation</h2>
              <h3 className="urdu-heading">ترجمہ</h3>
            </div>
          <p className="urdu-text">{currentPrompt.translation}</p>
        </section>
      )}

      <section className="response-section">
        <div className="section-header">
          <h2><span className="icon">mic</span> {isInteractive ? "1. Your Turn" : "3. Your Turn"}</h2>
          <h3 className="urdu-heading">اب آپکی باری</h3>
        </div>
        {isInteractive && (
          <div className="chat-container">
            {currentLesson.chatHistory.map((msg, index) => (
              <div key={index} className={c('chat-bubble', msg.role)}>
                {msg.role === 'user' && msg.audioBase64 && <UserAudioPlayer audioBase64={msg.audioBase64} audioMimeType={msg.audioMimeType} />}
                <p>{msg.text}</p>
                {msg.role === 'ai' && <button className="icon-button" onClick={() => speakText(msg.text)}><span className="icon">volume_up</span></button>}
              </div>
            ))}
          </div>
        )}
        <div className="response-area">
           {pendingRecording && !hasFeedback ? (
            <div className="recording-preview">
              <div className="transcript">
                <h3>Your Answer (Preview)</h3>
                <p>"{pendingRecording.transcript}"</p>
              </div>
              <UserAudioPlayer audioBase64={pendingRecording.audioBase64} audioMimeType={pendingRecording.audioMimeType} />
              <div className="preview-actions">
                <button className="button" onClick={discardRecording}>
                  <span className="icon">replay</span> Record Again
                </button>
                <button className="button primary" onClick={submitForFeedback} disabled={isProcessing}>
                  {isProcessing ? 'Submitting...' : 'Submit for Feedback'}
                </button>
              </div>
            </div>
          ) : (
             <>
                {(!isAiEnabled || !isOnline) && !isInteractive && (
                    <div className="ai-disabled-message">
                    <span className="icon" style={{fontSize: '48px', color: 'var(--text-tertiary)'}}>
                        {isAiEnabled ? 'wifi_off' : 'toggle_off'}
                    </span>
                    <p>
                        {isAiEnabled
                        ? "You are offline. AI feedback is unavailable, but you can still record and listen to your audio."
                        : "AI features are disabled. Please enable them in the header to get feedback."
                        }
                    </p>
                    </div>
                )}
                <button
                    className={c('button record-button', { primary: !isRecording, recording: isRecording })}
                    onClick={handleRecordClick}
                    disabled={isProcessing || hasFeedback}
                >
                    <span className="icon">mic</span>
                    {isRecording ? 'Recording...' : hasFeedback ? 'Answer Submitted' : 'Record Answer'}
                    <span className="record-button-translation">{isRecording ? '... ریکارڈنگ' : hasFeedback ? 'جواب جمع کر دیا گیا' : 'جواب ریکارڈ کریں'}</span>
                </button>
             </>
           )}
          {isProcessing && <div className="loader" style={{minHeight: 'auto', paddingTop: '16px'}}><span className="icon">hourglass_top</span> Analyzing...</div>}
        </div>
      </section>
      
      {hasFeedback && (
        <section className="feedback-section">
            <div className="feedback-header">
                <h2><span className="icon">auto_awesome</span> 4. AI Feedback</h2>
                 <h3 className="urdu-heading">AI فیڈبیک</h3>
            </div>
            {currentPrompt.feedback === 'OFFLINE_RECORDING' ? (
                <div className="offline-comparison-section">
                  <h3 className="offline-header"><span className="icon">wifi_off</span>Offline Recording Saved</h3>
                  <p className="offline-instruction">Compare your recording to the original prompt.</p>
                  <div className="transcript" style={{marginTop: '16px'}}>
                    <h3>Your Answer</h3>
                    <p>"{currentPrompt.userTranscript}"</p>
                  </div>
                  <div className="audio-comparison-section">
                    <div className="audio-player">
                      <p>Original</p>
                      <button className="button" onClick={handleListenClick}><span className="icon">play_arrow</span> Listen</button>
                    </div>
                    <div className="audio-player">
                       <p>Your Recording</p>
                       <UserAudioPlayer audioBase64={currentPrompt.userRecordingBase64} audioMimeType={currentPrompt.userRecordingMimeType} />
                    </div>
                  </div>
                </div>
            ) : (
              <>
                <FeedbackHUD score={currentPrompt.score} pronunciationScore={currentPrompt.pronunciationScore} xpGained={currentPrompt.xpGained} streak={currentStreak} />
                <p className="feedback-text">{currentPrompt.feedback}</p>
                <div className="transcript" style={{marginTop: '16px'}}>
                    <h3>Your Answer</h3>
                    <p>"{currentPrompt.userTranscript}"</p>
                </div>
                 {currentPrompt.userRecordingBase64 && (
                  <div className="audio-comparison-section">
                    <div className="audio-player">
                      <p>Original Prompt</p>
                      <button className="button" onClick={handleListenClick}><span className="icon">play_arrow</span> Listen</button>
                    </div>
                    <div className="audio-player">
                      <p>Your Recording</p>
                      <UserAudioPlayer audioBase64={currentPrompt.userRecordingBase64} audioMimeType={currentPrompt.userRecordingMimeType} />
                    </div>
                  </div>
                )}
                {currentLesson.lessonType === 'sentence_ordering' && currentPrompt.score < 100 && (
                  <div className="correct-answer-display">
                    <h4>Correct Sentence:</h4>
                    <p>{currentPrompt.correctText}</p>
                  </div>
                )}
              </>
            )}
        </section>
      )}
    </div>
  );
}