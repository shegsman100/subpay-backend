import express from "express";
import {
  createVirtualCard,
  getUserVirtualCards,
} from "../controllers/card.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Protected route to create a virtual card
router.post("/", verifyToken, createVirtualCard);

// Protected route to list user's virtual cards
router.get("/", verifyToken, getUserVirtualCards);

export default router;
