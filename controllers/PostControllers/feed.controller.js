import mongoose from "mongoose";
import Post from "../../models/PostModels/post.model.js";

// Get Feed (Recent, Trending, Popular)

export const getFeed = async (req, res) => {
  try {
    const { filter } = req.query; // Get filter from query params: recent, trending, popular

    // Base match condition (only public posts that aren't deleted)
    const baseMatch = {
      visibility: "Public",
      isDeleted: false,
    };

    let sortStage = {};
    let additionalStages = [];

    // Filter Logic

    switch (filter) {
      //  TRENDING: Fast growth + recent posts
      case "trending":
        // console.log(" Applying TRENDING logic...");

        // Calculate hours since creation
        additionalStages = [
          {
            $addFields: {
              // Calculate hours old
              hoursOld: {
                $divide: [
                  { $subtract: [new Date(), "$createdAt"] },
                  1000 * 60 * 60, // Convert milliseconds to hours
                ],
              },
              // Total engagement
              totalEngagement: {
                $add: ["$likesCount", "$commentsCount"],
              },
            },
          },
          {
            $addFields: {
              // Trend score = engagement / hours (avoid division by zero)
              trendScore: {
                $cond: {
                  if: { $lte: ["$hoursOld", 0.1] }, // If less than 0.1 hours old
                  then: { $multiply: ["$totalEngagement", 100] }, // Multiply by 100
                  else: {
                    $divide: ["$totalEngagement", "$hoursOld"],
                  },
                },
              },
            },
          },
          {
            $match: {
              hoursOld: { $lte: 96 }, // Only posts from last 96 hours
            },
          },
        ];

        sortStage = {
          $sort: { trendScore: -1, createdAt: -1 }, // Sort by trend score, then newest
        };

        // console.log("Trending: Posts with high engagement rate in last 96h");
        break;

      //  POPULAR: Most engagement overall
      case "popular":
        // console.log("Applying POPULAR logic...");

        additionalStages = [
          {
            $addFields: {
              // Total engagement score
              popularityScore: {
                $add: [
                  { $multiply: ["$likesCount", 1] }, // Likes worth 1 point
                  { $multiply: ["$commentsCount", 2] }, // Comments worth 2 points
                ],
              },
            },
          },
        ];

        sortStage = {
          $sort: { popularityScore: -1, createdAt: -1 }, // Sort by popularity, then newest
        };

        // console.log("Popular: Posts with most likes and comments");
        break;

      // RECENT: Newest posts (default)
      case "recent":
      default:
        // console.log("Applying RECENT logic...");

        sortStage = {
          $sort: { createdAt: -1 }, // Just sort by creation time
        };

        // console.log("Recent: Just showing newest posts");
        break;
    }

    // Aggregation Pipeline

    const pipeline = [
      // Stage 1: Match public posts
      { $match: baseMatch },

      // Stage 2: Add calculated fields (if any)
      ...additionalStages,

      // Stage 3: Lookup user details
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      // Stage 4: Unwind user
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 5: Project (select fields)
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          imageUrl: 1,
          visibility: 1,
          likesCount: 1,
          commentsCount: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          "user._id": 1,
          "user.username": 1,
          "user.email": 1,
          // Include calculated fields for debugging
          ...(filter === "trending" && {
            trendScore: 1,
            hoursOld: 1,
            totalEngagement: 1,
          }),
          ...(filter === "popular" && { popularityScore: 1 }),
        },
      },

      // Stage 6: Sort
      sortStage,

      // Stage 7: Limit results
      { $limit: 50 },
    ];

    // console.log("Running aggregation pipeline...");

    const posts = await Post.aggregate(pipeline);

    // console.log(
    //   `Found ${posts.length} posts for filter: ${filter || "recent"}`,
    // );

    return res.status(200).json({
      success: true,
      message: `${filter || "recent"} posts fetched successfully`,
      data: posts,
    });
  } catch (error) {
    // console.error("❌ Get feed error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch feed",
      data: null,
    });
  }
};
