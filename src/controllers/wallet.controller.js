import db from "../config/db.js";

// Get logged-in user's wallet details
export const getWallet = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch the wallet associated with this user using Prisma 8
    const wallet = await db.orm.public.Wallet.first({ userId });

    if (!wallet) {
      return res
        .status(404)
        .json({ status: "error", message: "Wallet not found for this user." });
    }

    res.status(200).json({
      status: "success",
      data: wallet,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve wallet details",
      error: error.message,
    });
  }
};

// Fund user wallet (Simulation) & Log Transaction
export const fundWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, reference } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Please provide a valid funding amount greater than 0.",
        });
    }

    // Find the user's wallet
    const wallet = await db.orm.public.Wallet.first({ userId });

    if (!wallet) {
      return res
        .status(404)
        .json({ status: "error", message: "Wallet not found for this user." });
    }

    // Calculate new balance
    const currentBalance = parseFloat(wallet.balance || 0);
    const depositAmount = parseFloat(amount);
    const newBalance = (currentBalance + depositAmount).toFixed(2);

    // Update wallet balance using Prisma 8 direct update syntax
    const updatedWallet = await db.orm.public.Wallet.update({
      id: wallet.id,
      balance: newBalance,
    });

    // Generate reference if not provided
    const txReference = reference || `SUB-FUND-${Date.now()}`;

    // Create a transaction record in the ledger
    const transaction = await db.orm.public.Transaction.create({
      walletId: wallet.id,
      amount: depositAmount.toFixed(2),
      type: "CREDIT",
      status: "SUCCESS",
      reference: txReference,
      description: "Wallet Funding via Simulation",
    });

    res.status(200).json({
      status: "success",
      message: `Successfully funded wallet with ₦${depositAmount.toLocaleString()}`,
      data: {
        walletId: updatedWallet.id,
        newBalance: updatedWallet.balance,
        currency: updatedWallet.currency,
        transactionId: transaction.id,
        reference: transaction.reference,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fund wallet",
      error: error.message,
    });
  }
};

// Get user transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find the user's wallet
    const wallet = await db.orm.public.Wallet.first({ userId });

    if (!wallet) {
      return res
        .status(404)
        .json({ status: "error", message: "Wallet not found for this user." });
    }

    // Fetch transactions using Prisma 8 .where().all() query syntax
    const transactions = await db.orm.public.Transaction.where({
      walletId: wallet.id,
    }).all();

    res.status(200).json({
      status: "success",
      count: transactions ? transactions.length : 0,
      data: transactions || [],
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve transaction history",
      error: error.message,
    });
  }
};
