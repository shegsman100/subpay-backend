import { Router } from "express";
import {
  createVirtualCard,
  getUserVirtualCards,
  updateCardStatus,
} from "../controllers/card.controller.js";
import { getUserTransactions } from "../controllers/transaction.controller.js";
import {
  createSubscription,
  getUserSubscriptions,
  triggerBillingSweep,
} from "../controllers/subscription.controller.js";

// Dynamically pick whichever export exists in auth.middleware.js
import * as authModule from "../middleware/auth.middleware.js";

const authMiddleware =
  authModule.default ||
  authModule.authenticate ||
  authModule.verifyToken ||
  authModule.protect ||
  Object.values(authModule)[0];

const router = Router();

// Protect all API endpoints
router.use(authMiddleware);

// Card Routes
router.post("/cards", createVirtualCard);
router.get("/cards", getUserVirtualCards);
router.patch("/cards/:cardId/status", updateCardStatus);

// Transaction Routes
router.get("/transactions", getUserTransactions);

// Subscription Routes
router.post("/subscriptions", createSubscription);
router.get("/subscriptions", getUserSubscriptions);
router.post("/subscriptions/process-billing", triggerBillingSweep);

export default router;
