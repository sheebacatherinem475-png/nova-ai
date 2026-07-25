import { useState, useRef, useCallback } from 'react';
import { ApiClient } from '../lib/api';

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const playTTS = useCallback(async (text: string, voice: string = "en-US-JennyNeural", rate: string = "+0%") => {
    try {
      setError(null);
      
      // If we're already playing something, stop it
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsGenerating(true);

      const url = await ApiClient.generateTTS(text, voice, rate);
      
      // Store object URL to revoke later
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.onerror = () => {
        setError("Error playing audio");
        setIsPlaying(false);
      };

      await audio.play();
      setIsGenerating(false);
      setIsPlaying(true);
    } catch (err: unknown) {
      console.error("TTS generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate speech");
      setIsGenerating(false);
      setIsPlaying(false);
    }
  }, []);

  const pauseTTS = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const resumeTTS = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return {
    playTTS,
    pauseTTS,
    resumeTTS,
    stopTTS,
    isPlaying,
    isGenerating,
    error
  };
}
