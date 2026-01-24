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

// export const getAllCommunityMembers = async (req, res) => {
//   try {
//     const communityId = req.params.id;
//     // console.log("Community ID:", communityId);

//     if (!mongoose.Types.ObjectId.isValid(communityId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Community ID",
//       });
//     }

//     const community = await Community.aggregate([
//       {
//         $match: {
//           _id: new mongoose.Types.ObjectId(communityId),
//         },
//       },
//       {
//         $addFields: {
//           members: { $ifNull: ["$members", []] },
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "members",
//           foreignField: "_id",
//           as: "membersList",
//         },
//       },
//       {
//         $project: {
//           "membersList.password": 0,
//           "membersList.__v": 0,
//           "membersList.token": 0,
//         },
//       },
//     ]);

//     if (!community || community.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Community Not Found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: community[0].membersList,
//     });
//     // console.log("community[0].membersList = ", community[0].membersList);
//   } catch (error) {
//     console.error("Get Members Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server Error",
//     });
//   }
// };

export const getAllCommunityMembers = async (req, res) => {
  try {
    const communityId = req.params.id;
    const userId = req.user._id;

    // console.log(" getAllCommunityMembers userid = ", userId);
    // console.log("getAllCommunityMembers communityId from url = ", communityId);
    if (!mongoose.Types.ObjectId.isValid(communityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Community ID",
      });
    }

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community Not Found",
      });
    }

    const isMember = community.members.some(
      (memberId) => memberId.toString() === userId.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You must join the community to view it",
      });
    }

    // ✅ Now fetch members
    const members = await Community.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(communityId),
        },
      },
      {
        $lookup: {
          from: "auths",
          localField: "members",
          foreignField: "_id",
          as: "membersList",
        },
      },
      {
        $project: {
          "membersList.password": 0,
          "membersList.__v": 0,
          "membersList.token": 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: members[0].membersList,
    });
  } catch (error) {
    console.error("Get Members Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Approve private community join Requests API

export const approvePrivateCommunityJoinRequests = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community Not Found" });
    }

    if (community.members.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Join Request Already Sent" });
    }

    if (community.userId.toString() !== adminId) {
      return res
        .status(400)
        .json({ success: false, message: "Only Admin can Approve" });
    }

    if (!community.joinRequests.includes(userId)) {
      return res
        .status(404)
        .json({ success: false, message: "No Join Requests Found" });
    }

    community.joinRequests.pull(userId);
    community.members.push(userId);
    await community.save();

    return res
      .status(200)
      .json({ success: false, message: "Approve Request Success By Admin" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// reject private community request API
export const rejectPrivateCommunityJoinRequests = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { communityId, userId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community Not Found" });
    }

    if (community.userId.toString() !== adminId) {
      return res
        .status(400)
        .json({ success: false, message: "Only Admin Can Reject" });
    }

    community.joinRequests.pull(userId);
    await community.save();

    return res
      .status(200)
      .json({ success: true, message: "User Rejected By Admin" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "" });
  }
};

// all private community data get (Fetch) API

// export const getCommunityDetails = async (req, res) => {
//   try {
//     const { communityId } = req.params;
//     const userId = new mongoose.Types.ObjectId(req.user.id);
//     console.log("loged in user getCommunityDetails userid = ", userId);
//     console.log("getCommunityDetails communityId from url = ", communityId);

//     const data = await Community.aggregate([
//       {
//         $match: {
//           _id: new mongoose.Types.ObjectId(communityId),
//           // userId: userId,
//           isDeleted: false,
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "members",
//           foreignField: "_id",
//           as: "members",
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "joinRequests",
//           foreignField: "_id",
//           as: "joinRequests",
//         },
//       },
//       {
//         $addFields: {
//           isAdmin: { $eq: ["$userId", userId] },
//           isMember: { $in: [userId, "$members._id"] },
//           requestSent: { $in: [userId, "$joinRequests._id"] },
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           comunityName: 1,
//           communityDisc: 1,
//           visibility: 1,

//           isAdmin: 1,
//           isMember: 1,
//           requestSent: 1,

//           members: {
//             $map: {
//               input: "$members",
//               as: "m",
//               in: { _id: "$$m._id", email: "$$m.email" },
//             },
//           },
//           joinRequests: {
//             $map: {
//               input: "$joinRequests",
//               as: "j",
//               in: { _id: "$$j._id", email: "$$j.email" },
//             },
//           },
//         },
//       },
//     ]);

//     res.status(200).json(data[0]);
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
////

// export const getCommunityDetails = async (req, res) => {
//   try {
//     const { communityId } = req.params;
//     const userId = new mongoose.Types.ObjectId(req.user._id);
//     console.log("get community details controller :", req.user._id);

//     const data = await Community.aggregate([
//       {
//         $match: {
//           _id: new mongoose.Types.ObjectId(communityId),
//           // userId: userId,
//           isDeleted: false,
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "members",
//           foreignField: "_id",
//           as: "members",
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "joinRequests",
//           foreignField: "_id",
//           as: "joinRequests",
//         },
//       },
//       {
//         $addFields: {
//           isAdmin: { $eq: ["$userId", userId] },
//           isMember: { $in: [userId, "$members._id"] },
//           requestSent: { $in: [userId, "$joinRequests._id"] },
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           comunityName: 1,
//           communityDisc: 1,
//           visibility: 1,
//           isAdmin: 1,
//           isMember: 1,
//           requestSent: 1,
//           members: {
//             $map: {
//               input: "$members",
//               as: "m",
//               in: { _id: "$$m._id", email: "$$m.email" },
//             },
//           },
//           joinRequests: {
//             $map: {
//               input: "$joinRequests",
//               as: "j",
//               in: { _id: "$$j._id", email: "$$j.email" },
//             },
//           },
//         },
//       },
//     ]);

//     const community = data[0];

//     // 🔒 PRIVATE ACCESS BLOCK
//     if (
//       community.visibility === "Private" &&
//       !community.isAdmin &&
//       !community.isMember
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Private community. Access denied.",
//       });
//     }

//     res.status(200).json(community);
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getCommunityDetails = async (req, res) => {
//   try {
//     const { communityId } = req.params;
//     const userId = new mongoose.Types.ObjectId(req.user.id);
//     console.log("get community details controler code = ", userId);

//     // 1️⃣ Basic community
//     const communityBase = await Community.findOne({
//       _id: communityId,
//       isDeleted: false,
//     });

//     if (!communityBase) {
//       return res.status(404).json({ message: "Community not found" });
//     }

//     const isAdmin = communityBase.userId.equals(userId);

//     const isMember = await Community.exists({
//       _id: communityId,
//       members: userId,
//     });

//     // 2️⃣ PRIVATE ACCESS CHECK
//     if (communityBase.visibility === "Private" && !isAdmin && !isMember) {
//       return res.status(403).json({
//         success: false,
//         message: "Private community. Send join request first.",
//       });
//     }

//     // 3️⃣ Full data only AFTER access allowed
//     const data = await Community.aggregate([
//       { $match: { _id: communityBase._id } },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "members",
//           foreignField: "_id",
//           as: "members",
//         },
//       },
//       {
//         $lookup: {
//           from: "auths",
//           localField: "joinRequests",
//           foreignField: "_id",
//           as: "joinRequests",
//         },
//       },
//     ]);

//     res.status(200).json(data[0]);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getAllCommunities = async (req, res) => {
//   try {
//     const userId = new mongoose.Types.ObjectId(req.user._id);

//     console.log("getall community controler code = ", userId);
//     const data = await Community.aggregate([
//       {
//         $match: { isDeleted: false },
//       },
//       {
//         $addFields: {
//           isAdmin: { $eq: ["$userId", userId] },
//           isMember: { $in: [userId, "$members"] },
//           requestSent: { $in: [userId, "$joinRequests"] },
//         },
//       },
//       {
//         $project: {
//           comunityName: 1,
//           communityDisc: 1,
//           visibility: 1,
//           isAdmin: 1,
//           isMember: 1,
//           requestSent: 1,
//         },
//       },
//     ]);

//     res.status(200).json({ success: true, data });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getCommunityDetails = async (req, res) => {
//   try {
//     console.log("getAllCommunity API hit");

//     const userId = req.user._id; //  logged in user id
//     console.log("userId Loged In getCommunity Details userId = ", userId);
//     const data = await Community.find({ isDeleted: false }).lean();
//     console.log("Raw community data", data);

//     const finalData = data.map((c) => ({
//       ...c,
//       isAdmin: c.userId.toString() === userId, //  admin check
//       isMember: c.members.some((m) => m.toString() === userId), //  member check
//       isRequested: c.joinRequests.some((r) => r.toString() === userId), // request sent check
//     }));

//     console.log("Final community list with flags", finalData);

//     res.status(200).json({ success: true, data: finalData });
//   } catch (error) {
//     console.log("getAllCommunity error", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const getCommunityDetails = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user._id;
    console.log("loged in user getCommunityDetails userid = ", userId);
    console.log("getCommunityDetails communityId from url = ", communityId);
    const community = await Community.findById(communityId);

    const isAdmin = community.userId.equals(userId);
    const isMember = community.members.includes(userId);

    console.log(" getCommunityDetails isAdmin  = ", isAdmin);
    console.log("getCommunityDetails isMember = ", isMember);

    if (community.visibility === "Private" && !isAdmin && !isMember) {
      return res.status(403).json({
        message: "Private community. Access denied",
      });
    }

    console.log(" final community data sent to front end = m", community);
    res.status(200).json({ success: true, data: community });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
