import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../mail/email.service";
import { PlaceBidDto } from "./dto/place-bid.dto";

export class BidService {
  prisma: PrismaService;
  emailService: EmailService;
  outbidEmailThrottle: Map<number, number>;
  throttleWindow: number;

  constructor() {
    this.prisma = new PrismaService();
    this.emailService = new EmailService();
    this.outbidEmailThrottle = new Map();
    this.throttleWindow = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Place bid on auction
   */
  placeBid = async (userId: number, auctionId: number, data: PlaceBidDto) => {
    // 1. Get auction details
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: {
          select: {
            id: true,
            rarity: {
              select: { name: true },
            },
            condition: {
              select: { name: true },
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

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw new ApiError("Auction is not active", 400);
    }

    // 2. Check if user is banned
    const userStats = await this.prisma.userAuctionStats.findUnique({
      where: { userId },
    });

    if (userStats?.bannedUntil && userStats.bannedUntil > new Date()) {
      throw new ApiError(
        `You are banned from bidding until ${userStats.bannedUntil.toISOString()}`,
        403
      );
    }

    // 3. Validate bid amount is below buy out price
    if (data.bidAmount >= Number(auction.buyOutPrice)) {
      throw new ApiError(
        `Bid amount cannot be equal to or higher than buy out price (Rp ${Number(auction.buyOutPrice).toLocaleString("id-ID")}). Please use buy out option instead.`,
        400
      );
    }

    // 4. Determine minimum bid amount
    let minBidAmount: number;

    if (auction.lastBidTime === null) {
      // No bids yet - first bid can equal startPrice
      minBidAmount = Number(auction.startPrice);
    } else {
      // Has bids - must be currentBid + minIncrement
      minBidAmount = Number(auction.currentBid) + Number(auction.minIncrement);
    }

    if (data.bidAmount < minBidAmount) {
      throw new ApiError(
        `Bid amount must be at least Rp ${minBidAmount.toLocaleString("id-ID")}`,
        400
      );
    }

    // 5. Check if user is already highest bidder
    const lastBid = auction.bids[0];
    if (lastBid && lastBid.userId === userId) {
      throw new ApiError("You are already the highest bidder", 400);
    }

    console.log("💰 Placing bid:", {
      auction: auctionId,
      user: userId,
      amount: data.bidAmount,
    });

    // 6. Calculate new end time (24 hours from now)
    const newEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const paymentDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 7. Create bid and update auction
    const bid = await this.prisma.$transaction(async (tx) => {
      const newBid = await tx.bid.create({
        data: {
          auctionId,
          userId,
          bidAmount: data.bidAmount,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          auction: {
            select: {
              id: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentBid: data.bidAmount,
          lastBidTime: new Date(),
          endTime: newEndTime,
          paymentDeadline: paymentDeadline,
        },
      });

      return newBid;
    });

    console.log("✅ Bid placed successfully");

    // 8. Send outbid email to previous highest bidder (with throttling)
    if (lastBid) {
      const lastEmailTime = this.outbidEmailThrottle.get(lastBid.userId);
      const now = Date.now();

      if (!lastEmailTime || now - lastEmailTime > this.throttleWindow) {
        try {
          await this.emailService.sendOutbidNotification(lastBid.user.email, {
            userName: lastBid.user.name,
            productName: auction.product.name,
            yourBid: Number(auction.currentBid),
            newHighestBid: data.bidAmount,
            auctionUrl: `${process.env.FRONTEND_URL}/auctions/${auctionId}`,
          });

          this.outbidEmailThrottle.set(lastBid.userId, now);
          console.log("✅ Outbid email sent to", lastBid.user.email);
        } catch (error) {
          console.error("Failed to send outbid email:", error);
        }
      } else {
        console.log("⏸️ Email throttled for user", lastBid.userId);
      }
    }

    return {
      id: bid.id,
      auctionId: bid.auctionId,
      userId: bid.userId,
      bidAmount: Number(bid.bidAmount),
      bidTime: bid.bidTime,
      newEndTime: newEndTime,
    };
  };

  /**
   * Get bid history for auction (Public)
   */
  getHistory = async (auctionId: number) => {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    const bids = await this.prisma.bid.findMany({
      where: { auctionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        bidTime: "desc",
      },
    });

    return bids.map((bid) => ({
      id: bid.id,
      bidAmount: Number(bid.bidAmount),
      bidTime: bid.bidTime,
      userName: this.maskUsername(bid.user.name),
    }));
  };

  /**
   * Get user's bids (My bids)
   */
  getMyBids = async (userId: number) => {
    const bids = await this.prisma.bid.findMany({
      where: { userId },
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
            variant: {
              select: {
                id: true,
                rarity: {
                  select: { name: true },
                },
                condition: {
                  select: { name: true },
                },
              },
            },
            bids: {
              orderBy: {
                bidAmount: "desc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        bidTime: "desc",
      },
      distinct: ["auctionId"],
    });

    return bids.map((bid) => {
      const highestBid = bid.auction.bids[0];
      const isWinning = highestBid?.userId === userId;

      return {
        id: bid.id,
        auctionId: bid.auctionId,
        auction: {
          id: bid.auction.id,
          product: bid.auction.product,
          variant: bid.auction.variant,
          currentBid: Number(bid.auction.currentBid),
          status: bid.auction.status,
          endTime: bid.auction.endTime,
        },
        myBid: Number(bid.bidAmount),
        bidTime: bid.bidTime,
        isWinning,
      };
    });
  };

  /**
   * Get user's won auctions (pending payment) - UPDATED
   */
  getWonAuctions = async (userId: number) => {
    const wonAuctions = await this.prisma.auction.findMany({
      where: {
        winnerId: userId,
        status: "ENDED",
        orderId: null, // ✅ Only auctions not yet linked to order
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
          },
        },
        variant: {
          select: {
            id: true,
            rarity: {
              select: { name: true },
            },
            condition: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        endTime: "desc",
      },
    });

    return wonAuctions.map((auction) => ({
      id: auction.id,
      product: auction.product,
      variant: auction.variant,
      quantity: auction.quantity,
      winningBid: Number(auction.currentBid),
      endTime: auction.endTime,
      paymentDeadline: auction.paymentDeadline,
    }));
  };

  /**
   * Helper: Mask username for privacy
   */
  maskUsername = (name: string): string => {
    if (name.length <= 3) {
      return name[0] + "**";
    }
    return name.substring(0, 3) + "***";
  };
}