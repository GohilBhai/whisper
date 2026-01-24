// import mongoose from "mongoose";

// const postSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       // ref: "Auth",
//       required: true,
//     },
//     communityId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//     },
//     posttitle: {
//       type: String,
//       required: true,
//     },
//     postcontent: {
//       type: String,
//       required: true,
//     },
//     communityname: {
//       type: String,
//       required: true,
//     },
//     visibility: {
//       type: String,
//       required: true,
//     },
//     postimageurl: {
//       type: String,
//     },
//   },
//   { timestamps: true },
// );

// const Post = mongoose.model("Post", postSchema);
// export default Post;

import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    visibility: {
      type: String,
      enum: ["Public", "Private"],
      required: true,
    },

    imageUrl: {
      type: String,
    },
    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Post = mongoose.model("Post", postSchema);
export default Post;
