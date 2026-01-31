import mongoose from "mongoose";
import Auth from "../../models/AuthModels/auth.model.js";
import DirectChat from "../../models/MessageModels/DirectChat.js";
import DirectMessage from "../../models/MessageModels/DirectMessage.js";

//  Get or Create Direct Chat between two users
export const getOrCreateDirectChat = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    // console.log("📨 Get/Create Direct Chat Request:");
    // console.log("Sender ID:", senderId);
    // console.log("Receiver ID:", receiverId);

    // Validate receiver exists
    const receiverExists = await Auth.findById(receiverId);
    if (!receiverExists) {
      // console.log("❌ Receiver not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if chat already exists between these two users using aggregate
    const existingChat = await DirectChat.aggregate([
      {
        $match: {
          participants: {
            $all: [
              new mongoose.Types.ObjectId(senderId),
              new mongoose.Types.ObjectId(receiverId),
            ],
          },
        },
      },
      {
        $limit: 1,
      },
    ]);

    // console.log("Existing chat found:", existingChat.length > 0);

    let directChat;

    // If chat exists, use it
    if (existingChat.length > 0) {
      directChat = existingChat[0];
    } else {
      // Create new chat
      directChat = await DirectChat.create({
        participants: [senderId, receiverId],
      });
      // console.log("New chat created:", directChat._id);
    }

    return res.status(200).json({
      success: true,
      message: "Chat retrieved successfully",
      data: {
        chatId: directChat._id,
        participants: directChat.participants,
      },
    });
  } catch (error) {
    // console.error("❌ Error in getOrCreateDirectChat:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get or create chat",
      error: error.message,
    });
  }
};

// ✅ Get all messages for a specific chat
export const getDirectMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // console.log("📩 Get Messages Request:");
    // console.log("Chat ID:", chatId);
    // console.log("User ID:", userId);

    // Verify user is part of this chat
    const chat = await DirectChat.findById(chatId);
    if (!chat) {
      // console.log("Chat not found");
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const isParticipant = chat.participants.some(
      (participantId) => participantId.toString() === userId.toString(),
    );

    if (!isParticipant) {
      // console.log("User not authorized for this chat");
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this chat",
      });
    }

    // Get all messages using aggregate
    const messages = await DirectMessage.aggregate([
      {
        $match: {
          chatId: new mongoose.Types.ObjectId(chatId),
        },
      },
      {
        $sort: { createdAt: 1 }, // Oldest first
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

    // console.log("Messages fetched:", messages.length);

    return res.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      data: {
        messages,
        totalMessages: messages.length,
      },
    });
  } catch (error) {
    // console.error("Error in getDirectMessages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get messages",
      error: error.message,
    });
  }
};

// Send a message (HTTP endpoint - backup for socket)
export const sendDirectMessage = async (req, res) => {
  try {
    const { chatId, receiverId, message } = req.body;
    const senderId = req.user._id;

    // console.log("💬 Send Message Request:");
    // console.log("Chat ID:", chatId);
    // console.log("Sender ID:", senderId);
    // console.log("Receiver ID:", receiverId);
    // console.log("Message:", message);

    // Validate chat exists
    const chat = await DirectChat.findById(chatId);
    if (!chat) {
      // console.log(" Chat not found");
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Create new message
    const newMessage = await DirectMessage.create({
      chatId,
      senderId,
      receiverId,
      message,
    });

    // Update last message in chat
    await DirectChat.findByIdAndUpdate(chatId, {
      lastMessage: message,
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

    // console.log("Message sent successfully:", populatedMessage._id);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    // console.error(" Error in sendDirectMessage:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

//  Get all chats for current user
export const getAllUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    // console.log("📋 Get All User Chats Request:");
    // console.log("User ID:", userId);

    // Get all chats using aggregate
    const chats = await DirectChat.aggregate([
      {
        $match: {
          participants: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $sort: { lastMessageTime: -1 }, // Most recent first
      },
      {
        $lookup: {
          from: "auths",
          localField: "participants",
          foreignField: "_id",
          as: "participantDetails",
        },
      },
      {
        $project: {
          _id: 1,
          participants: 1,
          lastMessage: 1,
          lastMessageTime: 1,
          createdAt: 1,
          participantDetails: {
            _id: 1,
            username: 1,
            email: 1,
            name: 1,
            profilePicture: 1,
          },
        },
      },
    ]);

    // console.log(" Chats fetched:", chats.length);

    // Format response to show other participant info
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participantDetails.find(
        (participant) => participant._id.toString() !== userId.toString(),
      );

      return {
        chatId: chat._id,
        participant: otherParticipant,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        createdAt: chat.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Chats retrieved successfully",
      data: {
        chats: formattedChats,
        totalChats: formattedChats.length,
      },
    });
  } catch (error) {
    // console.error(" Error in getAllUserChats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get chats",
      error: error.message,
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // console.log("✓ Mark Messages as Read:");
    // console.log("Chat ID:", chatId);
    // console.log("User ID:", userId);

    // Mark all unread messages as read where user is receiver
    const result = await DirectMessage.updateMany(
      {
        chatId: new mongoose.Types.ObjectId(chatId),
        receiverId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
      },
    );

    // console.log("Messages marked as read:", result.modifiedCount);

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      data: {
        updatedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    // console.error("Error in markMessagesAsRead:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

// Get user details by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // console.log("👤 Get User By ID Request:");
    // console.log("User ID:", userId);

    // Using aggregate for consistency
    const userResult = await Auth.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          name: 1,
          profilePicture: 1,
          createdAt: 1,
        },
      },
    ]);

    if (!userResult || userResult.length === 0) {
      // console.log(" User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult[0];
    // console.log("User found:", user.username || user.email);

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    // console.error(" Error in getUserById:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user",
      error: error.message,
    });
  }
};
