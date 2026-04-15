'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

// New type for verse timings
interface VerseTiming {
  verse_key: string; // e.g., "1:1"
  timestamp_from: number;
  timestamp_to: number;
}

interface PlaybackItem {
  id: string;
  title: string;
  audioUrl?: string;
  textToSpeak?: string; // For douas
  // For Surah playback
  surahNumber?: number;
}

interface AudioContextType {
  isPlaying: boolean;
  isBuffering: boolean;
  currentItem: PlaybackItem | null;
  activeVerseKey: string | null; // e.g., "1:1"
  currentTime: number;
  duration: number;
  playItem: (item: PlaybackItem) => void;
  playSurah: (surahNumber: number, surahName: string) => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Using 'abdullah_basfar' as per user request for testing.
const RECITER = 'abdullah_basfar';
// Using Reciter ID 7 (Mishary) for timings, as it's a common one and might be close enough.
const TIMINGS_RECITER_ID = 7;

export const AudioProvider = ({ children }: { children: ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentItem, setCurrentItem] = useState<PlaybackItem | null>(null);
  const [activeVerseKey, setActiveVerseKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationFrameRef = useRef<number>();
  const timestampsRef = useRef<VerseTiming[]>([]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Detach source
      audioRef.current = null;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentItem(null);
    setActiveVerseKey(null);
    setCurrentTime(0);
    setDuration(0);
    timestampsRef.current = [];
  }, []);

  const handlePlaybackEnd = useCallback(() => {
    stop();
  }, [stop]);

  // Main effect to handle playback when `currentItem` changes
  useEffect(() => {
    stop(); // Clean up previous playback on item change

    if (!currentItem) return;

    // --- SURAH PLAYBACK LOGIC ---
    if (currentItem.surahNumber) {
      const fetchAndPlaySurah = async () => {
        setIsBuffering(true);
        
        try {
            // 1. Construct the new audio URL
            const surahIdPadded = String(currentItem.surahNumber).padStart(3, '0');
            const audioUrl = `https://download.quranicaudio.com/quran/${RECITER}/${surahIdPadded}.mp3`;

            // 2. Fetch verse timings for text synchronization
            try {
                const timingsResponse = await fetch(`https://api.quran.com/api/v4/quran/verses/by_chapter/${currentItem.surahNumber}?words=false&mushaf=1&recitation=${TIMINGS_RECITER_ID}&timing=true`);
                if (!timingsResponse.ok) throw new Error('Failed to fetch verse timings.');
                const timingsData = await timingsResponse.json();
                timestampsRef.current = timingsData.verses.map((v: any) => v.timestamps).flat();
            } catch (timingsError) {
                console.warn('Could not fetch timings for text synchronization.', timingsError);
                timestampsRef.current = []; // Proceed without sync
            }

            // 3. Setup and play audio
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            const animate = () => {
                if (!audioRef.current || audioRef.current.paused) return;
                
                const now = audioRef.current.currentTime;
                setCurrentTime(now);

                // Find active verse if timestamps are available
                if (timestampsRef.current.length > 0) {
                    const activeVerse = timestampsRef.current.find(t => (now * 1000) >= t.timestamp_from && (now * 1000) < t.timestamp_to);
                    if (activeVerse && activeVerse.verse_key !== activeVerseKey) {
                        setActiveVerseKey(activeVerse.verse_key);
                    }
                }
                animationFrameRef.current = requestAnimationFrame(animate);
            };

            const handleCanPlay = () => {
                if (!audioRef.current) return;
                setDuration(audioRef.current.duration);
                setIsBuffering(false);
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                    animationFrameRef.current = requestAnimationFrame(animate);
                }).catch(e => {
                    console.error("Audio playback failed", e);
                    stop();
                });
            };

            const handleError = (e: Event) => {
                console.error(`CRITICAL: Error loading audio from ${audioUrl}. The file may not exist (404) or there is a network issue.`, e);
                stop();
            };
            
            const handleDurationChange = () => {
                if (audioRef.current && audioRef.current.duration > 0 && duration !== audioRef.current.duration) {
                    setDuration(audioRef.current.duration);
                }
            };

            audio.addEventListener('canplaythrough', handleCanPlay);
            audio.addEventListener('error', handleError);
            audio.addEventListener('ended', handlePlaybackEnd);
            audio.addEventListener('durationchange', handleDurationChange);

        } catch (error) {
            console.error("Error setting up surah playback:", error);
            stop();
        }
      };
      
      fetchAndPlaySurah();
    } 
    // --- REGULAR URL PLAYBACK LOGIC (e.g., old Douas) ---
    else if (currentItem.audioUrl) {
      const audio = new Audio(currentItem.audioUrl);
      audioRef.current = audio;
      
      const setAudioData = () => setDuration(audio.duration);
      const animate = () => {
          if(audio.paused) return;
          setCurrentTime(audio.currentTime);
          animationFrameRef.current = requestAnimationFrame(animate);
      };

      audio.addEventListener('loadedmetadata', setAudioData);
      audio.addEventListener('ended', handlePlaybackEnd);
      audio.play().then(() => {
          setIsPlaying(true);
          animationFrameRef.current = requestAnimationFrame(animate);
      }).catch(e => { console.error("Audio playback failed", e); stop(); });
    } 
    // --- TTS PLAYBACK LOGIC (Douas) ---
    else if (currentItem.textToSpeak) {
      const utterance = new SpeechSynthesisUtterance(currentItem.textToSpeak);
      const arabicVoice = window.speechSynthesis.getVoices().find(voice => voice.lang === 'ar-SA');
      if (arabicVoice) utterance.voice = arabicVoice;
      utterance.rate = 0.9;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = handlePlaybackEnd;
      window.speechSynthesis.speak(utterance);
      ttsUtteranceRef.current = utterance;
    }

    return () => {
      // The `stop()` at the beginning of the effect handles cleanup.
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem]);


  const playItem = (item: PlaybackItem) => {
    if (currentItem?.id === item.id) {
      togglePlayPause();
    } else {
      setCurrentItem(item);
    }
  };

  const playSurah = (surahNumber: number, surahName: string) => {
    const surahPlaybackItem: PlaybackItem = {
      id: `surah-${surahNumber}`,
      title: surahName,
      surahNumber: surahNumber,
    };

    if (currentItem?.id === surahPlaybackItem.id) {
        togglePlayPause();
    } else {
        setCurrentItem(surahPlaybackItem);
    }
  };

  const togglePlayPause = () => {
    if (!currentItem) return;
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused === false) window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) audioRef.current.play();
      if (ttsUtteranceRef.current && window.speechSynthesis.paused) window.speechSynthesis.resume();
      setIsPlaying(true);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = Math.max(0, Math.min(time, duration));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <AudioContext.Provider value={{ isPlaying, isBuffering, currentItem, activeVerseKey, currentTime, duration, playItem, playSurah, togglePlayPause, seek, stop }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
