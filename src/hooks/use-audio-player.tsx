'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Define the shape of the object passed to the toggle function
interface PlaybackItem {
  id: string; // Unique identifier for the item (e.g., dua.id)
  audioUrl?: string;
  text: string; // The text to synthesize if no audioUrl
}

interface AudioPlayerState {
  activeId: string | null;
  isPlaying: boolean;
  toggle: (item: PlaybackItem) => void;
  pause: () => void; // Keep pause for potential external controls
}

export const useAudioPlayer = (): AudioPlayerState => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices available on the system
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    // Voices are loaded asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // Initial call

    // Cleanup
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      // Ensure any ongoing speech is stopped when the component unmounts
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);


  const stopPlayback = useCallback(() => {
    // Stop HTML audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Detach source
      audioRef.current = null;
    }
    // Stop speech synthesis
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveId(null);
    utteranceRef.current = null;
  }, []);

  const toggle = useCallback((item: PlaybackItem) => {
    // If toggling the currently playing item, stop it.
    if (isPlaying && activeId === item.id) {
      stopPlayback();
      return;
    }

    // Stop any current playback before starting a new one
    stopPlayback();
    
    // Set the new active item
    setActiveId(item.id);

    // --- URL Playback Logic ---
    if (item.audioUrl) {
      const newAudio = new Audio(item.audioUrl);
      audioRef.current = newAudio;

      newAudio.onplay = () => setIsPlaying(true);
      newAudio.onended = () => stopPlayback();
      newAudio.onerror = () => {
        console.error("Error playing audio source:", item.audioUrl);
        stopPlayback();
      };
      
      newAudio.play().catch(e => {
        console.error("Audio play failed:", e);
        stopPlayback();
      });
    } 
    // --- Text-to-Speech Playback Logic ---
    else if (item.text) {
        const utterance = new SpeechSynthesisUtterance(item.text);
        utteranceRef.current = utterance;

        // Find a suitable voice
        const arabicVoice = voices.find(voice => voice.lang === 'ar-SA');
        if (arabicVoice) {
            utterance.voice = arabicVoice;
        } else {
            console.warn("ar-SA voice not found, using default.");
        }

        utterance.rate = 0.9; // Slightly slower rate

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => stopPlayback();
        utterance.onerror = (e) => {
            console.error("Speech synthesis error:", e);
            stopPlayback();
        };

        window.speechSynthesis.speak(utterance);
    }
  }, [isPlaying, activeId, stopPlayback, voices]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause(); // Note: pause() might not be as reliable as cancel()
    }
    setIsPlaying(false);
  }, []);
  
  // Make sure to clean up on unmount
  useEffect(() => {
      return () => {
          stopPlayback();
      }
  }, [stopPlayback]);


  return { activeId, isPlaying, toggle, pause };
};
