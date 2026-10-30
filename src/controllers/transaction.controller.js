import db from "../config/db.js";

export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find the user's wallet first
    const wallet = await db.orm.public.Wallet.first({ userId });
    if (!wallet) {
      return res.status(404).json({
        status: "error",
        message: "Wallet not found for user.",
      });
    }

    // Fetch transactions linked to this wallet
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
