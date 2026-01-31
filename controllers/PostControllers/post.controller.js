import mongoose from "mongoose";
import Post from "../../models/PostModels/post.model.js";
import Community from "../../models/CommunityModels/community.model.js";
import Comment from "../../models/PostModels/commentModel.js";

//  Create Post

export const createPost = async (req, res) => {
  try {
    const { title, content, communityId, visibility, imageUrl } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
        data: null,
      });
    }

    if (visibility === "Private" && !communityId) {
      return res.status(400).json({
        success: false,
        message: "Community is required for private posts",
        data: null,
      });
    }

    // Create post
    const newPost = new Post({
      userId: req.user._id,
      title,
      content,
      communityId: visibility === "Private" ? communityId : null,
      visibility,
      imageUrl,
    });

    await newPost.save();

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: newPost,
    });
  } catch (error) {
    // console.error("Create post error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create post",
      data: null,
    });
  }
};

// Get My Posts (User's own posts)

export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user._id;

    const posts = await Post.aggregate([
      // Stage 1: Match user's posts
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },

      // Stage 2: Lookup user details
      {
        $lookup: {
          from: "auths", // collection name (lowercase + s)
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      // Stage 3: Unwind user array
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 4: Lookup community details (if exists)
      {
        $lookup: {
          from: "communities",
          localField: "communityId",
          foreignField: "_id",
          as: "community",
        },
      },

      // Stage 5: Unwind community array
      {
        $unwind: {
          path: "$community",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 6: Project (select fields)
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
          "community._id": 1,
          "community.comunityName": 1,
        },
      },

      // Stage 7: Sort by newest first
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Posts fetched successfully",
      data: { posts },
    });
  } catch (error) {
    // console.error("Get my posts error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch posts",
      data: null,
    });
  }
};

// Get Public Post (All public posts)

export const getPublicPosts = async (req, res) => {
  try {
    // MongoDB Aggregation Pipeline
    const posts = await Post.aggregate([
      // Stage 1: Match public posts only
      {
        $match: {
          visibility: "Public",
          isDeleted: false,
        },
      },

      // Stage 2: Lookup user details
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      // Stage 3: Unwind user array
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 4: Project (select fields)
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
        },
      },

      // Stage 5: Sort by newest first
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Public posts fetched successfully",
      data: posts,
    });
  } catch (error) {
    // console.error("Get public posts error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch public posts",
      data: null,
    });
  }
};

//  Get Comunity Posts

export const getCommunityPosts = async (req, res) => {
  try {
    const { id } = req.params;

    const posts = await Post.aggregate([
      // Stage 1: Match community posts
      {
        $match: {
          communityId: new mongoose.Types.ObjectId(id),
          isDeleted: false,
        },
      },

      // Stage 2: Lookup user details
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      // Stage 3: Unwind user
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 4: Lookup community details
      {
        $lookup: {
          from: "communities",
          localField: "communityId",
          foreignField: "_id",
          as: "community",
        },
      },

      // Stage 5: Unwind community
      {
        $unwind: {
          path: "$community",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 6: Project
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
          "community._id": 1,
          "community.comunityName": 1,
        },
      },

      // Stage 7: Sort by newest first
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Community posts fetched successfully",
      data: { posts },
    });
  } catch (error) {
    // console.error("Get community posts error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch community posts",
      data: null,
    });
  }
};

//  Delete Post

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
      });
    }

    // Check ownership
    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post",
        data: null,
      });
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: null,
    });
  } catch (error) {
    // console.error("Delete post error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete post",
      data: null,
    });
  }
};

//  Like and UnLike Post

export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    // Find post
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
      });
    }

    if (post.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot like a deleted post",
        data: null,
      });
    }

    // Check if user already liked
    const hasLiked = post.likes.some(
      (id) => id.toString() === userId.toString(),
    );

    let message;
    let liked;

    if (hasLiked) {
      // UnLike
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString(),
      );
      post.likesCount = Math.max(0, post.likesCount - 1);
      message = "Post unliked";
      liked = false;
    } else {
      // Like
      post.likes.push(userId);
      post.likesCount += 1;
      message = "Post liked";
      liked = true;
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: message,
      data: {
        liked: liked,
        likesCount: post.likesCount,
      },
    });
  } catch (error) {
    // console.error("Toggle like error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle like",
      data: null,
    });
  }
};

// Add Comment

export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    // Validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
        data: null,
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
      });
    }

    if (post.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot comment on a deleted post",
        data: null,
      });
    }

    // Create comment
    const comment = new Comment({
      postId,
      userId,
      text: text.trim(),
    });

    await comment.save();

    // Increment comment count
    post.commentsCount += 1;
    await post.save();

    // Get comment with user details using aggregation
    const commentWithUser = await Comment.aggregate([
      {
        $match: {
          _id: comment._id,
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $unwind: "$userId",
      },
      {
        $project: {
          _id: 1,
          postId: 1,
          text: 1,
          createdAt: 1,
          "userId._id": 1,
          "userId.username": 1,
          "userId.email": 1,
        },
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: commentWithUser[0],
    });
  } catch (error) {
    // console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add comment",
      data: null,
    });
  }
};

// Get Comments

export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        data: null,
      });
    }

    // Fetch comments using aggregation
    const comments = await Comment.aggregate([
      // Stage 1: Match comments for this post
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          isDeleted: false,
        },
      },

      // Stage 2: Lookup user details
      {
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },

      // Stage 3: Unwind user
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 4: Project
      {
        $project: {
          _id: 1,
          postId: 1,
          text: 1,
          createdAt: 1,
          "userId._id": 1,
          "userId.username": 1,
          "userId.email": 1,
        },
      },

      // Stage 5: Sort by oldest first
      {
        $sort: { createdAt: 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      data: comments,
    });
  } catch (error) {
    // console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comments",
      data: null,
    });
  }
};

// Delete Comment

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        data: null,
      });
    }

    // Check ownership
    if (comment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
        data: null,
      });
    }

    // Soft delete
    comment.isDeleted = true;
    await comment.save();

    // Decrement comment count
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentsCount: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: null,
    });
  } catch (error) {
    // console.error("Delete comment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete comment",
      data: null,
    });
  }
};
