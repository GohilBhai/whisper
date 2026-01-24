import Community from "../../models/CommunityModels/community.model.js";

export const showAllCommunity = async (req, res) => {
  try {
    const userId = req.user._id;

    const communities = await Community.aggregate([
      { $match: { isDeleted: false } },

      {
        $addFields: {
          isAdmin: { $eq: ["$userId", userId] },
          isMember: { $in: [userId, "$members"] },
          requestSent: { $in: [userId, "$joinRequests"] },
        },
      },

      {
        $project: {
          comunityName: 1,
          communityDisc: 1,
          visibility: 1,
          isAdmin: 1,
          isMember: 1,
          requestSent: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: communities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
