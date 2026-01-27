// import mongoose from "mongoose";
// import Post from "../../models/PostModels/post.model.js";

// export const createPost = async (req, res) => {
//   try {
//     const { title, content, visibility, communityId, imageUrl } = req.body;
//     const userId = req.user._id; // from auth middleware

//     // 1️⃣ Basic validation
//     if (!title || !content || !visibility) {
//       return res.status(400).json({
//         success: false,
//         message: "Title, content and visibility are required",
//       });
//     }

//     // 2️⃣ Visibility-based validation
//     if (visibility === "Private" && !communityId) {
//       return res.status(400).json({
//         success: false,
//         message: "Community is required for private posts",
//       });
//     }

//     if (visibility === "Public" && communityId) {
//       return res.status(400).json({
//         success: false,
//         message: "Community is not allowed for public posts",
//       });
//     }

//     // 3️⃣ Create post object
//     const postData = {
//       userId,
//       title,
//       content,
//       visibility,
//       imageUrl,
//     };

//     // Add communityId only for private posts
//     if (visibility === "Private") {
//       postData.communityId = communityId;
//     }

//     // 4️⃣ Save post
//     const post = await Post.create(postData);

//     return res.status(201).json({
//       success: true,
//       message: "Post created successfully",
//       data: post,
//     });
//   } catch (error) {
//     console.error("Create Post Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while creating post",
//     });
//   }
// };

// export const showPost = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     // console.log("Logged in userId and posts only:", req.user._id);

//     const post = await Post.aggregate([
//       {
//         $match: {
//           userId: userId,
//           isDeleted: false, // hide deleted post
//         },
//       },

//       {
//         $lookup: {
//           from: "communities",
//           localField: "communityId",
//           foreignField: "_id",
//           as: "community",
//         },
//       },
//       { $unwind: "$community" },

//       {
//         $lookup: {
//           from: "auths",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       { $unwind: "$user" },

//       {
//         $project: {
//           "user.password": 0,
//           "user.token": 0,
//           __v: 0,
//         },
//       },

//       { $sort: { createdAt: -1 } },
//     ]);
//     res.status(200).json({ success: true, data: post });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

// export const deletePost = async (req, res) => {
//   try {
//     const post = await Post.findByIdAndUpdate(
//       req.params.id,
//       {
//         isDeleted: true,
//         deletedAt: new Date(),
//       },
//       { new: true },
//     );
//     if (!post) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Post Are Not Found" });
//     }
//     return res
//       .status(200)
//       .json({ success: true, message: "Post Delete Successfully" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

////////////////////

import mongoose from "mongoose";
import Post from "../../models/PostModels/post.model.js";
import Community from "../../models/CommunityModels/community.model.js";

// ========================================
// CREATE POST
// ========================================
// This function creates a new post (public or private)
export const createPost = async (req, res) => {
  try {
    const { title, content, visibility, communityId, imageUrl } = req.body;
    const userId = req.user._id; // Get logged-in user ID from auth middleware

    // 1️⃣ BASIC VALIDATION - Check if required fields exist
    if (!title || !content || !visibility) {
      return res.status(400).json({
        success: false,
        message: "Title, content and visibility are required",
        data: null,
      });
    }

    // 2️⃣ PRIVATE POST VALIDATION - Private posts MUST have a community
    if (visibility === "Private" && !communityId) {
      return res.status(400).json({
        success: false,
        message: "Community is required for private posts",
        data: null,
      });
    }

    // 3️⃣ PUBLIC POST VALIDATION - Public posts should NOT have a community
    if (visibility === "Public" && communityId) {
      return res.status(400).json({
        success: false,
        message: "Public posts cannot be assigned to a community",
        data: null,
      });
    }

    // 4️⃣ CREATE POST OBJECT - Build the post data
    const postData = {
      userId,
      title,
      content,
      visibility,
      imageUrl: imageUrl || "", // Optional field
    };

    // Only add communityId for private posts
    if (visibility === "Private") {
      postData.communityId = communityId;
    }

    // 5️⃣ SAVE POST TO DATABASE
    const post = await Post.create(postData);

    // 6️⃣ POPULATE USER AND COMMUNITY DATA (for response)
    const populatedPost = await Post.findById(post._id)
      .populate("userId", "name email") // Get user info
      .populate("communityId", "comunityName"); // Get community info (if private)

    // 7️⃣ RETURN SUCCESS RESPONSE
    return res.status(201).json({
      success: true,
      message: `${visibility} post created successfully`,
      data: populatedPost,
    });
  } catch (error) {
    console.error("Create Post Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating post",
      data: null,
    });
  }
};

