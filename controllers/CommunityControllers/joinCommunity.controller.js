import Community from "../../models/CommunityModels/community.model.js";

export const joinCommunity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    if (community.members.includes(userId)) {
      return res.status(400).json({ message: "Already joined" });
    }

    // PUBLIC → Direct Join
    if (community.visibility === "Public") {
      community.members.push(userId);
      await community.save();

      return res.json({ success: true, message: "Joined public community" });
    }

    // PRIVATE → Request
    if (community.visibility === "Private") {
      if (community.joinRequests.includes(userId)) {
        return res.status(400).json({ message: "Request already sent" });
      }

      community.joinRequests.push(userId);
      await community.save();

      return res.json({ success: true, message: "Request sent to admin" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
