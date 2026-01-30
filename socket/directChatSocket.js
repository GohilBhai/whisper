import mongoose from "mongoose";
import DirectChat from "../models/MessageModels/DirectChat.js";
import DirectMessage from "../models/MessageModels/DirectMessage.js";

export const setupDirectChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 Direct Chat - User connected:", socket.id);

    // ✅ Join chat room
    socket.on("join_direct_chat", (chatId) => {
      socket.join(chatId);
      console.log(`👥 User ${socket.id} joined direct chat: ${chatId}`);
    });

    // ✅ Send message in real-time
    socket.on("send_direct_message", async (data) => {
      try {
        const { chatId, senderId, receiverId, message } = data;

        console.log("💬 Direct message received:");
        console.log("Chat ID:", chatId);
        console.log("Sender ID:", senderId);
        console.log("Receiver ID:", receiverId);
        console.log("Message:", message);

        // Validate inputs
        if (!chatId || !senderId || !receiverId || !message) {
          console.log("❌ Invalid message data");
          socket.emit("message_error", {
            success: false,
            message: "Invalid message data",
          });
          return;
        }

        // Save message to database
        const newMessage = await DirectMessage.create({
          chatId: new mongoose.Types.ObjectId(chatId),
          senderId: new mongoose.Types.ObjectId(senderId),
          receiverId: new mongoose.Types.ObjectId(receiverId),
          message: message.trim(),
        });

        console.log("✅ Message saved to DB:", newMessage._id);

        // Update last message in chat
        await DirectChat.findByIdAndUpdate(chatId, {
          lastMessage: message.trim(),
          lastMessageTime: new Date(),
        });

        // Get populated message using aggregate
        const populatedMessages = await DirectMessage.aggregate([
          {
            $match: {
              _id: newMessage._id,
            },
          },
          {
            $lookup: {
              from: "auths",
              localField: "senderId",
              foreignField: "_id",
              as: "senderId",
            },
          },
          {
            $unwind: "$senderId",
          },
          {
            $lookup: {
              from: "auths",
              localField: "receiverId",
              foreignField: "_id",
              as: "receiverId",
            },
          },
          {
            $unwind: "$receiverId",
          },
          {
            $project: {
              _id: 1,
              chatId: 1,
              message: 1,
              isRead: 1,
              createdAt: 1,
              "senderId._id": 1,
              "senderId.username": 1,
              "senderId.email": 1,
              "senderId.name": 1,
              "senderId.profilePicture": 1,
              "receiverId._id": 1,
              "receiverId.username": 1,
              "receiverId.email": 1,
              "receiverId.name": 1,
              "receiverId.profilePicture": 1,
            },
          },
        ]);

        const populatedMessage = populatedMessages[0];

        console.log("✅ Message populated, broadcasting to room:", chatId);

        // Broadcast message to all users in the chat room
        io.to(chatId).emit("receive_direct_message", populatedMessage);
      } catch (error) {
        console.error("❌ Socket send_direct_message error:", error);
        socket.emit("message_error", {
          success: false,
          message: "Failed to send message",
          error: error.message,
        });
      }
    });

    // ✅ Typing indicator
    socket.on("typing_direct", (data) => {
      const { chatId, username } = data;
      console.log(`⌨️ ${username} is typing in chat: ${chatId}`);
      socket.to(chatId).emit("user_typing_direct", { username });
    });

    // ✅ Stop typing
    socket.on("stop_typing_direct", (data) => {
      const { chatId } = data;
      console.log(`⌨️ User stopped typing in chat: ${chatId}`);
      socket.to(chatId).emit("user_stop_typing_direct");
    });

    // ✅ Leave chat room
    socket.on("leave_direct_chat", (chatId) => {
      socket.leave(chatId);
      console.log(`👋 User ${socket.id} left direct chat: ${chatId}`);
    });

    // ✅ Disconnect
    socket.on("disconnect", () => {
      console.log("❌ Direct Chat - User disconnected:", socket.id);
    });
  });
};
