/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useRef, useState, useEffect } from 'react';

/**
 * A reusable audio player component with play/pause, seek bar, and time display.
 * @param {{ audioBase64: string, audioMimeType: string }} props
 */
export default function UserAudioPlayer({ audioBase64, audioMimeType }) {
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