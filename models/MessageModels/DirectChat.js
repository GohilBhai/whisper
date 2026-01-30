import mongoose from "mongoose";

const directChatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
        required: true,
      },
    ],
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Index for faster queries
directChatSchema.index({ participants: 1 });

const DirectChat = mongoose.model("DirectChat", directChatSchema);

export default DirectChat;
