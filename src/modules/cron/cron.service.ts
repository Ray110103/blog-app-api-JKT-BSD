import * as cron from "node-cron";
import { PrismaService } from "../prisma/prisma.service";
import { AuctionService } from "../auction/auction.service";
import { AuctionStatsService } from "../auction-stats/auction-stats.service";
import { EmailService } from "../mail/email.service";
import { OrderService } from "../../features/order/order.service";

export class CronService {
  prisma: PrismaService;
  orderService: OrderService;
  auctionService: AuctionService;
  auctionStatsService: AuctionStatsService;
  emailService: EmailService;

  constructor() {
    this.prisma = new PrismaService();
    this.orderService = new OrderService();
    this.auctionService = new AuctionService();
    this.auctionStatsService = new AuctionStatsService();
    this.emailService = new EmailService();
  }

  /**
   * Start all cron jobs
   */
  start = () => {
    console.log("🕐 Starting cron jobs...");

    // Auto-complete orders shipped 7+ days ago (Daily at 2:00 AM)
    cron.schedule("0 2 * * *", async () => {
      console.log("🕐 [CRON] Auto-completing shipped orders...");
      try {
        const result = await this.orderService.autoCompleteOrders();
        console.log(`✅ [CRON] Order auto-completion completed: ${result.message}`);
      } catch (error) {
        console.error("❌ [CRON] Order auto-completion failed:", error);
      }
    });

    // Auto-end auctions (Every 5 minutes)
    cron.schedule("*/5 * * * *", async () => {
      console.log("🕐 [CRON] Checking for auctions to end...");
      try {
        const result = await this.autoEndAuctions();
        console.log(`✅ [CRON] Auction auto-end completed: ${result.message}`);
      } catch (error) {
        console.error("❌ [CRON] Auction auto-end failed:", error);
      }
    });

    // Detect payment failures (Every hour)
    cron.schedule("0 * * * *", async () => {
      console.log("🕐 [CRON] Detecting payment failures...");
      try {
        const result = await this.auctionStatsService.detectPaymentFailures();
        console.log(`✅ [CRON] Payment failure detection completed: ${result.message}`);
      } catch (error) {
        console.error("❌ [CRON] Payment failure detection failed:", error);
      }
    });

    // ✅ NEW: Auto-cancel unpaid auction orders (Every 10 minutes)
    cron.schedule("*/10 * * * *", async () => {
      console.log("🕐 [CRON] Checking for unpaid auction orders...");
      try {
        const result = await this.autoCancelUnpaidAuctionOrders();
        console.log(`✅ [CRON] Unpaid auction orders check completed: ${result.message}`);
      } catch (error) {
        console.error("❌ [CRON] Unpaid auction orders check failed:", error);
      }
    });

    console.log("✅ Cron jobs started successfully");
    console.log("📅 Schedule:");
    console.log("   - Auto-complete orders: Daily at 2:00 AM");
    console.log("   - Auto-end auctions: Every 5 minutes");
    console.log("   - Detect payment failures: Every hour");
    console.log("   - Auto-cancel unpaid auction orders: Every 10 minutes");  // ✅ NEW
  };

