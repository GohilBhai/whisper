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
// import {
//   // createCommunity,
//   // deleteCommunity,
//   // getAllCommunityMembers,
//   // getCommunityDetails,
//   // getSelectedCommunity,
//   // joinPublicCommunity,
//   // approvePrivateCommunityJoinRequests,
//   // rejectPrivateCommunityJoinRequests,
//   // showAllCommunity,
//   // showMyCommunity,
// } from "../controllers/CommunityControllers/community.controller.js";
import protect from "../middleware/auth.middleware.js";
import {
  createPost,
  deletePost,
  showPost,
} from "../controllers/PostControllers/post.controller.js";
import upload from "../middleware/upload.js";
import { communityAccess } from "../middleware/communityAccess.js";
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
  getAllCommunityMembers,
  showMyCommunity,
} from "../controllers/CommunityControllers/community.controller.js";

const route = express.Router();

route.post("/signup", signup);
route.post("/signin", signin);
route.post("/forgot-password", forgotPassword);
route.post("/verify-otp", verifyOtp);
route.post("/reset-password/:token", resetPassword);

route.post("/signout", protect, signout);

// google login

route.get("/google-login", googleAuthLogin);
route.get("/google", googleAuth);

// community routes

// route.post("/community", protect, createCommunity);
// route.post("/community/join/:id", protect, joinPublicCommunity);
// route.get("/community/my", protect, showMyCommunity);
// route.get("/community", protect, showAllCommunity);
// route.delete("/community/:id", protect, deleteCommunity);
// route.get("/community/:id", protect, getSelectedCommunity);
// route.get("/community/:id/members", protect, getAllCommunityMembers);

// //private community routes

// route.post(
//   "/community/approve/:communityId/:userId",
//   protect,
//   approvePrivateCommunityJoinRequests,
// );

// route.post(
//   "/community/reject/:communityId/:userId",
//   protect,
//   rejectPrivateCommunityJoinRequests,
// );

// route.get("/community/:id", protect, communityAccess, getCommunityDetails);

//===================================================================

// community routes

route.post("/community", protect, createCommunity);
route.get("/community", protect, showAllCommunity);
route.get("/community/my", protect, showMyCommunity);
route.post("/community/join/:id", protect, joinCommunity);
route.get("/community/:id", protect, getCommunityDetails);

route.get("/community/:id/members", protect, getAllCommunityMembers);

route.get("/community/:communityId/requests", protect, getPendingRequests);

route.post("/community/:communityId/approve/:userId", protect, approveRequest);

route.post("/community/:communityId/reject/:userId", protect, rejectRequest);

//====================================================================

// post routes

route.post("/post", protect, createPost);
route.get("/post", protect, showPost);
route.delete("/post/:id", protect, deletePost);

// profile

route.put("/profile", protect, profile);
route.post("/profile", protect, upload.single("image"), profileImage);
route.get("/profile", protect, getProfileImage);

export default route;
