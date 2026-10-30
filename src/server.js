import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import cardRoutes from "./routes/card.routes.js";
import apiRoutes from "./routes/api.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/wallets", walletRoutes);
app.use("/api/v1/cards", cardRoutes);
app.use("/api/v1", apiRoutes);

// Health Check Route
app.get("/", async (req, res) => {
  try {
    await db.orm.public.User.first();
    res.status(200).json({
      status: "success",
      message:
        "Welcome to SubPay API 🚀. Database connected successfully via Prisma 8!",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`SubPay server running live on http://localhost:${PORT}`);
});
