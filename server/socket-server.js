const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.SOCKET_PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "Auralis Realtime Socket Server" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track participants per room: { [roomId]: Set<socketId> }
const roomParticipants = new Map();

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Join a live lecture room
  socket.on("join-lecture", ({ lectureId, userId, userName, role }) => {
    if (!lectureId) return;

    socket.join(lectureId);
    socket.data = { lectureId, userId, userName, role };

    if (!roomParticipants.has(lectureId)) {
      roomParticipants.set(lectureId, new Set());
    }
    roomParticipants.get(lectureId).add(socket.id);

    const count = roomParticipants.get(lectureId).size;
    console.log(`[Socket] User ${userName || socket.id} (${role}) joined lecture ${lectureId}. Active members: ${count}`);

    // Notify room of participant count
    io.to(lectureId).emit("participant-count", { count });

    // Notify room of new joiner
    socket.to(lectureId).emit("user-joined", {
      userId,
      userName: userName || "A participant",
      role: role || "STUDENT",
    });
  });

  // Interim caption streaming (teacher to students)
  socket.on("caption-interim", ({ lectureId, text, source }) => {
    if (!lectureId) return;
    socket.to(lectureId).emit("caption-interim", {
      text,
      source: source || "SPEECH",
    });
  });

  // Final caption segment (speech or gesture)
  socket.on("caption-final", ({ lectureId, transcript }) => {
    if (!lectureId || !transcript) return;
    // Broadcast to everyone in the room (including sender for acknowledgment confirmation)
    io.to(lectureId).emit("caption-final", transcript);
  });

  // Sign Language Gesture detected
  socket.on("sign-detected", ({ lectureId, gesture, confidence, timestamp }) => {
    if (!lectureId || !gesture) return;
    io.to(lectureId).emit("sign-detected", {
      gesture,
      confidence: confidence || 1.0,
      timestamp: timestamp || new Date().toISOString(),
    });
  });

  // Lecture status changes (LIVE, PAUSED, COMPLETED)
  socket.on("lecture-status-change", ({ lectureId, status }) => {
    if (!lectureId) return;
    io.to(lectureId).emit("lecture-status-change", { status });
  });

  // Leave lecture room
  socket.on("leave-lecture", ({ lectureId }) => {
    handleLeave(socket, lectureId);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.data && socket.data.lectureId) {
      handleLeave(socket, socket.data.lectureId);
    }
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

function handleLeave(socket, lectureId) {
  socket.leave(lectureId);
  if (roomParticipants.has(lectureId)) {
    const set = roomParticipants.get(lectureId);
    set.delete(socket.id);
    const count = set.size;
    if (count === 0) {
      roomParticipants.delete(lectureId);
    } else {
      io.to(lectureId).emit("participant-count", { count });
    }
  }
}

server.listen(PORT, () => {
  console.log(`[Auralis] Socket.IO Server running on http://localhost:${PORT}`);
});
