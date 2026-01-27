import mongoose from "mongoose";
import Community from "../../models/CommunityModels/community.model.js";

export const showAllCommunity = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    // console.log("Logged in user:", userId.toString());

    const communities = await Community.aggregate([
      {
        $match: { isDeleted: false },
      },

      {
        $addFields: {
          // Check if logged-in user is admin
          isAdmin: { $eq: ["$userId", userId] },

          // Check if user is already member
          isMember: { $in: [userId, "$members"] },

          // ✅ FIXED: Check join request correctly
          requestSent: {
            $in: [
              userId,
              {
                $ifNull: [
                  {
                    $map: {
                      input: "$joinRequests",
                      as: "jr",
                      in: "$$jr.userId",
                    },
                  },
                  [],
                ],
              },
            ],
          },
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

    // console.log("Communities sent:", communities.length);

    res.status(200).json({
      success: true,
      message: "Communities fetched successfully",
      data: communities,
    });
  } catch (error) {
    console.log("Show community error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
