import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { CreateReviewDTO } from "./dto/create-review.dto";
import { UpdateReviewDTO } from "./dto/update-review.dto";

export class ReviewService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  // ===========================
  // GET ALL REVIEWS (with filters)
  // ===========================
  getAll = async (filters?: {
    productId?: number;
    userId?: number;
    rating?: number;
  }) => {
    const where: any = {};

    if (filters?.productId) where.productId = filters.productId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.rating) where.rating = filters.rating;

    return await this.prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pictureProfile: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  };

  // ===========================
  // GET REVIEWS BY PRODUCT
  // ===========================
  getByProduct = async (productId: number) => {
    return await this.prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pictureProfile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  };

  // ===========================
  // GET REVIEW STATS BY PRODUCT
  // ===========================
  getProductStats = async (productId: number) => {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    // Count by rating
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      totalReviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingDistribution,
    };
  };

  // ===========================
  // CREATE REVIEW
  // ===========================
  create = async (userId: number, body: CreateReviewDTO) => {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: body.productId },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Check if user already reviewed this product
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: body.productId,
        },
      },
    });

    if (existingReview) {
      throw new ApiError("You have already reviewed this product", 400);
    }

    // ⭐ UPDATED: Check if user purchased this product
    // Changed from ["DELIVERED", "COMPLETED"] to just "COMPLETED"
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId: body.productId,
        order: {
          userId,
          status: "COMPLETED", // ✅ FIXED: Only COMPLETED orders can be reviewed
        },
      },
    });

    if (!hasPurchased) {
      throw new ApiError(
        "You can only review products you have purchased and received",
        403
      );
    }

    return await this.prisma.review.create({
      data: {
        userId,
        productId: body.productId,
        rating: body.rating,
        comment: body.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pictureProfile: true,
          },
        },
      },
    });
  };

  // ===========================
  // UPDATE REVIEW
  // ===========================
  update = async (reviewId: number, userId: number, body: UpdateReviewDTO) => {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new ApiError("Review not found", 404);
    }

    // Check ownership
    if (review.userId !== userId) {
      throw new ApiError("You can only update your own reviews", 403);
    }

    return await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: body.rating,
        comment: body.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pictureProfile: true,
          },
        },
      },
    });
  };

  // ===========================
  // DELETE REVIEW
  // ===========================
  delete = async (reviewId: number, userId: number, isAdmin: boolean = false) => {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new ApiError("Review not found", 404);
    }

    // Check ownership (users can only delete their own, admin can delete any)
    if (!isAdmin && review.userId !== userId) {
      throw new ApiError("You can only delete your own reviews", 403);
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return { message: "Review deleted successfully" };
  };

  // ===========================
  // CHECK IF USER CAN REVIEW
  // ===========================
  canUserReview = async (userId: number, productId: number) => {
    // Check if already reviewed
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      return {
        canReview: false,
        reason: "already_reviewed",
        review: existingReview,
      };
    }

    // ⭐ UPDATED: Check if purchased (only COMPLETED orders)
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: "COMPLETED", // ✅ FIXED: Only COMPLETED orders
        },
      },
    });

    if (!hasPurchased) {
      return {
        canReview: false,
        reason: "not_purchased",
        message: "You can only review products you have purchased and received",
      };
    }

    return {
      canReview: true,
      message: "You can review this product",
    };
  };
}