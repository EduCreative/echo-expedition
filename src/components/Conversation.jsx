/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, useState } from 'react';
import useStore from '../lib/store';
import { goToDashboard, startRecording, stopRecording } from '../lib/actions';
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
      if (audio.ended) {
          audio.currentTime = 0;
      }
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


export default function Conversation() {
  const { 
    conversationState, 
    isRecording, 
    isProcessing,
    speechSettings,
    error,
  } = useStore();
  const { isActive, chatHistory, scenarioTitle } = conversationState;
  const chatAreaRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      goToDashboard(); // Should not be on this screen if mode is not active
    }
  }, [isActive]);

  useEffect(() => {
    // Scroll to the bottom of the chat area when new messages are added
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatHistory]);

  if (!isActive) return null;

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

  const lastMessage = chatHistory[chatHistory.length - 1];
  const isAiTyping = isProcessing && lastMessage && lastMessage.role === 'user';

  return (
    <div className="conversation-container">
      <div className="conversation-header">
        <h2>
          <span className="icon">forum</span>
          {scenarioTitle || 'Chat & Learn'}
        </h2>
        <button className="button" onClick={goToDashboard}>
            <span className="icon">arrow_back</span> Back to Dashboard
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
      
      <div className="conversation-chat-area" ref={chatAreaRef}>
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
            {isAiTyping && (
              <div className="chat-bubble ai typing">
                <p><span className="typing-indicator"></span></p>
              </div>
            )}
        </div>
      </div>
      
      <div className="conversation-input-area">
         <button
            className={c('button record-button', { primary: !isRecording, recording: isRecording })}
            onClick={handleRecord}
            disabled={isProcessing && !isRecording}
         >
            <span className="icon">mic</span>
            {isRecording ? 'Recording... (Click to Stop)' : 'Hold to Speak'}
        </button>
      </div>
    </div>
  );
}