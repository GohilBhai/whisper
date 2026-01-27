import Auth from "../../models/AuthModels/auth.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  signinValidation,
  signupValidation,
} from "../../validations/authValidation.js";
import sendMail from "../../utils/sendEmail.js";
import OTP from "../../models/OTPModels/auth.otp.js";
import { OAuth2Client } from "google-auth-library";
import Profile from "../../models/ProfileModels/profile.js";
import Post from "../../models/PostModels/post.model.js";
import Community from "../../models/CommunityModels/community.model.js";

/* ================= SIGN UP ================= */

export const signup = async (req, res) => {
  try {
    // for joi validation library

    const { error } = signupValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // signup code start here

    const { email, password, confirmpassword } = req.body;

    if (!email || !password || !confirmpassword) {
      return res
        .status(400)
        .json({ success: false, message: "All Fields Are Required" });
    }
    const existingUser = await Auth.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User Already Registerd Please Try Different Email",
      });
    }

    // password hashing

    const hashPassword = await bcrypt.hash(password, 10);

    // this is not good for password and confirmpassword checking for sending req to backend  ❌❌
    // if (password !== confirmpassword) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Password and confirm password are NoT Matched!",
    //   });
    // }

    const newUser = new Auth({
      email,
      password: hashPassword,
      confirmpassword: hashPassword,
    });
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User Registerd Successfully....",
      data: {
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("signup Error : ", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/* ================= SIGN IN  ================= */

export const signin = async (req, res) => {
  try {
    const { error } = signinValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All Fields Are Required" });
    }
    const user = await Auth.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid User Credentials" });
    }

    // password hashing

    const comparePassword = await bcrypt.compare(password, user.password);

    if (!comparePassword) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email Or Password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // random username generated

    const generateRandomName = () => {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < 10; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    };

    const username = generateRandomName();

    user.username = username;

    // token store after login in database
    user.token = token;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "User Signin Successfully....",
      token,
      username,
      user: { _id: user._id, email: user.email },
    });
  } catch (error) {
    console.error("signin Error : ", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

/* ================= FORGOT PASSWORD ================= */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validate email
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required!" });
    }

    // 2. Check user exists
    const user = await Auth.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist!" });
    }

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 4. Check OTP record
    let otpRecord = await OTP.findOne({ email });

    if (otpRecord) {
      // Update existing OTP
      otpRecord.otp = otp;
      otpRecord.otpExpiry = otpExpiry;
    } else {
      // Create new OTP record
      otpRecord = new OTP({
        email,
        otp,
        otpExpiry,
      });
    }

    await otpRecord.save();

    // 5. Send email
    await sendMail({
      email: user.email,
      html: `
        <h2>Forgot Password</h2>
        <p>Your OTP is given below:</p>
        <h1 style="color:blue;">${otp}</h1>
        <p>This OTP is valid for 10 minutes only.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <br />
        <p>Thank you,<br />Support Team</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to email successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* ================= VERIFY OTP  ================= */

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP Is Required" });
    }

    // ✅ find OTP
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    // ✅ match OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // ✅ expiry check (FIXED)
    if (Date.now() > otpRecord.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // optional: invalidate OTP after use
    otpRecord.otp = null;
    otpRecord.otpExpiry = null;

    await otpRecord.save();

    // generate token using jwt

    const token = jwt.sign({ id: otpRecord._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    // send reset password link by mail
    await sendMail({
      email: otpRecord.email,
      html: `
        <h2>Reset Password</h2>

         <a href="http://192.168.29.213:5173/reset-password/${token}"  style="
            background:#4f46e5;
            color:#ffffff;
           ">
      Reset Password
    </a>
        <p>This Link is valid for 60 minutes only.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <br />
        <p>Thank you,<br />Support Team</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully Please",
      token,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= RESET PASSWORD ================= */

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { email, newPassword, confirmpassword } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("DECODED PAYLOAD", JSON.stringify(decoded));
    const data = await OTP.findById(decoded?.id);

    const user = await Auth.findOne({ email: data?.email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // if (newPassword !== confirmpassword) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "password do not match" });
    // }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      // console.log("USER DATA", JSON.stringify(user));
      await Auth.findByIdAndUpdate(user._id, {
        $set: { password: hashedPassword },
      });

      return res
        .status(200)
        .json({ success: true, message: "Password reset successful" });
    } catch (error) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OR Expired Token" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= Sign Out  ================= */

export const signout = async (req, res) => {
  try {
    return res
      .status(200)
      .json({ success: true, message: "Sign Out Successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GOOGLE LOGIN  ================= */

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5000/auth/google/callback",
);

// STEP 1: Redirect user to Google
export const googleAuth = (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
  });

  res.redirect(url);
};

// STEP 2: Google callback
export const googleAuthLogin = async (req, res) => {
  try {
    const { code } = req.query;

    console.log("code = ", code);
    console.log("code = ", req.query);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const ticket = oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, picture } = ticket.getPayload();

    // Save / find user
    let user = await Auth.findOne({ email });
    if (!user) {
      user = await Auth.create({
        email,
        avatar: picture,
        provider: "google",
      });
    }

    // Create JWT
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend with token
    res.redirect(`http://192.168.29.213:5173/login-success?token=${jwtToken}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Google Auth Failed" });
  }
};

/* ================= PROFILE PAGE  ================= */

export const profile = async (req, res) => {
  try {
    const { currentPassword, password, confirmpassword } = req.body;
    // console.log("req.body = ", req.body);

    if (!currentPassword || !password || !confirmpassword) {
      return res
        .status(400)
        .json({ success: false, message: "All Fields Are Required" });
    }

    // if (password !== confirmpassword) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Password Do Not Match!" });
    // }

    const user = await Auth.findById(req.user.id);
    // console.log("user = ", user);

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid User Credentials" });
    }

    // console.log("user old current user = ", user);
    // console.log("user old current password = ", user.password);

    // ✅ Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Unable to verify your credentials.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password Chaned SuccessFully" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* ================= PROFILE IMAGE MODAL  ================= */

export const profileImage = async (req, res) => {
  try {
    // ✅ Validate image
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile Image is Required. Please select an image",
      });
    }
    // ✅ REAL image URL from Cloudinary
    const imageUrl = req.file.path;

    // console.log("imageUrl == ", imageUrl);

    // add this into aprofileIamges for different user for diffrent image ✅✅
    // user: req.user._id,
    // imageUrl: req.file.path,

    const profileImages = await Profile.create({
      user: req.user.id, // comes from JWT middleware
      imageUrl: imageUrl, // if doesn't work so add remove inside this and only take imageUrl
    });

    return res
      .status(200)
      .json({ success: true, message: "Image Upload Success", profileImages });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET PROFILE IMAGE  ================= */

export const getProfileImage = async (req, res) => {
  try {
    // if doesnt work so remove this content and below uncomment please ✅❎
    const profileImage = await Profile.findOne({ user: req.user.id })
      .populate("user", "email")
      .sort({ createdAt: -1 });

    // console.log("profileImage =", profileImage);

    // const profileImage = await Profile.findOne().sort({ createdAt: -1 });

    //  New user – no image yet (NOT an error)
    if (!profileImage) {
      return res.status(200).json({
        success: true,
        imageUrl: null,
        email: req.user.email, // or from populated user if available
      });
    }
    return res.status(200).json({
      success: true,
      imageUrl: profileImage.imageUrl,
      email: profileImage.user.email,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const searchRoutes = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(200).json({
        communities: [],
        posts: [],
      });
    }

    const regex = new RegExp(q.trim(), "i");

    // 🔍 SEARCH COMMUNITIES (PURE QUERY)
    const communities = await Community.find(
      { communityName: regex },
      { communityName: 1, isPrivate: 1 }, // projection
    ).limit(10);

    // 🔍 SEARCH POSTS (PURE QUERY)
    const posts = await Post.find(
      {
        $or: [{ title: regex }, { content: regex }],
      },
      {
        title: 1,
        content: 1,
        communityId: 1,
        createdAt: 1,
      },
    ).limit(10);

    return res.status(200).json({
      communities,
      posts,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      message: "Search failed",
    });
  }
};
