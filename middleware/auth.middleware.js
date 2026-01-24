import jwt from "jsonwebtoken";
import Auth from "../models/AuthModels/auth.model.js";

const protect = async (req, res, next) => {
  let token;

  //   console.log("Authorization header:", req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      //   console.log("decoded = ", decoded);

      req.user = await Auth.findById(decoded.id).select("-password");

      // console.log("Logged in user in auth middleware :", req.user._id);

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  }
  //   console.log("Authorization header == ", req.headers.authorization);

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, no token" });
  }
};

export default protect;
