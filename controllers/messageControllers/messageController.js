import mongoose from "mongoose";
import Message from "../../models/MessageModels/Message.js";
import { getIO } from "../../socket/socket.js";

// ✅ Get all messages for a community
export const getMessages = async (req, res) => {
  try {
    const { communityId } = req.params;

    const messages = await Message.aggregate([
      // Step 1: Match messages for this community
      {
        $match: {
          communityId: new mongoose.Types.ObjectId(communityId),
        },
      },

      // Step 2: Sort by creation time (oldest first)
      {
        $sort: { createdAt: 1 },
      },

      // Step 3: Join with Auth collection to get sender details
      {
        $lookup: {
          from: "auths", // Collection name (usually lowercase + 's')
          localField: "senderId",
          foreignField: "_id",
          as: "sender",
        },
      },

      // Step 4: Convert sender array to single object
      {
        $unwind: "$sender",
      },

      // Step 5: Select only needed fields
      {
        $project: {
          _id: 1,
          message: 1,
          createdAt: 1,
          "sender._id": 1,
          "sender.name": 1,
          "sender.username": 1,
          "sender.profilePicture": 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (error) {
    console.error("Get Messages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// ✅ Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id;

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // Create new message
    const newMessage = new Message({
      communityId,
      senderId,
      message: message.trim(),
    });

    await newMessage.save();

    // Get sender details using aggregation
    const messageWithSender = await Message.aggregate([
      {
        $match: { _id: newMessage._id },
      },
      {
        $lookup: {
          from: "auths",
          localField: "senderId",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $unwind: "$sender",
      },
      {
        $project: {
          _id: 1,
          message: 1,
          createdAt: 1,
          communityId: 1,
          "sender._id": 1,
          "sender.name": 1,
          "sender.username": 1,
          "sender.profilePicture": 1,
        },
      },
    ]);

    const formattedMessage = messageWithSender[0];

    // ✅ Broadcast message to ALL users in the community room via Socket.IO
    try {
      const io = getIO();
      io.to(communityId).emit("receive-message", formattedMessage);
      console.log(`✅ Message broadcasted to community: ${communityId}`);
    } catch (socketError) {
      console.error("Socket broadcast error:", socketError);
      // Continue even if socket fails - message is saved to DB
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: formattedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};
