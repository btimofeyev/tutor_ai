
// ===================================
// klioai-frontend/src/hooks/useSpeech.js
// ===================================
'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const utteranceRef = useRef(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Prefer child-friendly voices
      const preferredVoices = availableVoices.filter(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Female') || voice.name.includes('Child') || voice.name.includes('Samantha'))
      );
      setVoices(preferredVoices.length > 0 ? preferredVoices : availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text) => {
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice properties for child-friendly speech
    utterance.rate = 0.9; // Slightly slower for children
    utterance.pitch = 1.1; // Slightly higher pitch
    utterance.volume = 0.9;

    // Use a child-friendly voice if available
    if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    speak,
    stopSpeaking,
    isSpeaking
  };
}