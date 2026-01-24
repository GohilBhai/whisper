import mongoose from "mongoose";

const AuthSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: { type: String },
  token: { type: String },
  username: { type: String },
  avatar: String,
  provider: String,
});

const Auth = new mongoose.model("Auth", AuthSchema);
export default Auth;
