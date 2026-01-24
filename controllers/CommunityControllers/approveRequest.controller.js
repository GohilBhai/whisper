import mongoose from "mongoose";
import Community from "../../models/CommunityModels/community.model.js";

//  export const approveRequest = async (req, res) => {
//    const { communityId, userId } = req.params;
//    const adminId = req.user._id;

//    const community = await Community.findById(communityId);

//    if (!community.userId.equals(adminId)) {
//      return res.status(403).json({ message: "Only admin allowed" });
//    }

//    community.joinRequests.pull(userId);
//    community.members.push(userId);
//    await community.save();

//    res.json({ success: true, message: "User approved" });
//  };

//  export const rejectRequest = async (req, res) => {
//    const { communityId, userId } = req.params;
//    const adminId = req.user._id;

//    const community = await Community.findById(communityId);

//    if (!community.userId.equals(adminId)) {
//      return res.status(403).json({ message: "Only admin allowed" });
//    }

//    community.joinRequests.pull(userId);
//    await community.save();

//    res.json({ success: true, message: "User rejected" });
//  };

export const getPendingRequests = async (req, res) => {
  try {
    const { communityId } = req.params;

    const data = await Community.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(communityId),
        },
      },
      {
        $unwind: {
          path: "$joinRequests",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "joinRequests.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          email: "$user.email",
          requestedAt: "$joinRequests.createdAt",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * ✅ Approve Join Request
 */
export const approveRequest = async (req, res) => {
  try {
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    //   Add to members if not exists
    if (!community.members.includes(userId)) {
      community.members.push(userId);
    }

    //   Remove from pending requests
    community.joinRequests = community.joinRequests.filter(
      (req) => req.userId.toString() !== userId,
    );

    await community.save();

    res.status(200).json({
      message: "Join request approved",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ❌ Reject Join Request
 */
export const rejectRequest = async (req, res) => {
  try {
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    //   Remove from pending requests
    community.joinRequests = community.joinRequests.filter(
      (req) => req.userId.toString() !== userId,
    );

    await community.save();

    res.status(200).json({
      message: "Join request rejected",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
