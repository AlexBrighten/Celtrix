import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
  if (!MONGO_URI || MONGO_URI === "your_mongodb_uri_here") {
    console.warn("⚠️  No MONGO_URI provided. Skipping DB connection.");
    return null;
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Atlas connected");
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB Atlas connection failed:", err.message);
    return null;
  }
}

export { connectDB };
