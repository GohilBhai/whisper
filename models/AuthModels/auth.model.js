import mongoose from "mongoose";

const AuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      sparse: true, // Allows null values while maintaining uniqueness
    },
    password: {
      type: String,
      // Not required because Google OAuth users won't have a password
    },
    token: {
      type: String,
    },
    username: {
      type: String,
    },
    avatar: {
      type: String,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true, // Allows multiple null values
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
AuthSchema.index({ email: 1 });
AuthSchema.index({ googleId: 1 });

const Auth = mongoose.model("Auth", AuthSchema);

export default Auth;
