import Community from "../../models/CommunityModels/community.model.js";

export const createCommunity = async (req, res) => {
  try {
    const { comunityName, communityDisc, visibility } = req.body;
    const userId = req.user._id;

    const community = await Community.create({
      comunityName,
      communityDisc,
      visibility,
      userId,
      members: [userId], // admin auto member
    });

    res.status(201).json({
      success: true,
      message: "Community created",
      data: community,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
