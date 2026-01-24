import Community from "../../models/CommunityModels/community.model.js";

export const getCommunityDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const community = await Community.findById(id);
  //   console.log("getcommunitydetails community = ", community);

  const isAdmin = community.userId.equals(userId);
  const isMember = community.members.includes(userId);

  if (community.visibility === "Private" && !isAdmin && !isMember) {
    return res.status(403).json({ message: "Private community access denied" });
  }

  res.status(200).json({ success: true, community });
};
