import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Mongodb Connected Successfully...".bgGreen);
  } catch (error) {
    console.error("Mongod Error", error);
    console.log("Mongodb Connection Failed!!!".bgRed);
  }
};

export default connectDB;
