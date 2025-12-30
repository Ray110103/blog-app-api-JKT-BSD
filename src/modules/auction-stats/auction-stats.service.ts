import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../mail/email.service";

export class AuctionStatsService {
  prisma: PrismaService;
  emailService: EmailService;

  constructor() {
    this.prisma = new PrismaService();
    this.emailService = new EmailService();
  }

  /**
   * Get user auction stats
   */
  getUserStats = async (userId: number) => {
    const stats = await this.prisma.userAuctionStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      // Create default stats
      return await this.prisma.userAuctionStats.create({
        data: { userId },
      });
    }

    return stats;
  };

  /**
   * ✅ NEW: Increment user's won count
   */
  incrementWon = async (userId: number) => {
    await this.prisma.userAuctionStats.upsert({
      where: { userId },
      create: {
        userId,
        totalWon: 1,
        totalPaid: 0,
        totalFailed: 0,
      },
      update: {
        totalWon: { increment: 1 },
      },
    });
  };

  /**
   * Increment user's paid count
   */
  incrementPaid = async (userId: number) => {
    await this.prisma.userAuctionStats.upsert({
      where: { userId },
      create: {
        userId,
        totalWon: 0,
        totalPaid: 1,
        totalFailed: 0,
      },
      update: {
        totalPaid: { increment: 1 },
      },
    });
  };

  /**
   * Increment user's failed count
   */
  incrementFailed = async (userId: number) => {
    const stats = await this.prisma.userAuctionStats.upsert({
      where: { userId },
      create: {
        userId,
        totalWon: 0,
        totalPaid: 0,
        totalFailed: 1,
        lastFailedAt: new Date(),
      },
      update: {
        totalFailed: { increment: 1 },
        lastFailedAt: new Date(),
      },
    });

    // Check if user should be banned (3+ failures)
    if (stats.totalFailed >= 3 && !stats.bannedUntil) {
      const banDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
      const bannedUntil = new Date(Date.now() + banDuration);

      await this.prisma.userAuctionStats.update({
        where: { userId },
        data: { bannedUntil },
      });

      // Get user info for email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        try {
          await this.emailService.sendUserBanned(user.email, {
            userName: user.name,
            failureCount: stats.totalFailed,
            bannedUntil: bannedUntil,
          });
        } catch (error) {
          console.error(`Failed to send ban email to ${user.email}:`, error);
        }
      }

      console.log(`⚠️ User ${userId} banned until ${bannedUntil.toISOString()}`);
    }

    return stats;
  };

  /**
   * Detect payment failures (Cron job)
   */
  detectPaymentFailures = async () => {
    const now = new Date();

    console.log(`🔍 Checking for payment failures (deadline before ${now.toISOString()})...`);

    // Find auctions with payment deadline passed and status still ENDED
    const failedAuctions = await this.prisma.auction.findMany({
      where: {
        status: "ENDED",
        paymentDeadline: {
          lte: now,
        },
        winnerId: {
          not: null,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: true,
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`⚠️ Found ${failedAuctions.length} failed auctions`);

    for (const auction of failedAuctions) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Update auction status
          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: "PAYMENT_FAILED",
              failureReason: "payment_deadline_exceeded",
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

          // Record failure
          await tx.auctionFailure.create({
            data: {
              auctionId: auction.id,
              winnerId: auction.winnerId!,
              winningBid: auction.currentBid,
              paymentDeadline: auction.paymentDeadline!,
              reason: "payment_deadline_exceeded",
            },
          });
        });

        // Increment user's failure count (handles ban logic)
        await this.incrementFailed(auction.winnerId!);

        // Send failure email
        if (auction.winner) {
          try {
            await this.emailService.sendPaymentDeadlineExceeded(auction.winner.email, {
              userName: auction.winner.name,
              productName: auction.product.name,
              winningBid: Number(auction.currentBid),
              paymentDeadline: auction.paymentDeadline!,
            });
            console.log(`✅ Failure email sent to ${auction.winner.email}`);
          } catch (error) {
            console.error(`Failed to send failure email to ${auction.winner.email}:`, error);
          }
        }

        console.log(`❌ Auction ${auction.id} marked as failed`);
      } catch (error) {
        console.error(`Failed to process auction ${auction.id}:`, error);
      }
    }

    return {
      message: `Detected ${failedAuctions.length} payment failures`,
      count: failedAuctions.length,
      auctions: failedAuctions.map((a) => a.id),
    };
  };

  /**
   * Get all failures (Admin)
   */
  getAllFailures = async (filters?: { userId?: number }) => {
    const where: any = {};

    if (filters?.userId) {
      where.winnerId = filters.userId;
    }

    const failures = await this.prisma.auctionFailure.findMany({
      where,
      include: {
        auction: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
              },
            },
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        failedAt: "desc",
      },
    });

    return failures.map((failure) => ({
      id: failure.id,
      auctionId: failure.auctionId,
      auction: failure.auction,
      winner: failure.winner,
      winningBid: Number(failure.winningBid),
      paymentDeadline: failure.paymentDeadline,
      failedAt: failure.failedAt,
      reason: failure.reason,
      wasRelisted: failure.wasRelisted,
    }));
  };
}