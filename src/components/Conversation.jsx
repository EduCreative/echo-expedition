/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, useState } from 'react';
import useStore from '../lib/store';
import { goToDashboard, startRecording, stopRecording } from '../lib/actions';
import c from 'clsx';
import UserAudioPlayer from './UserAudioPlayer';

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