import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: true,
  },
  otp: {
    type: String,
    // required: true,
  },
  otpExpiry: {
    type: Date,
    // required: true,
  },
  token: {
    type: String,
  },
});

tokenSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.model("OTP", tokenSchema);

export default OTP;
