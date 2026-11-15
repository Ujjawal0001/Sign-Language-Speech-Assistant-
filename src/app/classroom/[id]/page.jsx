"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Video, VideoOff } from "lucide-react";

import LiveHeader from "@/components/classroom/LiveHeader";
import CaptionView from "@/components/classroom/CaptionView";
import SidePanel from "@/components/classroom/SidePanel";
import TeacherControls from "@/components/classroom/TeacherControls";
import StudentControls from "@/components/classroom/StudentControls";

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useClassroomSocket } from "@/hooks/useClassroomSocket";
import { useGestureRecognition } from "@/hooks/useGestureRecognition";

export default function LiveClassroomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const classroomId = params?.id;
  const urlRole = searchParams.get("role");

  // User & Classroom State
  const [user, setUser] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Live Session State
  const [lectureStatus, setLectureStatus] = useState("SCHEDULED"); // SCHEDULED | LIVE | PAUSED | COMPLETED
  const [duration, setDuration] = useState(0);
  const [transcripts, setTranscripts] = useState([]);
  const [interimText, setInterimText] = useState("");
  const [activeSign, setActiveSign] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Accessibility & UX State
  const [fontSize, setFontSize] = useState("large"); // standard | large | xlarge
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Hydrate accessibility preferences from Student Dashboard & Instructor Settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem("auralis_student_accessibility");
      if (saved) {
        const pref = JSON.parse(saved);
        if (pref.fontSize) setFontSize(pref.fontSize);
        if (typeof pref.isHighContrast === "boolean") {
          setIsHighContrast(pref.isHighContrast);
          if (pref.isHighContrast) {
            document.documentElement.classList.add("high-contrast");
          } else {
            document.documentElement.classList.remove("high-contrast");
          }
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      const savedTeacher = localStorage.getItem("auralis_instructor_settings");
      if (savedTeacher) {
        const teacherPref = JSON.parse(savedTeacher);
        if (teacherPref.speechLanguage) setSpeechLanguage(teacherPref.speechLanguage);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // 1. Initial User & Classroom Authentication & Data Loading
  useEffect(() => {
    async function loadClassroomAndSession() {
      try {
        setIsLoading(true);
        setPageError(null);

        // Fetch user
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.push(`/login?redirect=/classroom/${classroomId}`);
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        // Fetch classroom details
        const classRes = await fetch(`/api/classrooms/${classroomId}`);
        if (!classRes.ok) {
          const classErr = await classRes.json();
          setPageError(classErr.error || "Failed to load classroom details");
          setIsLoading(false);
          return;
        }
        const classData = await classRes.json();
        setClassroom(classData.classroom);

        // Fetch active or most recent lecture for this classroom
        const lecRes = await fetch(`/api/lectures?classroomId=${classroomId}`);
        if (lecRes.ok) {
          const lecData = await lecRes.json();
          const active = lecData.lectures?.find((l) => l.status === "LIVE" || l.status === "SCHEDULED");
          if (active) {
            setCurrentLecture(active);
            setLectureStatus(active.status);

            // Hydrate past transcripts for this lecture
            const trRes = await fetch(`/api/lectures/${active.id}/transcripts`);
            if (trRes.ok) {
              const trData = await trRes.json();
              setTranscripts(trData.transcripts || []);
            }
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setPageError("Failed to initialize classroom workspace.");
      } finally {
        setIsLoading(false);
      }
    }

    if (classroomId) {
      loadClassroomAndSession();
    }
  }, [classroomId, router]);

  // Duration Timer
  useEffect(() => {
    let interval = null;
    if (lectureStatus === "LIVE") {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lectureStatus]);

  // Socket callbacks
  const handleSocketInterimCaption = useCallback((data) => {
    setInterimText(data.text);
  }, []);

  const handleSocketFinalCaption = useCallback((incomingTranscript) => {
    setTranscripts((prev) => {
      // Avoid duplicates
      if (prev.some((t) => t.id === incomingTranscript.id)) return prev;
      return [...prev, incomingTranscript];
    });
    setInterimText("");
  }, []);

  const handleSocketSignDetected = useCallback((data) => {
    setActiveSign(data);
    setTimeout(() => {
      setActiveSign((cur) => (cur?.timestamp === data.timestamp ? null : cur));
    }, 4000);
  }, []);

  const handleSocketLectureStatusChange = useCallback(({ status }) => {
    setLectureStatus(status);
  }, []);

  // Initialize Socket connection
  const {
    connectionStatus,
    participantCount,
    sendInterimCaption,
    sendFinalCaption,
    sendSignGesture,
    updateLectureStatus,
  } = useClassroomSocket({
    classroomId,
    lectureId: currentLecture?.id,
    user,
    onInterimCaption: handleSocketInterimCaption,
    onFinalCaption: handleSocketFinalCaption,
    onSignDetected: handleSocketSignDetected,
    onLectureStatusChange: handleSocketLectureStatusChange,
  });

  // Speech Recognition Final Transcript Handler
  const handleFinalTranscript = useCallback(
    async (finalEntry) => {
      if (!currentLecture?.id) return;

      try {
        // 1. Persist to SQLite/Postgres DB
        const res = await fetch("/api/transcripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lectureId: currentLecture.id,
            text: finalEntry.text,
            source: finalEntry.source || "SPEECH",
            confidence: finalEntry.confidence || 0.95,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // 2. Broadcast via Socket.IO
          sendFinalCaption(data.transcript);
        }
      } catch (err) {
        console.error("Failed to persist final transcript segment:", err);
      }
    },
    [currentLecture?.id, sendFinalCaption]
  );

  // Speech Recognition Interim Transcript Handler
  const handleInterimTranscript = useCallback(
    (interim) => {
      sendInterimCaption(interim, "SPEECH");
    },
    [sendInterimCaption]
  );

  // Initialize Web Speech Hook
  const {
    isListening,
    micLevel,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language: speechLanguage,
    onFinalTranscript: handleFinalTranscript,
    onInterimTranscript: handleInterimTranscript,
  });

  // Computer Vision Gesture Detected Handler
  const handleGestureDetected = useCallback(
    async (stabilized) => {
      const signLabel = stabilized.label || stabilized.gesture;

      // 1. Show local sign alert toast
      setActiveSign({
        gesture: signLabel,
        confidence: stabilized.confidence,
        timestamp: stabilized.timestamp,
      });

      // Clear toast after 4s
      setTimeout(() => {
        setActiveSign((cur) => (cur?.timestamp === stabilized.timestamp ? null : cur));
      }, 4000);

      // 2. Broadcast to room via Socket.IO
      sendSignGesture(signLabel, stabilized.confidence);

      // 3. If lecture is live, persist as transcript and broadcast caption block
      if (currentLecture?.id) {
        try {
          const res = await fetch("/api/transcripts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lectureId: currentLecture.id,
              text: `[SIGN] ${signLabel}`,
              source: "SIGN_LANGUAGE",
              confidence: stabilized.confidence || 0.95,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            sendFinalCaption(data.transcript);
          }
        } catch (err) {
          console.error("Failed to persist sign transcript:", err);
        }
      }
    },
    [currentLecture?.id, sendSignGesture, sendFinalCaption]
  );

  // Initialize Computer Vision Gesture Recognition Hook
  const {
    isModelLoading: isGestureLoading,
    isModelReady: isGestureReady,
    activeGesture,
  } = useGestureRecognition({
    videoRef,
    canvasRef,
    onGestureDetected: handleGestureDetected,
    enabled: isCameraActive,
  });

  // Start Camera Feed safely
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera is not supported on this device/browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setIsCameraActive(true);

      // Attach stream to video DOM element
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn("Video play exception:", e));
        }
      });
    } catch (err) {
      console.warn("Camera start exception:", err);
      alert("Camera access was not granted or camera is occupied by another app: " + err.message);
    }
  };

  // Stop Camera Feed safely
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Toggle Camera Feed (for Sign Gesture capture)
  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Ensure stream stays attached whenever video element is rendered or re-mounted
  useEffect(() => {
    if (isCameraActive && cameraStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isCameraActive]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Teacher Action: Start Live Lecture
  const handleStartLecture = async () => {
    try {
      setIsActionLoading(true);

      const res = await fetch("/api/lectures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId,
          title: `${classroom?.name} Live Session`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to start lecture");
        setIsActionLoading(false);
        return;
      }

      setCurrentLecture(data.lecture);
      setLectureStatus("LIVE");
      setTranscripts([]);
      updateLectureStatus("LIVE");

      // Auto start speech recognition & sign gesture camera
      await startListening();
      if (!isCameraActive) {
        startCamera().catch(() => {});
      }
    } catch (err) {
      console.error("Start lecture error:", err);
      alert("Error starting lecture session");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Teacher Action: Pause / Resume Speech Recognition
  const handlePauseResumeRecognition = () => {
    if (isListening) {
      stopListening();
      setLectureStatus("PAUSED");
      updateLectureStatus("PAUSED");
    } else {
      startListening();
      setLectureStatus("LIVE");
      updateLectureStatus("LIVE");
    }
  };

  // Teacher Action: Conclude Lecture
  const handleEndLecture = async () => {
    if (!currentLecture?.id) return;
    try {
      setIsActionLoading(true);
      stopListening();

      const res = await fetch(`/api/lectures/${currentLecture.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (res.ok) {
        setLectureStatus("COMPLETED");
        updateLectureStatus("COMPLETED");
      }
    } catch (err) {
      console.error("Failed to conclude lecture:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter transcripts by search query if user searches
  const filteredTranscripts = searchQuery.trim()
    ? transcripts.filter((t) =>
        t.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcripts;

  const isTeacher = user?.role === "TEACHER" || classroom?.teacherId === user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-auralis-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-auralis-accent" />
          <span className="text-xs font-semibold text-auralis-muted uppercase tracking-wider">
            Entering Accessible Classroom Workspace...
          </span>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-auralis-bg p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-auralis-border p-8 text-center space-y-4 shadow-float">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-xl text-auralis-text">
              Unable to Join Classroom
            </h2>
            <p className="text-xs text-auralis-muted mt-1 leading-relaxed">
              {pageError}
            </p>
          </div>
          <button
            onClick={() => router.push(user?.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard")}
            className="w-full py-2.5 rounded-xl bg-auralis-accent text-white text-xs font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isHighContrast ? "bg-[#0B0F0E]" : "bg-auralis-bg"
      }`}
    >
      {/* 1. TOP SECTION */}
      <LiveHeader
        classroom={classroom}
        teacherName={classroom?.teacher?.name}
        lectureStatus={lectureStatus}
        duration={duration}
        participantCount={participantCount}
        isHighContrast={isHighContrast}
        toggleHighContrast={() => setIsHighContrast(!isHighContrast)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        userRole={user?.role}
      />

      {/* Camera Video & Hand Landmark Skeleton Overlay (When gesture camera is enabled) */}
      {isCameraActive && (
        <div className="fixed bottom-6 right-6 z-40 w-72 h-56 bg-black rounded-2xl overflow-hidden shadow-float border-2 border-auralis-accent flex flex-col">
          <div className="relative flex-1 w-full h-full">
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                  el.srcObject = cameraStreamRef.current;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
            />
          </div>

          {/* Top Status & Live Gesture Detected Badge */}
          <div className="absolute top-2 left-2 right-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-[10px] font-mono text-white border border-white/20 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeGesture?.isSign
                  ? "bg-amber-400 animate-ping"
                  : isGestureReady
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-blue-400 animate-spin"
              }`}
            />
            <span className="truncate">
              {isGestureLoading
                ? "Loading CV Model..."
                : activeGesture?.isSign
                ? `${activeGesture.label} (${Math.round(activeGesture.confidence * 100)}%)`
                : "Tracking Hand (ISL Active)"}
            </span>
          </div>

          <button
            onClick={toggleCamera}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90 text-xs border border-white/20"
            title="Close Camera"
          >
            <VideoOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
        {/* Role Controls Bar */}
        {isTeacher ? (
          <TeacherControls
            lectureStatus={lectureStatus}
            isListening={isListening}
            isHighContrast={isHighContrast}
            language={speechLanguage}
            setLanguage={setSpeechLanguage}
            onStartLecture={handleStartLecture}
            onPauseResumeRecognition={handlePauseResumeRecognition}
            onEndLecture={handleEndLecture}
            speechError={speechError}
            isActionLoading={isActionLoading}
            isCameraActive={isCameraActive}
            onToggleCamera={toggleCamera}
          />
        ) : (
          <StudentControls
            fontSize={fontSize}
            setFontSize={setFontSize}
            isHighContrast={isHighContrast}
            toggleHighContrast={() => setIsHighContrast(!isHighContrast)}
            isCameraActive={isCameraActive}
            onToggleCamera={toggleCamera}
          />
        )}

        {/* 2. MAIN CAPTION VIEWPORT & 3. SIDE PANEL */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch min-h-[500px]">
          <CaptionView
            transcripts={filteredTranscripts}
            interimText={interimText}
            activeSign={activeSign}
            isListening={isListening}
            isHighContrast={isHighContrast}
            fontSize={fontSize}
            lectureStatus={lectureStatus}
          />

          <SidePanel
            isHighContrast={isHighContrast}
            isListening={isListening}
            micLevel={micLevel}
            language={speechLanguage}
            setLanguage={setSpeechLanguage}
            isCameraActive={isCameraActive}
            onToggleCamera={toggleCamera}
            connectionStatus={connectionStatus}
            participantCount={participantCount}
            transcripts={transcripts}
            onSearchChange={setSearchQuery}
            classroomTitle={classroom?.name}
            userRole={user?.role}
          />
        </div>
      </div>
    </div>
  );
}
