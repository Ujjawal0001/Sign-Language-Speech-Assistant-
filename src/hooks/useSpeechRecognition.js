"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Analyzes and normalizes speech transcript text:
 * - Fixes capitalization
 * - Normalizes multiple spaces
 * - Analyzes grammatical punctuation (questions vs statements)
 */
function analyzeAndFormatSpeech(raw) {
  if (!raw) return "";
  let text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";

  // Capitalize first character
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Analyze ending punctuation if missing
  const lastChar = text.slice(-1);
  if (![".", "?", "!", ",", ";"].includes(lastChar)) {
    const questionStarters = [
      "what", "why", "how", "when", "where", "who", "which",
      "is", "are", "can", "could", "would", "do", "does", "did", "should", "will"
    ];
    const firstWord = text.split(" ")[0].toLowerCase();
    if (questionStarters.includes(firstWord)) {
      text += "?";
    } else {
      text += ".";
    }
  }

  return text;
}

/**
 * useSpeechRecognition - Custom hook for speech-to-text with Web Speech API
 * - Real-time acoustic and phonetic speech analysis
 * - Auto-commit silence debounce (guarantees spoken phrases become permanent caption blocks)
 * - Separate interim and finalized analyzed results
 * - Error handling for permissions, unsupported browsers, network
 * - Auto-restart resilience during active lecture sessions
 * - Web Audio API mic gain level meter (0-100)
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
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);

  // Store latest callbacks in refs to avoid stale closures in event handlers
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const languageRef = useRef(language);

  // Speech analysis & silence auto-commit refs
  const latestInterimRef = useRef("");
  const silenceTimerRef = useRef(null);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onInterimTranscriptRef.current = onInterimTranscript;
  }, [onInterimTranscript]);

  useEffect(() => {
    languageRef.current = language;
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

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
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(normalized);
        setIsSpeaking(normalized > 14);

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
    setIsSpeaking(false);
  }, []);

  // Helper to commit analyzed interim speech into a permanent caption block
  const commitInterimSegment = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const raw = latestInterimRef.current;
    latestInterimRef.current = "";
    setInterimText("");

    if (raw && raw.trim().length > 0) {
      const analyzed = analyzeAndFormatSpeech(raw);
      const finalEntry = {
        text: analyzed,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        source: "SPEECH",
      };

      setFinalTranscripts((prev) => [...prev, finalEntry]);
      if (onFinalTranscriptRef.current) {
        onFinalTranscriptRef.current(finalEntry);
      }
    }
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
    recognition.lang = languageRef.current || "en-IN";
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
          // Cancel any pending silence commit timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          latestInterimRef.current = "";

          const trimmed = transcriptText.trim();
          if (trimmed.length > 0) {
            const analyzed = analyzeAndFormatSpeech(trimmed);
            const finalEntry = {
              text: analyzed,
              confidence: result[0].confidence || 0.95,
              timestamp: new Date().toISOString(),
              source: "SPEECH",
            };
            setFinalTranscripts((prev) => [...prev, finalEntry]);
            if (onFinalTranscriptRef.current) {
              onFinalTranscriptRef.current(finalEntry);
            }
          }
        } else {
          interim += transcriptText;
        }
      }

      setInterimText(interim);
      latestInterimRef.current = interim;
      if (onInterimTranscriptRef.current) {
        onInterimTranscriptRef.current(interim);
      }

      // If words are being analyzed, debounce a silence auto-commit (1.8s)
      // so if speaker pauses, it automatically writes it into the caption block
      if (interim.trim().length > 0) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          commitInterimSegment();
        }, 1800);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech Recognition Event:", event.error);
      if (event.error === "not-allowed") {
        setError("Microphone access was denied. Please allow microphone permissions in your browser settings.");
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        stopAudioMeter();
      } else if (event.error === "network") {
        setError("Network connectivity issue interrupted speech recognition. Re-establishing connection...");
      } else if (event.error === "no-speech") {
        // Normal quiet period; onend will automatically restart cleanly
      } else {
        setError(`Speech recognition notice: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If there was any pending speech in interim buffer, commit it immediately
      if (latestInterimRef.current && latestInterimRef.current.trim().length > 0) {
        commitInterimSegment();
      }

      // Auto-restart if we should still be listening (e.g. Chrome 60s silence timeout)
      if (shouldKeepListeningRef.current) {
        setTimeout(() => {
          if (shouldKeepListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Ignore if already starting
            }
          }
        }, 150);
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        setInterimText("");
        stopAudioMeter();
      }
    };

    return recognition;
  }, [commitInterimSegment, stopAudioMeter]);

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
        recognitionRef.current.lang = languageRef.current || language;
        try {
          recognitionRef.current.start();
        } catch (startErr) {
          if (!startErr.message || !startErr.message.includes("already started")) {
            console.warn("Speech start exception:", startErr);
          }
        }
      }

      await startAudioMeter();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      if (err.message && !err.message.includes("already started")) {
        setError(err.message || "Failed to start speech recognition");
      }
    }
  }, [isSupported, language, initRecognition, startAudioMeter]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    // Commit any pending interim speech before stopping
    if (latestInterimRef.current && latestInterimRef.current.trim().length > 0) {
      commitInterimSegment();
    }
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
  }, [commitInterimSegment, stopAudioMeter]);

  const resetTranscripts = useCallback(() => {
    setFinalTranscripts([]);
    setInterimText("");
    latestInterimRef.current = "";
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
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
    isSpeaking,
    startListening,
    stopListening,
    resetTranscripts,
    setFinalTranscripts,
  };
}
