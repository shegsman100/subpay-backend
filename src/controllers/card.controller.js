import db from "../config/db.js";
import crypto from "crypto";
import { logTransaction } from "../services/transaction.service.js";

// Helper function to generate mock card metadata matching the contract schema
const generateCardDetails = () => {
  const rawNumber = `5399${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`;
  const last4 = rawNumber.slice(-4);
  const cardHash = crypto.createHash("sha256").update(rawNumber).digest("hex");
  const providerCardId = `prov_card_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const expiryMonth = 12; // Integer per contract schema
  const expiryYear = 2029; // Integer per contract schema

  return {
    rawNumber,
    last4,
    cardHash,
    providerCardId,
    expiryMonth,
    expiryYear,
  };
};

// Create / Issue a Virtual Card with immutable ledger logging
export const createVirtualCard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardType = "MASTERCARD", initialBalance = 0 } = req.body;

    // Find the user's wallet for funding check
    const wallet = await db.orm.public.Wallet.first({ userId });
    const fundAmount = parseFloat(initialBalance || 0);

    if (fundAmount > 0) {
      if (!wallet) {
        return res.status(404).json({
          status: "error",
          message: "Wallet not found to fund virtual card.",
        });
      }

      const walletBalance = parseFloat(wallet.balance || 0);
      if (walletBalance < fundAmount) {
        return res.status(400).json({
          status: "error",
          message: "Insufficient wallet balance to fund virtual card.",
        });
      }

      // Deduct from wallet
      const newWalletBalance = (walletBalance - fundAmount).toFixed(2);
      await db.orm.public.Wallet.update({
        id: wallet.id,
        balance: newWalletBalance,
      });

      // Log immutable debit transaction
      await logTransaction({
        walletId: wallet.id,
        amount: fundAmount,
        type: "DEBIT",
        description: `Virtual card issuance funding (${cardType})`,
        channel: "WALLET",
      });
    }

    // Generate card metadata matching contract fields
    const {
      rawNumber,
      last4,
      cardHash,
      providerCardId,
      expiryMonth,
      expiryYear,
    } = generateCardDetails();

    // Create virtual card record using exact contract fields
    const virtualCard = await db.orm.public.VirtualCard.create({
      userId,
      providerCardId,
      cardBrand: cardType,
      cardHash,
      last4,
      expiryMonth,
      expiryYear,
      balance: fundAmount.toFixed(2),
      currency: wallet ? wallet.currency : "NGN",
      status: "ACTIVE",
    });

    res.status(201).json({
      status: "success",
      message: "Virtual card created successfully!",
      data: {
        cardId: virtualCard.id,
        cardNumber: rawNumber,
        last4: virtualCard.last4,
        cardBrand: virtualCard.cardBrand,
        expiry: `${virtualCard.expiryMonth}/${virtualCard.expiryYear}`,
        balance: virtualCard.balance,
        currency: virtualCard.currency,
        status: virtualCard.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create virtual card",
      error: error.message,
    });
  }
};

// Retrieve all virtual cards for the authenticated user
export const getUserVirtualCards = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cards = await db.orm.public.VirtualCard.where({
      userId,
    }).all();

    res.status(200).json({
      status: "success",
      count: cards ? cards.length : 0,
      data: cards || [],
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve virtual cards",
      error: error.message,
    });
  }
};

// Update Virtual Card Status (ACTIVE, FROZEN, TERMINATED)
export const updateCardStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.params;
    const { status } = req.body;

    const validStatuses = ["ACTIVE", "FROZEN", "TERMINATED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status. Must be ACTIVE, FROZEN, or TERMINATED.",
      });
    }

    // Verify card belongs to user
    const card = await db.orm.public.VirtualCard.first({ id: cardId, userId });
    if (!card) {
      return res.status(404).json({
        status: "error",
        message: "Virtual card not found.",
      });
    }

    const updatedCard = await db.orm.public.VirtualCard.update({
      id: cardId,
      status,
    });

    res.status(200).json({
      status: "success",
      message: `Virtual card status updated to ${status}`,
      data: updatedCard,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update card status",
      error: error.message,
    });
  }
};
