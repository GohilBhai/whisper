import Community from "../models/CommunityModels/community.model.js";

const checkCommunityAccess = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const userId = req.user._id; // Assuming you have auth middleware that sets req.user

    // Find community
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is admin (creator)
    const isAdmin = community.userId.toString() === userId.toString();

    // Check if user is member
    const isMember = community.members.some(
      (memberId) => memberId.toString() === userId.toString(),
    );

    // For private communities, user must be admin or member
    if (community.visibility === "Private" && !isAdmin && !isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this private community",
      });
    }

    // Store info for use in controller
    req.community = community;
    req.isAdmin = isAdmin;
    req.isMember = isMember;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export default checkCommunityAccess;
