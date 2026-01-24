import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import colors from "colors";
import connectDB from "./Database/db.js";
import route from "./routes/route.js";

// dotenv configure

dotenv.config();

// Database
connectDB();

// PORT
const PORT = process.env.PORT || 8080;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes

app.use("/api/auth", route);

app.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`.bold.bgCyan);
});
