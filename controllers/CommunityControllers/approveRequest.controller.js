import mongoose from "mongoose";
import Community from "../../models/CommunityModels/community.model.js";

export const getPendingRequests = async (req, res) => {
  try {
    // ✅ FIX 1: Check if user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { communityId } = req.params;
    const adminId = req.user._id;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid community id",
      });
    }

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // ✅ FIX 2: Safe comparison with null check
    if (
      !community.userId ||
      community.userId.toString() !== adminId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Only admin can view pending requests",
      });
    }

    // ✅ FIX 3: Handle empty joinRequests array
    if (!community.joinRequests || community.joinRequests.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending requests",
        data: [],
      });
    }

    // Aggregate to get user details
    const data = await Community.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(communityId) },
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
          as: "userInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$userInfo._id",
          email: "$userInfo.email",
          requestedAt: "$joinRequests.createdAt",
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Pending requests fetched",
      data,
    });
  } catch (error) {
    console.error("Pending request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

////////////////////////

// =====================================================
// NEW CONTROLLERS: approveRequest.controller.js & rejectRequest.controller.js
// =====================================================

export const approveRequest = async (req, res) => {
  try {
    // ✅ CHECK 1: User authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { communityId, userId } = req.params;
    const adminId = req.user._id;

    // ✅ CHECK 2: Parameters exist
    if (!communityId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Community ID and User ID are required",
      });
    }

    // ✅ CHECK 3: Valid IDs
    if (
      !mongoose.Types.ObjectId.isValid(communityId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    // ✅ CHECK 4: Community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // ✅ CHECK 5: Admin check
    if (!community.userId) {
      return res.status(500).json({
        success: false,
        message: "Community has no admin",
      });
    }

    if (community.userId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only admin can approve requests",
      });
    }

    // ✅ CHECK 6: Initialize arrays
    if (!Array.isArray(community.members)) {
      community.members = [];
    }
    if (!Array.isArray(community.joinRequests)) {
      community.joinRequests = [];
    }

    // Check if user already a member
    const isMember = community.members.some(
      (memberId) => memberId && memberId.toString() === userId,
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member",
      });
    }

    // Find the request
    const requestIndex = community.joinRequests.findIndex((req) => {
      if (!req) return false;
      const requestUserId = req.userId || req;
      return requestUserId && requestUserId.toString() === userId;
    });

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Remove from joinRequests
    community.joinRequests.splice(requestIndex, 1);

    // Add to members
    community.members.push(userId);

    await community.save();

    return res.status(200).json({
      success: true,
      message: "Request approved successfully",
      data: {
        communityId: community._id,
        newMemberId: userId,
      },
    });
  } catch (error) {
    console.error("Approve request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// 5. REJECT REQUEST (Fixed)
// =====================================================
export const rejectRequest = async (req, res) => {
  try {
    // ✅ CHECK 1: User authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { communityId, userId } = req.params;
    const adminId = req.user._id;

    // ✅ CHECK 2: Parameters exist
    if (!communityId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Community ID and User ID are required",
      });
    }

    // ✅ CHECK 3: Valid IDs
    if (
      !mongoose.Types.ObjectId.isValid(communityId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    // ✅ CHECK 4: Community exists
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // ✅ CHECK 5: Admin check
    if (!community.userId) {
      return res.status(500).json({
        success: false,
        message: "Community has no admin",
      });
    }

    if (community.userId.toString() !== adminId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only admin can reject requests",
      });
    }

    // ✅ CHECK 6: joinRequests array exists
    if (!Array.isArray(community.joinRequests)) {
      community.joinRequests = [];
    }

    // Find the request
    const requestIndex = community.joinRequests.findIndex((req) => {
      if (!req) return false;
      const requestUserId = req.userId || req;
      return requestUserId && requestUserId.toString() === userId;
    });

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Remove from joinRequests
    community.joinRequests.splice(requestIndex, 1);

    await community.save();

    return res.status(200).json({
      success: true,
      message: "Request rejected successfully",
    });
  } catch (error) {
    console.error("Reject request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
