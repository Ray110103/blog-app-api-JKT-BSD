import { PrismaService } from "../../modules/prisma/prisma.service";
import { ApiError } from "../../utils/api-error";

export class WishlistService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  private getInclude() {
    return {
      product: {
        include: {
          game: true,
          set: true,
          language: true,
          sealedCategory: true,
          accessoryCategory: true,
          images: {
            orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
            take: 1, // Only get the main image
          },
          variants: {
            where: { isActive: true },
            include: {
              rarity: true,
              condition: true,
            },
          },
        },
      },
    };
  }

  // Get all wishlist items for a user
  getAll = async (userId: number) => {
    return await this.prisma.wishlist.findMany({
      where: { userId },
      include: this.getInclude(),
      orderBy: { createdAt: "desc" },
    });
  };

  getAllPaginated = async (
    userId: number,
    pagination?: { page?: number; limit?: number; skip?: number }
  ) => {
    const limit = pagination?.limit ?? 20;
    const skip =
      pagination?.page !== undefined ? (pagination.page - 1) * limit : 0;
    const effectiveSkip =
      pagination?.page !== undefined ? skip : (pagination?.skip ?? 0);
    const page =
      pagination?.page !== undefined
        ? pagination.page
        : Math.floor(effectiveSkip / limit) + 1;

    const where = { userId };
    const include = this.getInclude();

    const [wishlist, total] = await this.prisma.$transaction([
      this.prisma.wishlist.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: effectiveSkip,
        take: limit,
      }),
      this.prisma.wishlist.count({ where }),
    ]);

    return {
      wishlist,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  // Add product to wishlist
  add = async (userId: number, productId: number) => {
    // Check if product exists and is active
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      throw new ApiError("Product already in wishlist", 400);
    }

    // Add to wishlist
    return await this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: [{ isMain: "desc" }],
              take: 1,
            },
            variants: {
              where: { isActive: true },
            },
          },
        },
      },
    });
  };

  // Remove from wishlist
  remove = async (userId: number, productId: number) => {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new ApiError("Product not in wishlist", 404);
    }

    await this.prisma.wishlist.delete({
      where: {
        id: wishlistItem.id,
      },
    });

    return { message: "Removed from wishlist" };
  };

  // Check if product is in user's wishlist
  check = async (userId: number, productId: number) => {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return {
      isInWishlist: !!wishlistItem,
    };
  };

  // Get wishlist count
  getCount = async (userId: number) => {
    const count = await this.prisma.wishlist.count({
      where: { userId },
    });

    return { count };
  };
}
