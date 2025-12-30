import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../mail/email.service";
import { CreateAuctionDto } from "./dto/create-auction.dto";
import { RelistAuctionDto } from "./dto/relist-auction.dto";
import { UpdateAuctionDto } from "./dto/update-auction.dto";

export class AuctionService {
  prisma: PrismaService;
  emailService: EmailService;
  minIncrement: number;

  constructor() {
    this.prisma = new PrismaService();
    this.emailService = new EmailService();
    this.minIncrement = 10000; // Default minimum increment
  }

  /**
   * Create new auction (Admin only) - UPDATED
   */
  create = async (adminId: number, data: CreateAuctionDto) => {
    // 1. Validate variant exists and has stock
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: data.variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            description: true,
            isActive: true,
          },
        },
        rarity: {
          select: {
            name: true,
            shortName: true,
          },
        },
        condition: {
          select: {
            name: true,
            shortName: true,
          },
        },
      },
    });

    if (!variant) {
      throw new ApiError("Product variant not found", 404);
    }

    if (!variant.product.isActive) {
      throw new ApiError("Product is not active", 400);
    }

    // ✅ CHECK: Variant must have sufficient stock
    if (variant.stock < data.quantity) {
      throw new ApiError(
        `Insufficient stock. Available: ${variant.stock}, Required: ${data.quantity}`,
        400
      );
    }

    // 2. Validate prices
    if (data.buyOutPrice <= data.startPrice) {
      throw new ApiError("Buy out price must be higher than start price", 400);
    }

    console.log("📦 Creating auction for product:", variant.product.name);
    console.log(
      `   Variant: ${variant.rarity?.name || ""} ${
        variant.condition?.name || ""
      }`
    );
    console.log(`   Quantity: ${data.quantity}`);
    console.log(`   Stock available: ${variant.stock}`);

    // 3. Create auction and reserve stock
    const auction = await this.prisma.$transaction(async (tx) => {
      // Create auction
      const newAuction = await tx.auction.create({
        data: {
          productId: data.productId,
          variantId: data.variantId,
          quantity: data.quantity,
          startPrice: data.startPrice,
          buyOutPrice: data.buyOutPrice,
          currentBid: data.startPrice,
          minIncrement: this.minIncrement,
          startTime: new Date(),
          status: "ACTIVE",
          createdBy: adminId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              description: true,
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              price: true,
              stock: true,
              rarity: {
                select: {
                  name: true,
                  shortName: true,
                },
              },
              condition: {
                select: {
                  name: true,
                  shortName: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // ✅ RESERVE STOCK: Deduct quantity from stock
      await tx.productVariant.update({
        where: { id: data.variantId },
        data: {
          stock: { decrement: data.quantity },
        },
      });

      console.log(
        `✅ Stock reserved: ${variant.stock} → ${variant.stock - data.quantity}`
      );

      return newAuction;
    });

    console.log("✅ Auction created successfully:", auction.id);

    return this.formatAuctionResponse(auction);
  };

  update = async (adminId: number, auctionId: number, data: UpdateAuctionDto) => {
    // 1. Check auction exists and is active
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: true,
      },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw new ApiError("Only active auctions can be updated", 400);
    }

    // 2. Check if auction has bids
    if (auction.bids.length > 0) {
      throw new ApiError(
        "Cannot update auction with existing bids. Please cancel and create a new auction instead.",
        400
      );
    }

    console.log("📝 Updating auction:", auctionId);

    // 3. Validate prices if provided
    const newStartPrice = data.startPrice || auction.startPrice;
    const newBuyOutPrice = data.buyOutPrice !== undefined ? data.buyOutPrice : auction.buyOutPrice;

    if (newBuyOutPrice && newBuyOutPrice <= newStartPrice) {
      throw new ApiError("Buy out price must be higher than start price", 400);
    }

    // 4. Handle quantity change (adjust stock)
    let stockDifference = 0;
    if (data.quantity && data.quantity !== auction.quantity) {
      stockDifference = auction.quantity - data.quantity; // positive = release stock, negative = reserve more

      // Check if we have enough stock for increase
      if (stockDifference < 0) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: auction.variantId },
        });

        if (!variant || variant.stock < Math.abs(stockDifference)) {
          throw new ApiError(
            `Insufficient stock. Available: ${variant?.stock || 0}, Needed: ${Math.abs(stockDifference)} more`,
            400
          );
        }
      }

      console.log(`📦 Stock adjustment: ${stockDifference > 0 ? '+' : ''}${stockDifference}`);
    }

    // 5. Update auction in transaction
    const updatedAuction = await this.prisma.$transaction(async (tx) => {
      // Update auction
      const updated = await tx.auction.update({
        where: { id: auctionId },
        data: {
          startPrice: data.startPrice,
          buyOutPrice: data.buyOutPrice,
          quantity: data.quantity,
          currentBid: data.startPrice || auction.startPrice, // Reset currentBid if startPrice changed
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              description: true,
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              price: true,
              weight: true,
              rarity: {
                select: {
                  name: true,
                  shortName: true,
                },
              },
              condition: {
                select: {
                  name: true,
                  shortName: true,
                },
              },
            },
          },
        },
      });

      // Adjust stock if quantity changed
      if (stockDifference !== 0) {
        await tx.productVariant.update({
          where: { id: auction.variantId },
          data: {
            stock: { increment: stockDifference }, // positive = add back, negative = reduce
          },
        });

        console.log(`✅ Stock adjusted: ${stockDifference > 0 ? '+' : ''}${stockDifference}`);
      }

      return updated;
    });

    console.log("✅ Auction updated successfully");

    return this.formatAuctionResponse(updatedAuction);
  };

  /**
   * Get all auctions (Public)
   */
  getAll = async (filters?: {
    status?: string;
    productId?: number;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.productId) {
      where.productId = filters.productId;
    }

    if (filters?.minPrice || filters?.maxPrice) {
      where.currentBid = {};
      if (filters.minPrice) {
        where.currentBid.gte = filters.minPrice;
      }
      if (filters.maxPrice) {
        where.currentBid.lte = filters.maxPrice;
      }
    }

    const auctions = await this.prisma.auction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        variant: {
          select: {
            id: true,
            rarity: {
              select: {
                name: true,
                shortName: true,
              },
            },
            condition: {
              select: {
                name: true,
                shortName: true,
              },
            },
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return auctions.map((auction) => ({
      ...this.formatAuctionResponse(auction),
      totalBids: auction._count.bids,
    }));
  };

  /**
   * Get auction by ID (Public)
   */
  /**
   * Get auction by ID (Public)
   */
  getById = async (auctionId: number) => {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            description: true,
            productType: true, // ✅ ADD: Include productType
            weight: true,       // ✅ ADD: Include product weight
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            price: true,
            weight: true, // ✅ ADD: Include variant weight
            rarity: {
              select: {
                name: true,
                shortName: true,
              },
            },
            condition: {
              select: {
                name: true,
                shortName: true,
              },
            },
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
            pictureProfile: true, // ✅ ADD: Include picture for avatar
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            bids: true, // ✅ ENSURE: Include bid count
          },
        },
        bids: {
          select: {
            userId: true,
          },
          distinct: ["userId"],
        },
      },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    return {
      ...this.formatAuctionResponse(auction),
      winner: auction.winner,
      creator: auction.creator,
      uniqueBidders: auction.bids.length,
      _count: auction._count, // ✅ ADD: Include _count in response
    };
  };

  /**
   * Buy out auction (User)
   */
  buyOut = async (userId: number, auctionId: number) => {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: true,
        bids: {
          include: {
            user: true,
          },
          distinct: ["userId"],
        },
      },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw new ApiError("Auction is not active", 400);
    }

    console.log(`💰 User ${userId} buying out auction ${auctionId}`);

    // Set payment deadline (48 hours from now)
    const paymentDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Update auction
    const updatedAuction = await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: "ENDED",
        endTime: new Date(),
        currentBid: auction.buyOutPrice,
        winnerId: userId,
        paymentDeadline: paymentDeadline,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
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
    });

    // Notify all other bidders
    const otherBidders = auction.bids.filter((bid) => bid.userId !== userId);
    for (const bid of otherBidders) {
      try {
        await this.emailService.sendAuctionEndedNotWon(bid.user.email, {
          userName: bid.user.name,
          productName: auction.product.name,
          finalPrice: Number(auction.buyOutPrice),
        });
      } catch (error) {
        console.error(`Failed to send email to ${bid.user.email}:`, error);
      }
    }

    console.log("✅ Auction bought out successfully");

    return this.formatAuctionResponse(updatedAuction);
  };

  endAuction = async (adminId: number, auctionId: number) => {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        variant: true,
        bids: {
          include: {
            user: true,
          },
          orderBy: {
            bidAmount: "desc",
          },
        },
      },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw new ApiError("Only active auctions can be ended", 400);
    }

    console.log(`⏰ Manually ending auction ${auctionId}`);

    const now = new Date();

    // Determine winner (highest bidder)
    const winner = auction.bids.length > 0 ? auction.bids[0] : null;

    let updateData: any = {
      status: "ENDED",
      endTime: now,
    };

    // If there's a winner, set payment deadline
    if (winner) {
      const paymentDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
      updateData.winnerId = winner.userId;
      updateData.paymentDeadline = paymentDeadline;

      console.log(`🏆 Winner: ${winner.user.name} (${winner.user.email})`);
      console.log(`💰 Winning bid: ${winner.bidAmount}`);
      console.log(`⏰ Payment deadline: ${paymentDeadline.toISOString()}`);
    } else {
      console.log("📭 No bids - ending auction without winner");
    }

    // Update auction
    const updatedAuction = await this.prisma.auction.update({
      where: { id: auctionId },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
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
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notifications
    if (winner) {
      // Notify winner
      try {
        await this.emailService.sendAuctionWon(winner.user.email, {
          userName: winner.user.name,
          productName: auction.product.name,
          winningBid: Number(winner.bidAmount),
          paymentDeadline: updateData.paymentDeadline,
        });
        console.log(`✅ Winner notification sent to ${winner.user.email}`);
      } catch (error) {
        console.error(`Failed to send winner email to ${winner.user.email}:`, error);
      }

      // Notify other bidders
      const otherBidders = auction.bids.filter((bid) => bid.userId !== winner.userId);
      for (const bid of otherBidders) {
        try {
          await this.emailService.sendAuctionEndedNotWon(bid.user.email, {
            userName: bid.user.name,
            productName: auction.product.name,
            finalPrice: Number(winner.bidAmount),
          });
        } catch (error) {
          console.error(`Failed to send email to ${bid.user.email}:`, error);
        }
      }
      console.log(`✅ Notified ${otherBidders.length} other bidders`);

      // ✅ Increment winner's stats
      await this.prisma.userAuctionStats.upsert({
        where: { userId: winner.userId },
        create: {
          userId: winner.userId,
          totalWon: 1,
          totalPaid: 0,
          totalFailed: 0,
        },
        update: {
          totalWon: { increment: 1 },
        },
      });
    }

    console.log("✅ Auction ended successfully");

    return {
      ...this.formatAuctionResponse(updatedAuction),
      winner: updatedAuction.winner,
    };
  };

  /**
   * Cancel auction (Admin only) - UPDATED
   */
  cancel = async (adminId: number, auctionId: number, reason: string) => {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: true,
        variant: true,
        bids: {
          include: {
            user: true,
          },
          distinct: ["userId"],
        },
      },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    if (auction.status !== "ACTIVE") {
      throw new ApiError("Only active auctions can be cancelled", 400);
    }

    console.log("❌ Cancelling auction:", auctionId);

    await this.prisma.$transaction(async (tx) => {
      // Update auction status
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: "CANCELLED",
          failureReason: reason,
        },
      });

      // ✅ RELEASE STOCK: Add back to stock
      await tx.productVariant.update({
        where: { id: auction.variantId },
        data: {
          stock: { increment: auction.quantity },
        },
      });

      console.log(`✅ Stock released: +${auction.quantity}`);
    });

    // Notify all bidders
    if (auction.bids.length > 0) {
      for (const bid of auction.bids) {
        try {
          await this.emailService.sendAuctionCancelled(bid.user.email, {
            userName: bid.user.name,
            productName: auction.product.name,
            reason,
          });
        } catch (error) {
          console.error(
            `Failed to send cancel email to ${bid.user.email}:`,
            error
          );
        }
      }
    }

    console.log("✅ Auction cancelled successfully");

    return { message: "Auction cancelled successfully" };
  };

  /**
   * Re-list auction (Admin only) - UPDATED
   */
  relist = async (
    adminId: number,
    auctionId: number,
    data: RelistAuctionDto
  ) => {
    const originalAuction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: true,
        variant: true,
        bids: {
          include: {
            user: true,
          },
          distinct: ["userId"],
        },
      },
    });

    if (!originalAuction) {
      throw new ApiError("Auction not found", 404);
    }

    if (originalAuction.status !== "PAYMENT_FAILED") {
      throw new ApiError("Only failed auctions can be re-listed", 400);
    }

    // ✅ CHECK: Variant must have stock for re-listing
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: originalAuction.variantId },
    });

    if (!variant || variant.stock < originalAuction.quantity) {
      throw new ApiError(
        `Cannot re-list: Insufficient stock. Available: ${
          variant?.stock || 0
        }, Required: ${originalAuction.quantity}`,
        400
      );
    }

    console.log("🔄 Re-listing auction:", auctionId);

    // Create new auction and reserve stock
    const newAuction = await this.prisma.$transaction(async (tx) => {
      // Create new auction
      const created = await tx.auction.create({
        data: {
          productId: originalAuction.productId,
          variantId: originalAuction.variantId,
          quantity: originalAuction.quantity,
          startPrice: originalAuction.startPrice,
          buyOutPrice: originalAuction.buyOutPrice,
          currentBid: originalAuction.startPrice,
          minIncrement: originalAuction.minIncrement,
          startTime: new Date(),
          status: "ACTIVE",
          isRelisted: true,
          originalAuctionId: originalAuction.id,
          createdBy: adminId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
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
      });

      // Update original auction
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: "RELISTED" },
      });

      // ✅ RESERVE STOCK for new auction
      await tx.productVariant.update({
        where: { id: originalAuction.variantId },
        data: {
          stock: { decrement: originalAuction.quantity },
        },
      });

      console.log(
        `✅ Stock reserved for re-listed auction: -${originalAuction.quantity}`
      );

      return created;
    });

    // Notify previous bidders
    if (data.notifyPreviousBidders && originalAuction.bids.length > 0) {
      for (const bid of originalAuction.bids) {
        try {
          await this.emailService.sendAuctionRelisted(bid.user.email, {
            userName: bid.user.name,
            productName: originalAuction.product.name,
            startPrice: Number(originalAuction.startPrice),
            buyOutPrice: Number(originalAuction.buyOutPrice),
            auctionUrl: `${process.env.FRONTEND_URL}/auctions/${newAuction.id}`,
          });
        } catch (error) {
          console.error(
            `Failed to send relist email to ${bid.user.email}:`,
            error
          );
        }
      }
    }

    console.log("✅ Auction re-listed successfully:", newAuction.id);

    return await this.getById(newAuction.id);
  };

  /**
   * ✅ NEW: Get auctions with payment failures (Admin only)
   */
  getFailedPayments = async () => {
    const failedAuctions = await this.prisma.auction.findMany({
      where: {
        status: "PAYMENT_FAILED",
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
        variant: {
          select: {
            id: true,
            rarity: {
              select: {
                name: true,
                shortName: true,
              },
            },
            condition: {
              select: {
                name: true,
                shortName: true,
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
        updatedAt: "desc",
      },
    });

    return failedAuctions.map((auction) => ({
      ...this.formatAuctionResponse(auction),
      winner: auction.winner,
    }));
  };

  getBidHistory = async (auctionId: number) => {
    // Verify auction exists
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true },
    });

    if (!auction) {
      throw new ApiError("Auction not found", 404);
    }

    // Get all bids for this auction
    const bids = await this.prisma.bid.findMany({
      where: { auctionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            pictureProfile: true,
          },
        },
      },
      orderBy: {
        bidAmount: "desc", // Highest bid first
      },
    });

    return bids.map((bid) => ({
      id: bid.id,
      auctionId: bid.auctionId,
      userId: bid.userId,
      bidAmount: Number(bid.bidAmount),
      createdAt: bid.createdAt,
      user: {
        id: bid.user.id,
        name: bid.user.name,
        email: bid.user.email,
        pictureProfile: bid.user.pictureProfile,
      },
    }));
  };

  /**
   * Helper: Format auction response - UPDATED
   */
  formatAuctionResponse = (auction: any) => {
    return {
      id: auction.id,
      productId: auction.productId,
      product: auction.product,
      variantId: auction.variantId,
      variant: auction.variant,
      quantity: auction.quantity,
      startPrice: Number(auction.startPrice),
      buyOutPrice: Number(auction.buyOutPrice),
      currentBid: Number(auction.currentBid),
      minIncrement: Number(auction.minIncrement),
      startTime: auction.startTime,
      lastBidTime: auction.lastBidTime,
      endTime: auction.endTime,
      paymentDeadline: auction.paymentDeadline,
      status: auction.status,
      winnerId: auction.winnerId,
      orderId: auction.orderId,
      isRelisted: auction.isRelisted,
      createdBy: auction.createdBy,
      createdAt: auction.createdAt,
      updatedAt: auction.updatedAt,
    };
  };
}
