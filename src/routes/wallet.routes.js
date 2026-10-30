import express from "express";
import {
  getWallet,
  fundWallet,
  getTransactionHistory,
} from "../controllers/wallet.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected route to view wallet balance
router.get("/", verifyToken, getWallet);

// Protected route to fund wallet
router.post("/fund", verifyToken, fundWallet);

// Protected route to view transaction history
router.get("/transactions", verifyToken, getTransactionHistory);

export default router;
