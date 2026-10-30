import db from "../config/db.js";
import { processBillingCycle } from "../services/billing.service.js";

// Create a new recurring subscription
export const createSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      serviceName,
      planName,
      amount,
      billingCycle = "MONTHLY",
      virtualCardId,
    } = req.body;

    // Verify virtual card exists and belongs to user
    const card = await db.orm.public.VirtualCard.first({
      id: virtualCardId,
      userId,
    });
    if (!card) {
      return res.status(404).json({
        status: "error",
        message: "Virtual card not found or does not belong to user.",
      });
    }

    if (card.status !== "ACTIVE") {
      return res.status(400).json({
        status: "error",
        message: `Cannot link subscription to a card with status: ${card.status}`,
      });
    }

    // Calculate next billing date
    const nextBillingDate = new Date();
    if (billingCycle === "WEEKLY") {
      nextBillingDate.setDate(nextBillingDate.getDate() + 7);
    } else if (billingCycle === "MONTHLY") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (billingCycle === "YEARLY") {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Convert to Temporal.Instant as required by the database codec
    const instantNextBillingDate = Temporal.Instant.from(
      nextBillingDate.toISOString(),
    );

    // Create subscription record
    const subscription = await db.orm.public.Subscription.create({
      userId,
      virtualCardId,
      serviceName,
      planName: planName || "Standard Plan",
      amount: parseFloat(amount).toFixed(2),
      currency: card.currency,
      billingCycle,
      status: "ACTIVE",
      nextBillingDate: instantNextBillingDate,
    });

    res.status(201).json({
      status: "success",
      message: "Subscription created successfully!",
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create subscription",
      error: error.message,
    });
  }
};

// Retrieve all subscriptions for authenticated user
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscriptions = await db.orm.public.Subscription.where({
      userId,
    }).all();

    res.status(200).json({
      status: "success",
      count: subscriptions ? subscriptions.length : 0,
      data: subscriptions || [],
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve subscriptions",
      error: error.message,
    });
  }
};

// Manually trigger billing sweep (for testing)
export const triggerBillingSweep = async (req, res) => {
  try {
    await processBillingCycle();
    res.status(200).json({
      status: "success",
      message: "Billing cycle sweep executed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Billing sweep failed",
      error: error.message,
    });
  }
};
