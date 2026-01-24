import mongoose from "mongoose";

const communitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    comunityName: {
      type: String,
      required: true,
    },
    communityDisc: {
      type: String,
      required: true,
    },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
      required: true,
      default: "Public",
    },

    // members
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
      },
    ],

    // User Who joinReqests for private community

    joinRequests: [
      {
        userId: {
          // delete this if not working [==> userid :{}]
          type: mongoose.Schema.Types.ObjectId,
          ref: "Auth",
          require: true, // delete this if not working
        },
      },
    ],

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Community = mongoose.model("Community", communitySchema);
export default Community;
