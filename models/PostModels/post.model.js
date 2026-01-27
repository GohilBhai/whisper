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

// import mongoose from "mongoose";

// const postSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Auth",
//       required: true,
//     },

//     communityId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Community",
//     },

//     title: {
//       type: String,
//       required: true,
//     },

//     content: {
//       type: String,
//       required: true,
//     },

//     visibility: {
//       type: String,
//       enum: ["Public", "Private"],
//       default: "Public",
//     },

//     imageUrl: {
//       type: String,
//     },
//     // Soft Delete
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//     deletedAt: {
//       type: Date,
//       default: null,
//     },
//   },
//   { timestamps: true },
// );

// const Post = mongoose.model("Post", postSchema);
// export default Post;

////////////////

import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      validate: {
        validator: function (value) {
          // Private post must have community
          if (this.visibility === "Private") {
            return value != null;
          }
          // Public post should not have community
          return true;
        },
        message: "Community is required for private posts",
      },
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
      default: "Public",
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
