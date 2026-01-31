import mongoose from "mongoose";
import Community from "../../models/CommunityModels/community.model.js";

export const createCommunity = async (req, res) => {
  try {
    const { comunityName, communityDisc, visibility } = req.body;
    const userId = req.user?._id;

    // console.log("userId == ", userId); // which user create the community

    // Validation
    if (!comunityName || !communityDisc || !visibility) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized User",
      });
    }

    // Create community
    const newCommunity = await Community.create({
      comunityName,
      communityDisc,
      visibility,
      userId,
      members: [userId], // admin(creater of community) is also member // admin auto join
    });

    // console.log("Community Created with admin as member : ", newCommunity._id);

    const craetedCommunityUserDetail = await Community.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(newCommunity._id),
        },
      },
      {
        $lookup: {
          from: "auths", //  MongoDB collection name
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user", // array → object
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
          __v: 0,
          createdAt: 0,
          updatedAt: 0,
          "user.token": 0,
        },
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Community created successfully",
      // data: newCommunity,
      data: craetedCommunityUserDetail[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const showAllCommunity = async (req, res) => {
  try {
    const userId = req.user._id;
    // console.log("Logged in userId community only:", userId);
    const community = await Community.aggregate([
      {
        $match: {
          // userId: userId, //
          // visibility: "Public",
          isDeleted: false, // soft delete
        },
      },
      // isJoined
      {
        $addFields: {
          isJoined: {
            $cond: {
              if: { $isArray: "$members" },
              then: { $in: [userId, "$members"] },
              else: false,
            },
          },
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
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
          __v: 0,
          createdAt: 0,
          updatedAt: 0,
          "user.token": 0,
        },
      },
    ]);
    res.status(200).json({ success: true, data: community });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const showMyCommunity = async (req, res) => {
  try {
    const userId = req.user._id;
    // console.log("Logged in userId community only:", userId);
    const community = await Community.aggregate([
      {
        $match: {
          userId: userId, //
          isDeleted: false, // soft delete
        },
      },
      {
        $addFields: {
          isJoined: {
            $cond: {
              if: { $isArray: "$members" },
              then: { $in: [userId, "$members"] },
              else: false,
            },
          },
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
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.__v": 0,
          __v: 0,
          createdAt: 0,
          updatedAt: 0,
          "user.token": 0,
        },
      },
    ]);
    res.status(200).json({ success: true, data: community });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community Not Found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Community Delete Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getSelectedCommunity = async (req, res) => {
  try {
    const SelectedCommunity = await Community.findById(req.params.id);

    if (!SelectedCommunity) {
      return res
        .status(500)
        .json({ success: false, message: "Community Not Exist!" });
    }
    return res.status(200).json({ success: true, SelectedCommunity });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// join community button API for public and private

export const joinPublicCommunity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // console.log("join Public and private community API called");
    // console.log("Join User = ", userId);
    // console.log("join community = ", communityId);

    const community = await Community.findById(id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community Not Found" });
    }

    // user already joined

    if (community.members.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "User Already Joined" });
    }

    // public community --> Direct Join

    if (community.visibility === "Public") {
      community.members.push(userId);
      await community.save();

      return res.status(200).json({
        success: true,
        message: "Public Community Joined SuccessFully",
      });
    }

    // community.members.push(userId);
    // await community.save();

    // return res.status(200).json({
    //   success: true,
    //   message: "Public Community Joined SuccessFully",
    // });

    // private community --> join requests sent

    if (community.visibility === "Private") {
      if (community.joinRequests.includes(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Request Already Sent" });
      }
      community.joinRequests.push(userId);
      await community.save();

      return res
        .status(200)
        .json({ success: true, message: "Join Request Sent To Admin Success" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCommunityDetails = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user._id;
    // console.log("loged in user getCommunityDetails userid = ", userId);
    // console.log("getCommunityDetails communityId from url = ", communityId);
    const community = await Community.findById(communityId);

    const isAdmin = community.userId.equals(userId);
    const isMember = community.members.includes(userId);

    // console.log(" getCommunityDetails isAdmin  = ", isAdmin);
    // console.log("getCommunityDetails isMember = ", isMember);

    if (community.visibility === "Private" && !isAdmin && !isMember) {
      return res.status(403).json({
        message: "Private community. Access denied",
      });
    }

    // console.log(" final community data sent to front end = m", community);
    res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMembers = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const { communityId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid community id",
      });
    }

    const community = await Community.findById(communityId)
      .populate("members", "email _id")
      .populate("userId", "email _id");

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is admin
    const isAdmin = community.userId._id.toString() === userId.toString();

    // Return members + admin status
    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: {
        members: community.members,
        joinRequests: community.joinRequests, // Send full array
        isAdmin: isAdmin,
        adminId: community.userId._id,
      },
    });
  } catch (error) {
    // console.error("Get members error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
