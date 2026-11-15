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
 * - Fresh-instance auto-restart resilience (fixes Chrome dead instance bug on onend/silence)
 * - Auto-commit silence debounce (guarantees spoken phrases become permanent caption blocks)
 * - De-duplication guard against duplicate sentence commits
 * - Separate interim and finalized analyzed results
 * - Error handling for permissions, unsupported browsers, network
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
  const restartTimerRef = useRef(null);

  // Store latest callbacks in refs to avoid stale closures in event handlers
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  const languageRef = useRef(language);

  // Speech analysis, silence auto-commit and de-duplication refs
  const latestInterimRef = useRef("");
  const silenceTimerRef = useRef(null);
  const lastCommittedTextRef = useRef("");

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onInterimTranscriptRef.current = onInterimTranscript;
  }, [onInterimTranscript]);

  useEffect(() => {
    languageRef.current = language;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = language;
      } catch (e) {
        // ignore
      }
    }
  }, [language]);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        setError(
          "Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge."
        );
      }
    }
  }, []);

  // Web Audio Metering function to give visual feedback that mic is picking up sound
  const startAudioMeter = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      if (mediaStreamRef.current) return; // already active

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
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
        setIsSpeaking(normalized > 12);

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn("Audio meter setup notice:", err.message);
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

  // Commit analyzed interim speech into a permanent caption block
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
      const cleanComparable = analyzed.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Prevent committing the exact same sentence twice
      if (cleanComparable && cleanComparable !== lastCommittedTextRef.current) {
        lastCommittedTextRef.current = cleanComparable;

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
    }
  }, []);

  // Safely destroy the current recognition instance
  const destroyCurrentRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      r.onstart = null;
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try {
        r.abort();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Forward declare restart helper
  const restartRecognitionSessionRef = useRef(null);

  // Create a brand new SpeechRecognition instance (essential for Chrome's continuous session lifecycle)
  const createRecognitionInstance = useCallback(() => {
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
        const transcriptText = result[0]?.transcript || "";

        if (result.isFinal) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          latestInterimRef.current = "";

          const trimmed = transcriptText.trim();
          if (trimmed.length > 0) {
            const analyzed = analyzeAndFormatSpeech(trimmed);
            const cleanComparable = analyzed.toLowerCase().replace(/[^a-z0-9]/g, "");

            if (cleanComparable && cleanComparable !== lastCommittedTextRef.current) {
              lastCommittedTextRef.current = cleanComparable;

              const finalEntry = {
                text: analyzed,
                confidence: result[0]?.confidence || 0.95,
                timestamp: new Date().toISOString(),
                source: "SPEECH",
              };

              setFinalTranscripts((prev) => [...prev, finalEntry]);
              if (onFinalTranscriptRef.current) {
                onFinalTranscriptRef.current(finalEntry);
              }
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

      // Silence auto-commit debounce: if user speaks and pauses for 1.4s,
      // commit it as a permanent caption block so words are immediately captured!
      if (interim.trim().length > 0) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          commitInterimSegment();
        }, 1400);
      }
    };

    recognition.onerror = (event) => {
      console.warn("[SpeechRecognition] event error:", event.error);
      if (event.error === "not-allowed") {
        setError(
          "Microphone access was denied. Please allow microphone permissions in your browser address bar."
        );
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        destroyCurrentRecognition();
        stopAudioMeter();
      } else if (event.error === "network") {
        setError("Network connectivity issue interrupted speech recognition. Re-establishing...");
      } else if (event.error === "no-speech") {
        // Normal quiet period in Chrome; onend will automatically cycle cleanly
      } else if (event.error === "aborted") {
        // Normal when user stops or instance is recycled
      } else {
        setError(`Speech recognition notice: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Commit any lingering interim speech before instance closes
      if (latestInterimRef.current && latestInterimRef.current.trim().length > 0) {
        commitInterimSegment();
      }

      destroyCurrentRecognition();

      // If we should keep listening, spawn a fresh instance (fixes Chrome dead instance bug)
      if (shouldKeepListeningRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldKeepListeningRef.current && restartRecognitionSessionRef.current) {
            restartRecognitionSessionRef.current();
          }
        }, 100);
      } else {
        setIsListening(false);
        isListeningRef.current = false;
        setInterimText("");
        stopAudioMeter();
      }
    };

    return recognition;
  }, [commitInterimSegment, destroyCurrentRecognition, stopAudioMeter]);

  // Restart handler that always creates a FRESH SpeechRecognition object
  const startNewSession = useCallback(() => {
    if (!shouldKeepListeningRef.current) return;
    destroyCurrentRecognition();

    try {
      const freshRecognition = createRecognitionInstance();
      if (!freshRecognition) return;
      recognitionRef.current = freshRecognition;
      freshRecognition.start();
    } catch (err) {
      console.warn("[SpeechRecognition] Start exception, retrying:", err.message);
      if (shouldKeepListeningRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          startNewSession();
        }, 300);
      }
    }
  }, [createRecognitionInstance, destroyCurrentRecognition]);

  useEffect(() => {
    restartRecognitionSessionRef.current = startNewSession;
  }, [startNewSession]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Web Speech API is not supported on this browser.");
      return;
    }

    try {
      setError(null);
      shouldKeepListeningRef.current = true;

      // Ensure audio meter is active for real-time waveform
      startAudioMeter().catch(() => {});

      // Launch fresh recognition session
      startNewSession();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      setError(err.message || "Failed to start speech recognition");
    }
  }, [isSupported, startAudioMeter, startNewSession]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    // Commit any pending interim speech before stopping
    if (latestInterimRef.current && latestInterimRef.current.trim().length > 0) {
      commitInterimSegment();
    }

    destroyCurrentRecognition();
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText("");
    stopAudioMeter();
  }, [commitInterimSegment, destroyCurrentRecognition, stopAudioMeter]);

  const resetTranscripts = useCallback(() => {
    setFinalTranscripts([]);
    setInterimText("");
    latestInterimRef.current = "";
    lastCommittedTextRef.current = "";
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      destroyCurrentRecognition();
      stopAudioMeter();
    };
  }, [destroyCurrentRecognition, stopAudioMeter]);

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
