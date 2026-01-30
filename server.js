// import http from "http";
// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import colors from "colors";
// import connectDB from "./Database/db.js";
// import route from "./routes/route.js";
// import { initSocket } from "./socket/socket.js";
// import { setupDirectChatSocket } from "./socket/directChatSocket.js";
// import { Server } from "socket.io";

// // dotenv configure
// dotenv.config();

// // Database
// connectDB();

// // PORT
// const PORT = process.env.PORT || 8080;

// const app = express();
// const server = http.createServer(app);

// // Socket.IO setup
// const io = new Server(server, {
//   cors: {
//     origin: "http://192.168.29.213:5173", // Your frontend URL
//     credentials: true,
//   },
// });

// // ✅ Initialize Socket.io FIRST before routes
// initSocket(server);
// setupDirectChatSocket(io);

// // Middleware
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://192.168.29.213:5173",
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     credentials: true,
//   }),
// );
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use("/api/auth", route);

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Route not found",
//   });
// });

// // Error handler
// app.use((err, req, res, next) => {
//   console.error("Server Error:", err);
//   res.status(500).json({
//     success: false,
//     message: "Internal server error",
//     error: process.env.NODE_ENV === "development" ? err.message : undefined,
//   });
// });

// // ==================== START SERVER ====================
// server.listen(PORT, () => {
//   console.log(`Server Running on PORT ${PORT}`.bold.bgCyan);
//   console.log(`Socket.IO initialized and ready`.bold.bgGreen);
// });

// export default app;
// export { io };

/////////////////////////////////

import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import colors from "colors";
import { Server } from "socket.io";
import connectDB from "./Database/db.js";
import route from "./routes/route.js";
import { initSocket } from "./socket/socket.js";
import { setupDirectChatSocket } from "./socket/directChatSocket.js";

// dotenv configure
dotenv.config();

// Database
connectDB();

// PORT
const PORT = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);

// Socket.IO setup - Single instance for both community and direct chat
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://192.168.29.213:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Initialize both socket handlers with the same io instance
initSocket(server, io); // Pass io to community socket
setupDirectChatSocket(io); // Pass io to direct chat socket

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://192.168.29.213:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", route);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`.bold.bgCyan);
  console.log(`Socket.IO initialized and ready`.bold.bgGreen);
});

export default app;
export { io };
