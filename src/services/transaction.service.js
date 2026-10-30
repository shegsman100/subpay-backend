import db from "../config/db.js";
import crypto from "crypto";

/**
 * Record an immutable financial transaction in the ledger.
 */
export const logTransaction = async ({
  walletId,
  amount,
  type, // "CREDIT" or "DEBIT"
  description,
  channel = "BANK_TRANSFER",
  fee = "0.00",
  status = "SUCCESS",
}) => {
  try {
    const reference = `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const transaction = await db.orm.public.Transaction.create({
      walletId,
      amount: parseFloat(amount).toFixed(2),
      type,
      status,
      reference,
      fee: parseFloat(fee).toFixed(2),
      channel,
      description,
    });

    return transaction;
  } catch (error) {
    console.error("Failed to log transaction:", error.message);
    throw new Error("Ledger audit logging failed.");
  }
};
