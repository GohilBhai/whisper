import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Community from "../models/CommunityModels/community.model.js";

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://192.168.29.213:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // 🔐 Socket Auth Middleware
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      console.log(
        "🔑 Token received in socket auth:",
        token ? "Present" : "Missing",
      );

      if (!token) return next(new Error("Authentication required"));

      // 🔥 Remove Bearer if present
      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded._id || decoded.id;

      console.log("✅ Socket authenticated for user:", socket.userId);
      next();
    } catch (err) {
      console.error("❌ JWT Socket Error:", err.message);
      next(new Error("Invalid token"));
    }
  });

  // 🔗 Socket connection
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.userId);

    // ========== JOIN COMMUNITY ROOM ==========
    socket.on("join-community", async (communityId) => {
      try {
        console.log(
          `👥 User ${socket.userId} joining community: ${communityId}`,
        );

        const community = await Community.findById(communityId);

        if (!community) {
          socket.emit("error", { message: "Community not found" });
          return;
        }

        const isAdmin = community.userId.toString() === socket.userId;
        const isMember = community.members.some(
          (id) => id.toString() === socket.userId,
        );

        // Block access if private and not member/admin
        if (community.visibility === "Private" && !isAdmin && !isMember) {
          socket.emit("error", {
            message: "Not authorized to access this community",
          });
          return;
        }

        // Join the room
        socket.join(communityId);
        console.log(
          `✅ User ${socket.userId} joined community room: ${communityId}`,
        );

        socket.emit("joined-community", {
          communityId,
          message: "Successfully joined community chat",
        });
      } catch (err) {
        console.error("❌ Join community error:", err);
        socket.emit("error", { message: "Failed to join community" });
      }
    });

    // ========== LEAVE COMMUNITY ROOM ==========
    socket.on("leave-community", (communityId) => {
      socket.leave(communityId);
      console.log(`👋 User ${socket.userId} left community: ${communityId}`);
    });

    // ========== DISCONNECT ==========
    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.userId);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export { initSocket, getIO };
