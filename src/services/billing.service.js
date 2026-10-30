import db from "../config/db.js";
import { logTransaction } from "./transaction.service.js";

/**
 * Process all active subscriptions whose billing date has arrived.
 */
export const processBillingCycle = async () => {
  try {
    const subscriptions = await db.orm.public.Subscription.where({
      status: "ACTIVE",
    }).all();

    const now = new Date();
    const dueSubscriptions = (subscriptions || []).filter(
      (sub) => new Date(sub.nextBillingDate) <= now,
    );

    console.log(
      `[Billing Engine] Found ${dueSubscriptions.length} subscriptions due for billing.`,
    );

    for (const sub of dueSubscriptions) {
      try {
        const wallet = await db.orm.public.Wallet.first({ userId: sub.userId });
        if (!wallet) {
          console.warn(
            `[Billing Engine] Wallet not found for user: ${sub.userId}`,
          );
          continue;
        }

        const walletBalance = parseFloat(wallet.balance || 0);
        const subAmount = parseFloat(sub.amount);

        if (walletBalance < subAmount) {
          console.warn(
            `[Billing Engine] Insufficient funds for subscription ${sub.id}.`,
          );
          continue;
        }

        // Deduct from wallet
        const newWalletBalance = (walletBalance - subAmount).toFixed(2);
        await db.orm.public.Wallet.update({
          id: wallet.id,
          balance: newWalletBalance,
        });

        // Log immutable debit transaction
        await logTransaction({
          walletId: wallet.id,
          amount: subAmount,
          type: "DEBIT",
          description: `Recurring billing for ${sub.serviceName} (${sub.planName})`,
          channel: "SUBSCRIPTION",
        });

        // Advance next billing date and convert to Temporal.Instant
        const nextDate = new Date(sub.nextBillingDate);
        if (sub.billingCycle === "WEEKLY") {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (sub.billingCycle === "MONTHLY") {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (sub.billingCycle === "YEARLY") {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        const instantNextBillingDate = Temporal.Instant.from(
          nextDate.toISOString(),
        );

        await db.orm.public.Subscription.update({
          id: sub.id,
          nextBillingDate: instantNextBillingDate,
        });

        console.log(
          `[Billing Engine] Successfully billed subscription ${sub.id} for ${subAmount} ${sub.currency}`,
        );
      } catch (subError) {
        console.error(
          `[Billing Engine] Error processing subscription ${sub.id}:`,
          subError.message,
        );
      }
    }
  } catch (error) {
    console.error(
      "[Billing Engine] Failed to process billing cycle:",
      error.message,
    );
  }
};
