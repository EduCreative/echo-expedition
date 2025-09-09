
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useRef, useState, useEffect} from 'react';
import c from 'clsx';
import useStore from '../lib/store';
import { startRecording, stopRecording, changePrompt, speakText } from '../lib/actions';

const translations = {
  'Listen & Repeat': 'سنیں اور دہرائیں',
  'Your Turn': 'اب آپ کی باری',
  'Start Recording': 'ریکارڈنگ شروع کریں',
  'Recording... (Click to Stop)': 'ریکارڈنگ جاری ہے... (روکنے کے لیے کلک کریں)',
  'AI Feedback': 'AI کی رائے',
  'Urdu Translation': 'اردو ترجمہ',
  'Fill in the Blank': 'خالی جگہ پُر کریں',
  'Sentence Ordering': 'جملے کی ترتیب',
  'Level Challenge': 'سطح کا چیلنج',
  'Role Play': 'کردار نگاری',
  'Situational Prompt': 'صورتحال کا اشارہ',
  'Listening Comprehension': 'سننے کی سمجھ',
};

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

    // Reset progress when src changes
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
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
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
          type="range"
          className="seek-bar"
          value={progress}
          max={duration || 0}
          onChange={handleSeek}
          step="0.01"
          aria-label="Audio progress"
        />
      </div>
      <span className="time-display">{formatTime(duration > 0 ? progress : 0)} / {formatTime(duration)}</span>
    </div>
  );
}

function ScoreFeedbackMessage({ score }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (score !== null) {
      if (score >= 95) setMessage('Perfect!');
      else if (score >= 85) setMessage('Excellent!');
      else if (score >= 75) setMessage('Great Job!');
      else setMessage('');
      
      if (score >= 75) {
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [score]);

  if (!visible || !message) return null;

  return <div className="score-feedback-message">{message}</div>;
}

function ExerciseHUD({ score, pronunciationScore, streak, xpGained }) {
  if (score === null) return null;
  return (
    <div className="exercise-hud">
      <div className="hud-item hud-score">
        <span className="hud-label">Content Score</span>
        <span className="hud-value">{score} <span className="hud-suffix">/ 100</span></span>
        <ScoreFeedbackMessage score={score} />
      </div>
      {pronunciationScore !== null && (
        <div className="hud-item hud-pronunciation">
            <span className="hud-label">Pronunciation</span>
            <span className="hud-value">{pronunciationScore} <span className="hud-suffix">/ 100</span></span>
        </div>
      )}
      {streak > 0 && (
        <div className="hud-item hud-combo">
          <span className="hud-label">Combo</span>
          <span className="hud-value">🔥 x{streak}</span>
        </div>
      )}
      {xpGained > 0 && (
        <div className="hud-item hud-xp">
          <span className="hud-label">XP Gained</span>
          <span className="hud-value">+{xpGained}</span>
        </div>
      )}
    </div>
  );
}

function ResponseSection({ onRecord, isRecording, isProcessing, userTranscript, userRecordingBase64, userRecordingMimeType }) {
  const shouldBlinkRecord = !isRecording && !isProcessing && !userTranscript;
  return (
    <section className="response-area">
      <div className="section-header">
        <h2><span className="icon">mic</span>Your Turn</h2>
        <span className="urdu-heading">{translations['Your Turn']}</span>
      </div>
      <button
        className={c('button record-button', {
          primary: !isRecording,
          recording: isRecording,
          'blink-guide': shouldBlinkRecord
        })}
        onClick={onRecord}
        disabled={isProcessing && !isRecording}
      >
        <span className="icon">mic</span>
        <div>
           {isRecording ? 'Recording... (Click to Stop)' : 'Start Recording'}
           <div className="record-button-translation">
            {isRecording ? translations['Recording... (Click to Stop)'] : translations['Start Recording']}
          </div>
        </div>
      </button>
      {userTranscript && (
        <div className="transcript">
          <h3>Your attempt:</h3>
          <p>"{userTranscript}"</p>
          <UserAudioPlayer audioBase64={userRecordingBase64} audioMimeType={userRecordingMimeType} />
        </div>
      )}
    </section>
  );
}

function FeedbackSection({ isProcessing, feedback, score, pronunciationScore, streak, xpGained, onListen, correctAnswer }) {
  if (!isProcessing && !feedback) return null;
  
  const isAwaitingSync = feedback === 'Awaiting Sync';

  return (
    <section className="exercise-feedback">
      <div className="feedback-header">
        <div className="section-header" style={{ flexGrow: 1, marginBottom: 0, marginRight: '16px' }}>
            <h2><span className="icon">school</span>AI Feedback</h2>
            <span className="urdu-heading">{translations['AI Feedback']}</span>
        </div>
        {!isProcessing && feedback && !isAwaitingSync && (
          <button className="icon-button" onClick={() => onListen(feedback)} aria-label="Listen to feedback">
            <span className="icon">volume_up</span>
          </button>
        )}
      </div>
      {isProcessing && !feedback ? (
        <div className="loader">
          <span className="icon">hourglass_top</span> Analyzing your speech...
        </div>
      ) : (
        <>
          <ExerciseHUD score={score} pronunciationScore={pronunciationScore} streak={streak} xpGained={xpGained} />
          {correctAnswer && (
            <div className="correct-answer-display">
              <h4>Correct Answer:</h4>
              <p>{correctAnswer}</p>
            </div>
          )}
          {isAwaitingSync ? (
             <p className="feedback-text">You're currently offline. Your score and feedback will be available after you sync your progress.</p>
          ) : (
            <p className="feedback-text">{feedback}</p>
          )}
        </>
      )}
    </section>
  );
}

const HighlightBlank = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(___)/g);
  return (
    <>
      {parts.map((part, i) =>
        part === '___' ? (
          <strong key={i} className="fill-in-the-blank-word">{'_____'}</strong>
        ) : (
          part
        )
      )}
    </>
  );
};


