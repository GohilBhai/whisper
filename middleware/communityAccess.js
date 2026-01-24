import Community from "../models/CommunityModels/community.model.js";

export const communityAccess = async (req, res) => {
  try {
    console.log("👉 communityAccess middleware");

    const userId = req.user.id;
    const { communityId } = req.params;

    console.log(" community access middelware userId = ", userId);

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    console.log("Visibility:", community.visibility);

    // Public community → allow
    if (community.visibility === "public") {
      return next();
    }

    // Private community → check member
    if (!community.members.includes(userId)) {
      console.log("⛔ Access denied (not a member)");
      return res.status(403).json({
        message: "You are not allowed to access this private community",
      });
    }

    console.log("✅ Access granted");
    next();
  } catch (error) {
    console.log("❌ Middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
