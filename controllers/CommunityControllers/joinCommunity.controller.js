import Community from "../../models/CommunityModels/community.model.js";

export const joinCommunity = async (req, res) => {
  try {
    // ✅ FIX 1: Check if user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId = req.user._id;
    const { id } = req.params;

    // ✅ FIX 2: Validate community ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Community ID is required",
      });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if already a member
    if (community.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Already joined",
      });
    }

    // PUBLIC → Direct Join
    if (community.visibility === "Public") {
      community.members.push(userId);
      await community.save();

      return res.status(200).json({
        success: true,
        message: "Joined public community",
      });
    }

    // PRIVATE → Request
    if (community.visibility === "Private") {
      // Check if request already exists
      const alreadyRequested = community.joinRequests.some(
        (req) => req.userId && req.userId.toString() === userId.toString(),
      );

      if (alreadyRequested) {
        return res.status(400).json({
          success: false,
          message: "Request already sent",
        });
      }

      // Push request object
      community.joinRequests.push({
        userId: userId,
        createdAt: new Date(),
      });

      await community.save();

      return res.status(200).json({
        success: true,
        message: "Request sent to admin",
      });
    }

    // If visibility is neither Public nor Private
    return res.status(400).json({
      success: false,
      message: "Invalid community visibility",
    });
  } catch (error) {
    console.error("Join community error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
