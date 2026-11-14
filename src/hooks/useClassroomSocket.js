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

  const activeRoomId = lectureId || (classroomId ? `class_${classroomId}` : null);

  useEffect(() => {
    if (!activeRoomId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    console.log(`[useClassroomSocket] Connecting to ${socketUrl} for room: ${activeRoomId}`);

    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
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
        userId: user?.id,
        userName: user?.name,
        role: user?.role || "STUDENT",
      });
    });

    socket.on("participant-count", ({ count }) => {
      setParticipantCount(count);
    });

    socket.on("caption-interim", (data) => {
      if (onInterimCaption) {
        onInterimCaption(data);
      }
    });

    socket.on("caption-final", (transcript) => {
      if (onFinalCaption) {
        onFinalCaption(transcript);
      }
    });

    socket.on("sign-detected", (data) => {
      if (onSignDetected) {
        onSignDetected(data);
      }
    });

    socket.on("lecture-status-change", (data) => {
      if (onLectureStatusChange) {
        onLectureStatusChange(data);
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
        socket.emit("leave-lecture", { lectureId: activeRoomId });
        socket.disconnect();
      }
    };
  }, [activeRoomId, user?.id, user?.name, user?.role, onInterimCaption, onFinalCaption, onSignDetected, onLectureStatusChange]);

  const sendInterimCaption = useCallback(
    (text, source = "SPEECH") => {
      if (socketRef.current && socketRef.current.connected && activeRoomId) {
        socketRef.current.emit("caption-interim", {
          lectureId: activeRoomId,
          text,
          source,
        });
      }
    },
    [activeRoomId]
  );

  const sendFinalCaption = useCallback(
    (transcript) => {
      if (socketRef.current && socketRef.current.connected && activeRoomId) {
        socketRef.current.emit("caption-final", {
          lectureId: activeRoomId,
          transcript,
        });
      }
    },
    [activeRoomId]
  );

  const sendSignGesture = useCallback(
    (gesture, confidence = 1.0) => {
      if (socketRef.current && socketRef.current.connected && activeRoomId) {
        socketRef.current.emit("sign-detected", {
          lectureId: activeRoomId,
          gesture,
          confidence,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [activeRoomId]
  );

  const updateLectureStatus = useCallback(
    (status) => {
      if (socketRef.current && socketRef.current.connected && activeRoomId) {
        socketRef.current.emit("lecture-status-change", {
          lectureId: activeRoomId,
          status,
        });
      }
    },
    [activeRoomId]
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