// ========================================
// GET MY POSTS (POST PAGE)
// ========================================
// This shows ALL posts created by the logged-in user (both public and private)
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user._id;

    // USE AGGREGATION to get posts with detailed info
    const posts = await Post.aggregate([
      {
        // 1️⃣ FILTER: Only get posts by this user that are not deleted
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        // 2️⃣ JOIN: Get community data (for private posts)
        $lookup: {
          from: "communities", // MongoDB collection name
          localField: "communityId",
          foreignField: "_id",
          as: "community",
        },
      },
      {
        // 3️⃣ HANDLE: Community might be null for public posts
        $addFields: {
          community: {
            $cond: {
              if: { $eq: [{ $size: "$community" }, 0] },
              then: null,
              else: { $arrayElemAt: ["$community", 0] },
            },
          },
        },
      },
      {
        // 4️⃣ JOIN: Get user data
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        // 5️⃣ UNWIND: Convert user array to object
        $unwind: "$user",
      },
      {
        // 6️⃣ CLEAN: Remove sensitive data
        $project: {
          "user.password": 0,
          "user.token": 0,
          __v: 0,
        },
      },
      {
        // 7️⃣ SORT: Newest posts first
        $sort: { createdAt: -1 },
      },
    ]);

    // COUNT different types of posts
    const publicCount = posts.filter((p) => p.visibility === "Public").length;
    const privateCount = posts.filter((p) => p.visibility === "Private").length;

    return res.status(200).json({
      success: true,
      message: "Your posts fetched successfully",
      data: {
        posts,
        count: posts.length,
        publicCount,
        privateCount,
      },
    });
  } catch (error) {
    console.error("Get My Posts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching posts",
      data: null,
    });
  }
};

// ========================================
// GET PUBLIC POSTS (HOME PAGE)
// ========================================
// This shows ONLY public posts from ALL users
export const getPublicPosts = async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        // 1️⃣ FILTER: Only public posts that are not deleted
        $match: {
          visibility: "Public",
          isDeleted: false,
        },
      },
      {
        // 2️⃣ JOIN: Get user data
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        // 3️⃣ UNWIND: Convert user array to object
        $unwind: "$user",
      },
      {
        // 4️⃣ CLEAN: Remove sensitive data
        $project: {
          "user.password": 0,
          "user.token": 0,
          __v: 0,
        },
      },
      {
        // 5️⃣ SORT: Newest posts first
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Public posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    console.error("Get Public Posts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching posts",
      data: null,
    });
  }
};

// ========================================
// GET COMMUNITY POSTS
// ========================================
// This shows ONLY private posts for a specific community
// export const getCommunityPosts = async (req, res) => {
//   try {
//     const { communityId } = req.params;

//     // VALIDATE: Check if communityId is valid
//     if (!mongoose.Types.ObjectId.isValid(communityId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid community ID",
//         data: null,
//       });
//     }

//     const posts = await Post.aggregate([
//       {
//         // 1️⃣ FILTER: Only private posts for this community
//         $match: {
//           visibility: "Private",
//           communityId: new mongoose.Types.ObjectId(communityId),
//           isDeleted: false,
//         },
//       },
//       {
//         // 2️⃣ JOIN: Get community data
//         $lookup: {
//           from: "communities",
//           localField: "communityId",
//           foreignField: "_id",
//           as: "community",
//         },
//       },
//       {
//         // 3️⃣ UNWIND: Convert community array to object
//         $unwind: "$community",
//       },
//       {
//         // 4️⃣ JOIN: Get user data
//         $lookup: {
//           from: "auths",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       {
//         // 5️⃣ UNWIND: Convert user array to object
//         $unwind: "$user",
//       },
//       {
//         // 6️⃣ CLEAN: Remove sensitive data
//         $project: {
//           "user.password": 0,
//           "user.token": 0,
//           __v: 0,
//         },
//       },
//       {
//         // 7️⃣ SORT: Newest posts first
//         $sort: { createdAt: -1 },
//       },
//     ]);

//     return res.status(200).json({
//       success: true,
//       message: "Community posts fetched successfully",
//       data: {
//         posts,
//         count: posts.length,
//       },
//     });
//   } catch (error) {
//     console.error("Get Community Posts Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while fetching posts",
//       data: null,
//     });
//   }
// };

////////////////////////////

export const getCommunityPosts = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user._id; // from protect middleware

    // 1️⃣ Validate communityId
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid community ID",
        data: null,
      });
    }

    // 2️⃣ Check community exists
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
        data: null,
      });
    }

    // 3️⃣ Check access (creator / member)
    const isCreator = community.userId.toString() === userId.toString();
    const isMember = community.members?.includes(userId);

    // 4️⃣ Decide visibility
    // Creator & members → Public + Private
    // Others → Only Public
    const visibilityFilter =
      isCreator || isMember ? { $in: ["Public", "Private"] } : "Public";

    // 5️⃣ Aggregate posts
    const posts = await Post.aggregate([
      {
        $match: {
          communityId: new mongoose.Types.ObjectId(communityId),
          visibility: visibilityFilter,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "communities",
          localField: "communityId",
          foreignField: "_id",
          as: "community",
        },
      },
      { $unwind: "$community" },
      {
        $project: {
          "user.password": 0,
          "user.token": 0,
          "community.joinRequests": 0,
          __v: 0,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    // 6️⃣ Response
    return res.status(200).json({
      success: true,
      message: "Community posts fetched successfully",
      data: {
        posts,
        count: posts.length,
      },
    });
  } catch (error) {
    console.error("Get Community Posts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching community posts",
      data: null,
    });
  }
};
// ========================================
// DELETE POST (SOFT DELETE)
// ========================================
// This marks a post as deleted without actually removing it from database
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // 1️⃣ VALIDATE: Check if post ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID",
        data: null,
      });
    }

    // 2️⃣ FIND POST
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
      });
    }

    // 3️⃣ AUTHORIZATION: Check if user owns this post
    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this post",
        data: null,
      });
    }

    // 4️⃣ CHECK: If already deleted
    if (post.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Post is already deleted",
        data: null,
      });
    }

    // 5️⃣ SOFT DELETE: Mark as deleted
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Delete Post Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting post",
      data: null,
    });
  }
};
