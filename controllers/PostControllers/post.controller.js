import mongoose from "mongoose";
import Post from "../../models/PostModels/post.model.js";

export const createPost = async (req, res) => {
  try {
    const { title, content, communityId, visibility, imageUrl } = req.body;
    const userId = req.user?._id;

    if (!title || !content || !communityId || !visibility) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newPost = await Post.create({
      title,
      content,
      communityId,
      visibility,
      imageUrl,
      userId,
    });

    const postWithDetails = await Post.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(newPost._id) } },

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
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          "user.password": 0,
          "user.token": 0,
          __v: 0,
        },
      },
    ]);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: postWithDetails[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const createPost = async (req, res) => {
//   try {
//     const { posttitle, postcontent, communityname, visibility, postimageurl } =
//       req.body;

//     const userId = req.user?._id;

//     console.log("userId == ", userId);

//     // Validation
//     if (!posttitle || !postcontent || !communityname || !visibility) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized User",
//       });
//     }

//     // Create community
//     const newPost = await Post.create({
//       posttitle,
//       postcontent,
//       communityname,
//       visibility,
//       postimageurl,
//       userId,
//     });

//     console.log("newpost controler data == ", newPost);

//     const craetedPostUserDetail = await Post.aggregate([
//       {
//         $match: {
//           _id: new mongoose.Types.ObjectId(newPost._id),
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       {
//         $unwind: {
//           path: "$user",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           "user.password": 0,
//           "user.token": 0,
//           "user.__v": 0,
//           createdAt: 0,
//           updatedAt: 0,
//           __v: 0,
//         },
//       },
//     ]);

//     return res.status(201).json({
//       success: true,
//       message: "Post created successfully",
//       data: craetedPostUserDetail[0],
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const showPost = async (req, res) => {
  try {
    const userId = req.user._id;
    // console.log("Logged in userId and posts only:", req.user._id);

    const post = await Post.aggregate([
      {
        $match: {
          userId: userId,
          isDeleted: false, // hide deleted post
        },
      },

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
        $lookup: {
          from: "auths",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $project: {
          "user.password": 0,
          "user.token": 0,
          __v: 0,
        },
      },

      { $sort: { createdAt: -1 } },
    ]);
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post Are Not Found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Post Delete Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
