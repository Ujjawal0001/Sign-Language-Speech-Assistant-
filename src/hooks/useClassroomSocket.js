"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useClassroomSocket({
  classroomId,
  lectureId,
  user,
  onInterimCaption,
  onFinalCaption,
  onSignDetected,
  onLectureStatusChange,
}) {
  const socketRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING"); // CONNECTING | CONNECTED | OFFLINE | ERROR
  const [participantCount, setParticipantCount] = useState(1);

  // Store callbacks in refs to avoid reconnecting socket on parent state changes
  const onInterimCaptionRef = useRef(onInterimCaption);
  const onFinalCaptionRef = useRef(onFinalCaption);
  const onSignDetectedRef = useRef(onSignDetected);
  const onLectureStatusChangeRef = useRef(onLectureStatusChange);

  useEffect(() => {
    onInterimCaptionRef.current = onInterimCaption;
  }, [onInterimCaption]);

  useEffect(() => {
    onFinalCaptionRef.current = onFinalCaption;
  }, [onFinalCaption]);

  useEffect(() => {
    onSignDetectedRef.current = onSignDetected;
  }, [onSignDetected]);

  useEffect(() => {
    onLectureStatusChangeRef.current = onLectureStatusChange;
  }, [onLectureStatusChange]);

  const activeRoomId = lectureId || (classroomId ? `class_${classroomId}` : null);

  useEffect(() => {
    if (!activeRoomId && !classroomId) return;

    // Resolve socket URL safely
    let socketUrl = null;
    if (typeof window !== "undefined") {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isLocal) {
        // In cloud deployment (Render, Vercel, HTTPS), ALWAYS use the current origin
        socketUrl = window.location.origin;
      } else {
        // In local development, prefer current origin if using unified server (port 3000), or env
        socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      }
    } else {
      socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    }

    console.log(`[useClassroomSocket] Connecting to ${socketUrl} for room: ${activeRoomId}`);

    const socket = io(socketUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("CONNECTED");
      console.log(`[useClassroomSocket] Connected as socket ID: ${socket.id}`);

      socket.emit("join-lecture", {
        lectureId: activeRoomId,
        classroomId: classroomId,
        userId: user?.id,
        userName: user?.name,
        role: user?.role || "STUDENT",
      });
    });

    socket.on("participant-count", ({ count }) => {
      setParticipantCount(count);
    });

    socket.on("caption-interim", (data) => {
      if (onInterimCaptionRef.current) {
        onInterimCaptionRef.current(data);
      }
    });

    socket.on("caption-final", (transcript) => {
      if (onFinalCaptionRef.current) {
        onFinalCaptionRef.current(transcript);
      }
    });

    socket.on("sign-detected", (data) => {
      if (onSignDetectedRef.current) {
        onSignDetectedRef.current(data);
      }
    });

    socket.on("lecture-status-change", (data) => {
      if (onLectureStatusChangeRef.current) {
        onLectureStatusChangeRef.current(data);
      }
    });

    socket.on("connect_error", (err) => {
      console.warn("[useClassroomSocket] Connection error:", err.message);
      setConnectionStatus("OFFLINE");
    });

    socket.on("disconnect", (reason) => {
      console.log("[useClassroomSocket] Disconnected:", reason);
      setConnectionStatus("OFFLINE");
    });

    return () => {
      if (socket) {
        socket.emit("leave-lecture", { lectureId: activeRoomId, classroomId });
        socket.disconnect();
      }
    };
  }, [activeRoomId, classroomId, user?.id, user?.name, user?.role]);

  const sendInterimCaption = useCallback(
    (text, source = "SPEECH") => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("caption-interim", {
          lectureId: activeRoomId,
          classroomId,
          text,
          source,
        });
      }
    },
    [activeRoomId, classroomId]
  );

  const sendFinalCaption = useCallback(
    (transcript) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("caption-final", {
          lectureId: activeRoomId,
          classroomId,
          transcript,
        });
      }
    },
    [activeRoomId, classroomId]
  );

  const sendSignGesture = useCallback(
    (gesture, confidence = 1.0) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("sign-detected", {
          lectureId: activeRoomId,
          classroomId,
          gesture,
          confidence,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [activeRoomId, classroomId]
  );

  const updateLectureStatus = useCallback(
    (status) => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("lecture-status-change", {
          lectureId: activeRoomId,
          classroomId,
          status,
        });
      }
    },
    [activeRoomId, classroomId]
  );

  return {
    connectionStatus,
    participantCount,
    sendInterimCaption,
    sendFinalCaption,
    sendSignGesture,
    updateLectureStatus,
  };
}
