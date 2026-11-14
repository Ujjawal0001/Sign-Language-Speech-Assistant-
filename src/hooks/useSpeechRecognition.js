"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useSpeechRecognition - Custom hook for speech-to-text with Web Speech API
 * - Separate interim and final results
 * - Error handling for permissions, unsupported browsers, network
 * - Auto-restart resilience during active lecture sessions
 * - Web Audio API mic level meter (0-100)
 */
export function useSpeechRecognition({
  language = "en-IN",
  onFinalTranscript = null, // Callback when a final segment is ready
  onInterimTranscript = null, // Callback when interim words change
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState(null);
  const [interimText, setInterimText] = useState("");
  const [finalTranscripts, setFinalTranscripts] = useState([]);
  const [micLevel, setMicLevel] = useState(0); // 0 to 100

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        setError("Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      }
    }
  }, []);

  // Web Audio Metering function
  const startAudioMeter = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize roughly between 0 and 100
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(normalized);

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn("Audio meter setup warning:", err.message);
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicLevel(0);
  }, []);

  // Initialize SpeechRecognition instance
  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          const trimmed = transcriptText.trim();
          if (trimmed.length > 0) {
            const finalEntry = {
              text: trimmed,
              confidence: result[0].confidence || 0.95,
              timestamp: new Date().toISOString(),
              source: "SPEECH",
            };
            setFinalTranscripts((prev) => [...prev, finalEntry]);
            if (onFinalTranscript) {
              onFinalTranscript(finalEntry);
            }
          }
        } else {
          interim += transcriptText;
        }
      }

      setInterimText(interim);
      if (onInterimTranscript) {
        onInterimTranscript(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Please allow microphone permissions in your browser settings.");
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        stopAudioMeter();
      } else if (event.error === "network") {
        setError("Network connectivity issue interrupted speech recognition. Re-establishing connection...");
      } else if (event.error === "no-speech") {
        // Normal quiet period; do not stop listening
      } else {
        setError(`Speech recognition encountered an issue: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening (e.g. Chrome 60s silence timeout)
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // May throw if already starting; safely ignore
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        setInterimText("");
        stopAudioMeter();
      }
    };

    return recognition;
  }, [language, onFinalTranscript, onInterimTranscript, stopAudioMeter]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Web Speech API is not supported on this browser.");
      return;
    }

    try {
      setError(null);
      shouldKeepListeningRef.current = true;

      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }

      if (recognitionRef.current) {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
      }

      await startAudioMeter();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      // Already running is not an error
      if (err.message && !err.message.includes("already started")) {
        setError(err.message || "Failed to start speech recognition");
      }
    }
  }, [isSupported, language, initRecognition, startAudioMeter]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText("");
    stopAudioMeter();
  }, [stopAudioMeter]);

  const resetTranscripts = useCallback(() => {
    setFinalTranscripts([]);
    setInterimText("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopAudioMeter();
    };
  }, [stopAudioMeter]);

  return {
    isListening,
    isSupported,
    error,
    interimText,
    finalTranscripts,
    micLevel,
    startListening,
    stopListening,
    resetTranscripts,
    setFinalTranscripts,
  };
}
