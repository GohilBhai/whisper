import Community from "../../models/CommunityModels/community.model.js";
import Post from "../../models/PostModels/post.model.js";

export const searchPostsAndCommunities = async (req, res) => {
  try {
    // console.log(" Search Request Received");
    // console.log("Query Params:", req.query);
    // console.log("User ID:", req.user?._id);

    const { query } = req.query;
    const userId = req.user?._id;

    // Validate search query
    if (!query || query.trim() === "") {
      //   console.log(" Empty search query");
      return res.status(400).json({
        success: false,
        message: "Search query is required",
        data: null,
      });
    }

    const searchText = query.trim();
    // console.log(" Search Text:", searchText);

    // ============================================================
    // SEARCH COMMUNITIES BY NAME
    // ============================================================
    // console.log("Searching Communities...");

    const communities = await Community.aggregate([
      // Match non-deleted communities
      {
        $match: {
          isDeleted: false,
          comunityName: { $regex: searchText, $options: "i" },
        },
      },

      // Lookup creator details
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "creator",
        },
      },

      // Unwind creator
      {
        $unwind: {
          path: "$creator",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add computed fields
      {
        $addFields: {
          isAdmin: {
            $eq: ["$userId", userId],
          },
          isMember: {
            $in: [userId, "$members"],
          },
          requestSent: {
            $in: [userId, "$joinRequests.userId"],
          },
          memberCount: { $size: "$members" },
        },
      },

      // Filter based on visibility
      {
        $match: {
          $or: [
            { visibility: "Public" }, // Public communities visible to all
            { isAdmin: true }, // Admin can see their communities
            { isMember: true }, // Members can see their communities
          ],
        },
      },

      // Project final fields
      {
        $project: {
          _id: 1,
          comunityName: 1,
          communityDisc: 1,
          visibility: 1,
          isAdmin: 1,
          isMember: 1,
          requestSent: 1,
          memberCount: 1,
          createdAt: 1,
          "creator.username": 1,
          "creator._id": 1,
        },
      },

      // Sort by relevance and creation date
      {
        $sort: {
          isAdmin: -1,
          isMember: -1,
          createdAt: -1,
        },
      },

      // Limit results
      {
        $limit: 20,
      },
    ]);

    // console.log("Communities Found:", communities.length);
    // console.log("Community Results:", JSON.stringify(communities, null, 2));

    // ============================================================
    // SEARCH POSTS BY TITLE
    // ============================================================
    // console.log("Searching Posts...");

    const posts = await Post.aggregate([
      // Match non-deleted posts
      {
        $match: {
          isDeleted: false,
          title: { $regex: searchText, $options: "i" },
        },
      },

      // Lookup user details
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      // Unwind user
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup community details (for private posts)
      {
        $lookup: {
          from: "communities",
          localField: "communityId",
          foreignField: "_id",
          as: "community",
        },
      },

      // Unwind community
      {
        $unwind: {
          path: "$community",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Add computed fields
      {
        $addFields: {
          isOwner: {
            $eq: ["$userId", userId],
          },
          isCommunityMember: {
            $cond: {
              if: { $ifNull: ["$communityId", false] },
              then: { $in: [userId, "$community.members"] },
              else: false,
            },
          },
          isCommunityAdmin: {
            $cond: {
              if: { $ifNull: ["$communityId", false] },
              then: { $eq: ["$community.userId", userId] },
              else: false,
            },
          },
          userLiked: {
            $in: [userId, "$likes"],
          },
        },
      },

      // Apply visibility rules
      {
        $match: {
          $or: [
            { visibility: "Public" }, // Public posts visible to all
            { isOwner: true }, // Owner can see their posts
            {
              $and: [
                { visibility: "Private" },
                {
                  $or: [
                    { isCommunityMember: true },
                    { isCommunityAdmin: true },
                  ],
                },
              ],
            }, // Private posts visible to community members/admin
          ],
        },
      },

      // Project final fields
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          imageUrl: 1,
          visibility: 1,
          likesCount: 1,
          commentsCount: 1,
          createdAt: 1,
          userLiked: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
          },
          community: {
            _id: "$community._id",
            comunityName: "$community.comunityName",
          },
          likes: {
            $cond: {
              if: "$userLiked",
              then: ["current-user"],
              else: [],
            },
          },
        },
      },

      // Sort by creation date
      {
        $sort: {
          createdAt: -1,
        },
      },

      // Limit results
      {
        $limit: 20,
      },
    ]);

    // console.log(" Posts Found:", posts.length);
    // console.log("Post Results:", JSON.stringify(posts, null, 2));

    // ============================================================
    // RETURN COMBINED RESULTS
    // ============================================================
    const totalResults = communities.length + posts.length;

    // console.log(" Total Results:", totalResults);
    // console.log(" Search Completed Successfully");

    return res.status(200).json({
      success: true,
      message:
        totalResults > 0
          ? `Found ${totalResults} result(s)`
          : "No results found",
      data: {
        communities,
        posts,
        query: searchText,
        totalCommunities: communities.length,
        totalPosts: posts.length,
        totalResults,
      },
    });
  } catch (error) {
    // console.error("❌ Search Error:", error);
    // console.error("Error Stack:", error.stack);

    return res.status(500).json({
      success: false,
      message: "Failed to perform search",
      data: null,
      error: error.message,
    });
  }
};