  /**
   * Auto-end auctions (24 hours after last bid)
   */
  autoEndAuctions = async () => {
    const now = new Date();

    console.log(`🔍 Checking for auctions to end (current time: ${now.toISOString()})...`);

    // Find active auctions where 24 hours have passed since last bid
    const auctionsToEnd = await this.prisma.auction.findMany({
      where: {
        status: "ACTIVE",
        lastBidTime: {
          not: null,
          lte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        bids: {
          orderBy: {
            bidAmount: "desc",
          },
          take: 1,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log(`⚠️ Found ${auctionsToEnd.length} auctions to end`);

    for (const auction of auctionsToEnd) {
      try {
        // Determine winner
        const winner = auction.bids[0];

        if (!winner) {
          // No bids - cancel auction
          console.log(`❌ Auction ${auction.id} has no bids, cancelling...`);

          await this.prisma.$transaction(async (tx) => {
            await tx.auction.update({
              where: { id: auction.id },
              data: {
                status: "CANCELLED",
                endTime: now,
                failureReason: "no_bids",
              },
            });

            // ✅ RESTORE STOCK
            await tx.productVariant.update({
              where: { id: auction.variantId },
              data: {
                stock: { increment: auction.quantity },
              },
            });
          });

          console.log(`✅ Auction ${auction.id} cancelled (no bids)`);
          continue;
        }

        // Set winner and payment deadline
        const paymentDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

        await this.prisma.auction.update({
          where: { id: auction.id },
          data: {
            status: "ENDED",
            endTime: now,
            winnerId: winner.userId,
            paymentDeadline: paymentDeadline,
          },
        });

        // Update user stats
        await this.auctionStatsService.incrementWon(winner.userId);

        // Send email to winner
        try {
          await this.emailService.sendAuctionWon(winner.user.email, {
            userName: winner.user.name,
            productName: auction.product.name,
            winningBid: Number(auction.currentBid),
            paymentDeadline: paymentDeadline,
            auctionUrl: `${process.env.FRONTEND_URL}/auctions/${auction.id}`,
          });
          console.log(`✅ Winner notification sent to ${winner.user.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send winner email to ${winner.user.email}:`, emailError);
        }

        console.log(`✅ Auction ${auction.id} ended. Winner: User ${winner.userId}`);
      } catch (error) {
        console.error(`❌ Failed to end auction ${auction.id}:`, error);
      }
    }

    return {
      message: `Ended ${auctionsToEnd.length} auctions`,
      count: auctionsToEnd.length,
      auctions: auctionsToEnd.map((a) => a.id),
    };
  };

  /**
   * ✅ NEW: Auto-cancel unpaid auction orders
   * Runs every 10 minutes to check for expired payment deadlines
   */
  autoCancelUnpaidAuctionOrders = async () => {
    const now = new Date();

    console.log(`🔍 Checking for unpaid auction orders (deadline before ${now.toISOString()})...`);

    // Find orders with:
    // 1. paymentDeadline has passed
    // 2. Status is PENDING or WAITING_FOR_CONFIRMATION
    // 3. Has linked auctions
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        paymentDeadline: {
          not: null,
          lte: now,
        },
        status: {
          in: ["PENDING", "WAITING_FOR_CONFIRMATION"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        auctions: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            variant: true,
          },
        },
      },
    });

    // Filter only orders that have linked auctions
    const auctionOrders = expiredOrders.filter((order) => order.auctions && order.auctions.length > 0);

    console.log(`⚠️ Found ${auctionOrders.length} unpaid auction orders`);

    for (const order of auctionOrders) {
      try {
        console.log(`❌ Cancelling order ${order.orderNumber} (payment deadline exceeded)`);

        await this.prisma.$transaction(async (tx) => {
          // 1. Cancel order
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              cancellationReason: "Payment deadline exceeded",
              cancelledAt: now,
            },
          });

          // 2. Add order status history
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: "CANCELLED",
              notes: "Auto-cancelled: Payment deadline exceeded",
              createdBy: "system",
            },
          });

          // 3. Update auctions to PAYMENT_FAILED and restore stock
          for (const auction of order.auctions) {
            await tx.auction.update({
              where: { id: auction.id },
              data: {
                status: "PAYMENT_FAILED",
                failureReason: "payment_deadline_exceeded",
                orderId: null, // Unlink from order
              },
            });

            // ✅ RESTORE STOCK
            await tx.productVariant.update({
              where: { id: auction.variantId },
              data: {
                stock: { increment: auction.quantity },
              },
            });

            console.log(`✅ Stock restored for auction ${auction.id}: +${auction.quantity}`);

            // 4. Record failure
            await tx.auctionFailure.create({
              data: {
                auctionId: auction.id,
                winnerId: order.userId,
                winningBid: auction.currentBid,
                paymentDeadline: order.paymentDeadline!,
                reason: "payment_deadline_exceeded",
              },
            });
          }

          // 5. Update user stats (increment totalFailed)
          const stats = await tx.userAuctionStats.upsert({
            where: { userId: order.userId },
            create: {
              userId: order.userId,
              totalWon: 0,
              totalPaid: 0,
              totalFailed: 1,
              lastFailedAt: now,
            },
            update: {
              totalFailed: { increment: 1 },
              lastFailedAt: now,
            },
          });

          // 6. Check if user should be banned (3+ failures)
          if (stats.totalFailed >= 3) {
            const banDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
            const bannedUntil = new Date(now.getTime() + banDuration);

            await tx.userAuctionStats.update({
              where: { userId: order.userId },
              data: { bannedUntil },
            });

            console.log(`⚠️ User ${order.userId} banned until ${bannedUntil.toISOString()}`);

            // Send ban email
            try {
              await this.emailService.sendUserBanned(order.user.email, {
                userName: order.user.name,
                failureCount: stats.totalFailed,
                bannedUntil: bannedUntil,
              });
            } catch (emailError) {
              console.error(`❌ Failed to send ban email to ${order.user.email}:`, emailError);
            }
          }
        });

        // Send payment failure email to user
        try {
          await this.emailService.sendPaymentDeadlineExceeded(order.user.email, {
            userName: order.user.name,
            orderNumber: order.orderNumber,
            paymentDeadline: order.paymentDeadline!,
            itemCount: order.auctions.length,
          });
          console.log(`✅ Payment failure email sent to ${order.user.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send payment failure email to ${order.user.email}:`, emailError);
        }

        console.log(`✅ Order ${order.orderNumber} cancelled and auctions restored`);
      } catch (error) {
        console.error(`❌ Failed to cancel order ${order.orderNumber}:`, error);
      }
    }

    return {
      message: `Cancelled ${auctionOrders.length} unpaid auction orders`,
      count: auctionOrders.length,
      orders: auctionOrders.map((o) => o.orderNumber),
    };
  };
}