export default function ExerciseCard() {
  const { currentLesson, isRecording, isProcessing, speechSettings, currentStreak } = useStore();
  
  const { lessonType, isPractice } = currentLesson || {};
  const currentPrompt = (currentLesson?.prompts)
    ? currentLesson.prompts[currentLesson.currentPromptIndex]
    : null;

  const handleRecord = () => {
    isRecording ? stopRecording() : startRecording();
  };

  const handleListen = (text) => {
    speakText(text, 'en-US');
  };
  
  // Auto-play prompts if setting is enabled
  useEffect(() => {
    const shouldAutoPlay = speechSettings.autoPlayPrompts;
    if (shouldAutoPlay && currentPrompt) {
      const textToSpeak = currentPrompt.text || currentPrompt.correctText || currentPrompt.question;
      if (textToSpeak) {
        const timer = setTimeout(() => speakText(textToSpeak, 'en-US'), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPrompt, speechSettings.autoPlayPrompts]);


  if (!currentLesson || (isProcessing && !currentLesson.prompts && !currentLesson.chatHistory)) {
    return (
       <div className="exercise-card">
         <div className="loader"><span className="icon">hourglass_top</span> Loading lesson...</div>
       </div>
    );
  }

  // --- STANDARD PROMPT-BASED LESSONS ---
  if (['sentence', 'situational_prompt', 'fill_in_the_blank', 'sentence_ordering'].includes(lessonType)) {
    const { prompts, currentPromptIndex } = currentLesson;
    const { text, correctText, jumbledText, translation, userTranscript, feedback, score, pronunciationScore, xpGained, userRecordingBase64, userRecordingMimeType } = currentPrompt;
    
    const isLastPrompt = currentPromptIndex === prompts.length - 1;
    const feedbackReceived = !isProcessing && feedback;
    const shouldBlinkNext = feedbackReceived && !isLastPrompt;

    let promptContent, listenText, title;
    switch(lessonType) {
        case 'fill_in_the_blank':
            title = 'Fill in the Blank';
            promptContent = <HighlightBlank text={text} />;
            listenText = correctText;
            break;
        case 'sentence_ordering':
            title = 'Sentence Ordering';
            promptContent = <span className="jumbled-text">{jumbledText}</span>;
            listenText = correctText;
            break;
        default: // sentence, situational_prompt
            title = lessonType === 'sentence' ? 'Listen & Repeat' : 'Situational Prompt';
            promptContent = text;
            listenText = text;
    }

    return (
      <div className="exercise-card">
        {isPractice && (
          <div className="practice-mode-banner">
            <span className="icon">fitness_center</span>
            Practice Mode: Scores will not be saved.
          </div>
        )}
        <div className="exercise-main-area">
          <section>
            <div className="section-header">
              <h2><span className="icon">hearing</span>{title}</h2>
              <span className="urdu-heading">{translations[title]}</span>
            </div>
            <p className="prompt-text">
              <span>{promptContent}</span>
              <button className="icon-button listen-prompt-button" onClick={() => handleListen(listenText)} aria-label="Listen to sentence" disabled={isRecording}>
                <span className="icon">volume_up</span>
              </button>
            </p>
            <div className="prompt-controls">
              <div className="prompt-navigation">
                <button className="button" onClick={() => changePrompt(currentPromptIndex - 1)} disabled={currentPromptIndex === 0 || isRecording}><span className="icon">arrow_back</span> Prev</button>
                <span className="counter">{currentPromptIndex + 1} / {prompts.length}</span>
                <button className={c("button", { 'blink-guide': shouldBlinkNext })} onClick={() => changePrompt(currentPromptIndex + 1)} disabled={currentPromptIndex === prompts.length - 1 || isRecording}>Next <span className="icon">arrow_forward</span></button>
              </div>
            </div>
            {translation && !userTranscript && (
              <div className="translation-section-embedded">
                <div className="section-header" style={{ marginBottom: '8px' }}>
                  <h3><span className="icon">translate</span>Urdu Translation</h3>
                  <span className="urdu-heading">{translations['Urdu Translation']}</span>
                </div>
                <p className="urdu-text">{translation || '...'}</p>
              </div>
            )}
          </section>
          <ResponseSection onRecord={handleRecord} isRecording={isRecording} isProcessing={isProcessing} userTranscript={userTranscript} userRecordingBase64={userRecordingBase64} userRecordingMimeType={userRecordingMimeType} />
        </div>
        <FeedbackSection isProcessing={isProcessing} feedback={feedback} score={score} pronunciationScore={pronunciationScore} streak={currentStreak} xpGained={xpGained} onListen={handleListen} correctAnswer={feedback && feedback !== 'Awaiting Sync' ? correctText : null}/>
      </div>
    );
  }
  
  // --- COMPREHENSION MODE ---
  if (lessonType === 'comprehension') {
    const { story, prompts, currentPromptIndex } = currentLesson;
    const { question, correctAnswer, userTranscript, feedback, score, pronunciationScore, xpGained, userRecordingBase64, userRecordingMimeType } = prompts[currentPromptIndex];
    
    const isLastPrompt = currentPromptIndex === prompts.length - 1;
    const feedbackReceived = !isProcessing && feedback;
    const shouldBlinkNext = feedbackReceived && !isLastPrompt;

    return (
      <div className="exercise-card comprehension-card">
        {isPractice && (
          <div className="practice-mode-banner">
            <span className="icon">fitness_center</span>
            Practice Mode: Scores will not be saved.
          </div>
        )}
        <section className="comprehension-story">
          <div className="section-header">
            <h2><span className="icon">menu_book</span>Listening Comprehension</h2>
            <span className="urdu-heading">{translations['Listening Comprehension']}</span>
          </div>
          <p className="story-text">{story}</p>
          <button className="button" onClick={() => handleListen(story)} disabled={isRecording || isProcessing}>
            <span className="icon">volume_up</span> Listen to Story
          </button>
        </section>

        <div className="exercise-main-area">
            <section>
                <div className="section-header">
                    <h2><span className="icon">quiz</span>Question {currentPromptIndex + 1}</h2>
                </div>
                <p className="prompt-text">
                    <span>{question}</span>
                </p>
                <div className="prompt-controls">
                <div className="prompt-navigation">
                    <button className="button" onClick={() => changePrompt(currentPromptIndex - 1)} disabled={currentPromptIndex === 0 || isRecording}><span className="icon">arrow_back</span> Prev</button>
                    <span className="counter">{currentPromptIndex + 1} / {prompts.length}</span>
                    <button className={c("button", { 'blink-guide': shouldBlinkNext })} onClick={() => changePrompt(currentPromptIndex + 1)} disabled={currentPromptIndex === prompts.length - 1 || isRecording}>Next <span className="icon">arrow_forward</span></button>
                </div>
                </div>
            </section>
            <ResponseSection onRecord={handleRecord} isRecording={isRecording} isProcessing={isProcessing} userTranscript={userTranscript} userRecordingBase64={userRecordingBase64} userRecordingMimeType={userRecordingMimeType} />
        </div>
        <FeedbackSection isProcessing={isProcessing} feedback={feedback} score={score} pronunciationScore={pronunciationScore} streak={currentStreak} xpGained={xpGained} onListen={handleListen} correctAnswer={feedback && feedback !== 'Awaiting Sync' ? correctAnswer : null} />
      </div>
    );
  }


  // --- ROLEPLAY & BOSS BATTLE MODE ---
  if (lessonType === 'roleplay' || lessonType === 'boss_battle') {
    const { scenario, chatHistory, prompt } = currentLesson;
    const { score, pronunciationScore, xpGained, feedback } = prompt;
    const userMessage = chatHistory.findLast(m => m.role==='user');
    const isBossBattle = lessonType === 'boss_battle';

    return (
      <div className="exercise-card roleplay-card">
         {isPractice && (
          <div className="practice-mode-banner">
            <span className="icon">fitness_center</span>
            Practice Mode: Scores will not be saved.
          </div>
        )}
        <section>
          <div className="section-header">
            <h2>
              <span className="icon">{isBossBattle ? 'workspace_premium' : 'groups'}</span>
              {isBossBattle ? 'Level Challenge' : 'Role Play'}: {currentLesson.title}
            </h2>
            <span className="urdu-heading">{translations[isBossBattle ? 'Level Challenge' : 'Role Play']}</span>
          </div>
          <p className="scenario-description">{scenario}</p>
          <div className="chat-container">
            {chatHistory.map((msg, index) => (
              <div key={index} className={c('chat-bubble', msg.role)}>
                {msg.role === 'user' && msg.audioBase64 && <UserAudioPlayer audioBase64={msg.audioBase64} audioMimeType={msg.audioMimeType} />}
                <p>{msg.text}</p>
                {msg.role === 'ai' && (
                    <button className="icon-button" onClick={() => handleListen(msg.text)} disabled={isRecording || isProcessing}>
                        <span className="icon">volume_up</span>
                    </button>
                )}
              </div>
            ))}
            {isProcessing && chatHistory[chatHistory.length - 1].role === 'user' && (
              <div className="chat-bubble ai typing">
                <div className="typing-indicator"></div>
              </div>
            )}
          </div>
        </section>
        <ResponseSection onRecord={handleRecord} isRecording={isRecording} isProcessing={isProcessing} userTranscript={userMessage?.text} />
        <FeedbackSection isProcessing={isProcessing && !!userMessage} feedback={feedback} score={score} pronunciationScore={pronunciationScore} streak={currentStreak} xpGained={xpGained} onListen={handleListen} />
      </div>
    );
  }

  return <div className="exercise-card"><p>Unknown lesson type.</p></div>;
}
