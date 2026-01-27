import express from "express";
import {
  forgotPassword,
  getProfileImage,
  googleAuth,
  googleAuthLogin,
  profile,
  profileImage,
  resetPassword,
  signin,
  signout,
  signup,
  verifyOtp,
} from "../controllers/AuthControllers/auth.controller.js";
import protect from "../middleware/auth.middleware.js";
import {
  createPost,
  deletePost,
  getCommunityPosts,
  getMyPosts,
  getPublicPosts,
} from "../controllers/PostControllers/post.controller.js";
import upload from "../middleware/upload.js";
import { joinCommunity } from "../controllers/CommunityControllers/joinCommunity.controller.js";
import {
  approveRequest,
  getPendingRequests,
  rejectRequest,
} from "../controllers/CommunityControllers/approveRequest.controller.js";
import { showAllCommunity } from "../controllers/CommunityControllers/ShowAllCommunities.controller.js";
import { createCommunity } from "../controllers/CommunityControllers/createCommunity.controller.js";
import { getCommunityDetails } from "../controllers/CommunityControllers/getCommunityDetails.js";
import {
  getMembers,
  showMyCommunity,
} from "../controllers/CommunityControllers/community.controller.js";

//====================================================================

const route = express.Router();

//====================================================================

// auth routes

route.post("/signup", signup);

route.post("/signin", signin);

route.post("/forgot-password", forgotPassword);

route.post("/verify-otp", verifyOtp);

route.post("/reset-password/:token", resetPassword);

route.post("/signout", protect, signout);

//====================================================================

// google login

route.get("/google-login", googleAuthLogin);

route.get("/google", googleAuth);

//====================================================================

// community routes

route.post("/community", protect, createCommunity);

route.get("/community", protect, showAllCommunity);

route.get("/community/my", protect, showMyCommunity);

route.post("/community/join/:id", protect, joinCommunity);

route.get("/community/:id", protect, getCommunityDetails);

route.get("/community/:communityId/members", protect, getMembers);

route.get("/community/:communityId/requests", protect, getPendingRequests);

//  Approve request (admin only)
route.post("/community/:communityId/approve/:userId", protect, approveRequest);

//  Reject request (admin only)
route.post("/community/:communityId/reject/:userId", protect, rejectRequest);

//====================================================================
// 📄 post routes

// CREATE a new post (public or private)
route.post("/post", protect, createPost);

// GET all posts created by logged-in user (Post Page)
// Shows BOTH public and private posts

route.get("/post/my-posts", protect, getMyPosts);

// Shows ONLY public posts from all users (Home Page)

route.get("/post/public", getPublicPosts);

// Shows ONLY private posts for that specific community  (Community Page)

route.get("/community/:communityId", protect, getCommunityPosts);

route.delete("/post/:id", protect, deletePost);

//====================================================================

// profile

route.put("/profile", protect, profile);

route.post("/profile", protect, upload.single("image"), profileImage);

route.get("/profile", protect, getProfileImage);

//====================================================================

export default route;
