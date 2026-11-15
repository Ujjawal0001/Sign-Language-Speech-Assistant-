// server.js - Unified Production Server for Render
// Serves Next.js frontend + APIs + Socket.IO on the same HTTP port (process.env.PORT)

// Sanitize runtime environment variables on cloud hosts
process.env.NODE_ENV = "production";
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1"))) {
  console.warn("[Server] Unsetting unreachable localhost DATABASE_URL in cloud environment. Falling back to SQLite.");
  delete process.env.DATABASE_URL;
}

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = false;
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[Server] Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Attach Socket.IO to the same HTTP server
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Track participants per room: { [roomId]: Set<socketId> }
  const roomParticipants = new Map();

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a live lecture / classroom room
    socket.on("join-lecture", ({ lectureId, userId, userName, role }) => {
      if (!lectureId) return;

      socket.join(lectureId);
      socket.data = { lectureId, userId, userName, role };

      if (!roomParticipants.has(lectureId)) {
        roomParticipants.set(lectureId, new Set());
      }
      roomParticipants.get(lectureId).add(socket.id);

      const count = roomParticipants.get(lectureId).size;
      console.log(`[Socket] User ${userName || socket.id} (${role}) joined ${lectureId}. Active: ${count}`);

      // Notify room of updated count
      io.to(lectureId).emit("participant-count", { count });

      // Notify room of joiner
      socket.to(lectureId).emit("user-joined", {
        userId,
        userName: userName || "A participant",
        role: role || "STUDENT",
      });
    });

    // Interim caption streaming
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

    // Lecture status change (LIVE, PAUSED, COMPLETED)
    socket.on("lecture-status-change", ({ lectureId, status }) => {
      if (!lectureId) return;
      io.to(lectureId).emit("lecture-status-change", { status });
    });

    // Leave lecture
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

  server.listen(port, hostname, () => {
    console.log(`====================================================`);
    console.log(`  AURALIS PRODUCTION SERVER RUNNING`);
    console.log(`  URL: http://${hostname}:${port}`);
    console.log(`  Next.js + Socket.IO Unified on Port ${port}`);
    console.log(`====================================================`);
  });
}).catch((err) => {
  console.error("[Fatal Server Error] Next.js prepare failed:", err);
  process.exit(1);
});
