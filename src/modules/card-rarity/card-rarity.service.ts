import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { CreateCardRarityDTO } from "./dto/create-card-rarity.dto";
import { CreateBulkCardRaritiesDTO } from "./dto/create-bulk-card-rarities.dto";
import { UpdateCardRarityDTO } from "./dto/update-card-rarity.dto";

export class CardRarityService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getAll = async () => {
    return await this.prisma.rarity.findMany({
      where: { isActive: true },
      include: {
        set: {
          select: {
            id: true,
            name: true,
            slug: true,
            game: { select: { id: true, name: true } },
            language: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  };

  getAllPaginated = async (
    filters?: { setId?: number; gameId?: number; languageId?: number },
    pagination?: { page?: number; limit?: number; skip?: number }
  ) => {
    const where: any = { isActive: true };

    if (filters?.setId) where.setId = filters.setId;

    if (filters?.gameId || filters?.languageId) {
      where.set = {
        ...(filters?.gameId ? { gameId: filters.gameId } : {}),
        ...(filters?.languageId ? { languageId: filters.languageId } : {}),
      };
    }

    const limit = pagination?.limit ?? 20;
    const skip =
      pagination?.page !== undefined ? (pagination.page - 1) * limit : 0;
    const effectiveSkip =
      pagination?.page !== undefined ? skip : (pagination?.skip ?? 0);
    const page =
      pagination?.page !== undefined
        ? pagination.page
        : Math.floor(effectiveSkip / limit) + 1;

    const include = {
      set: {
        select: {
          id: true,
          name: true,
          slug: true,
          game: { select: { id: true, name: true } },
          language: { select: { id: true, name: true, code: true } },
        },
      },
    };

    const [rarities, total] = await this.prisma.$transaction([
      this.prisma.rarity.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: effectiveSkip,
        take: limit,
      }),
      this.prisma.rarity.count({ where }),
    ]);

    return {
      rarities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getById = async (id: number) => {
    const rarity = await this.prisma.rarity.findFirst({
      where: {
        id: id,
        isActive: true,
      },
      include: {
        set: {
          include: {
            game: true,
            language: true,
          },
        },
        // ⭐ FIXED: Changed from products to productVariants
        _count: { select: { productVariants: true } },
      },
    });

    if (!rarity) {
      throw new ApiError("Card rarity not found", 404);
    }

    return rarity;
  };

  create = async (body: CreateCardRarityDTO) => {
    // Check if set exists and is active
    const set = await this.prisma.set.findFirst({
      where: { id: body.setId, isActive: true },
    });

    if (!set) {
      throw new ApiError("Card set not found", 404);
    }

    // Check if rarity with same set + name already exists (active only)
    const existingRarity = await this.prisma.rarity.findFirst({
      where: {
        setId: body.setId,
        name: body.name,
        isActive: true,
      },
    });

    if (existingRarity) {
      throw new ApiError(
        "Rarity with this name already exists for this set",
        400
      );
    }

    return await this.prisma.rarity.create({
      data: {
        setId: body.setId,
        name: body.name,
        shortName: body.shortName,
        isActive: true,
      },
      include: {
        set: {
          include: {
            game: true,
            language: true,
          },
        },
      },
    });
  };

  // ⭐ NEW: Bulk create rarities
  createBulk = async (body: CreateBulkCardRaritiesDTO) => {
    // Check if set exists and is active
    const set = await this.prisma.set.findFirst({
      where: { id: body.setId, isActive: true },
    });

    if (!set) {
      throw new ApiError("Card set not found", 404);
    }

    // Check for duplicate names in the request
    const names = body.rarities.map((r) => r.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      throw new ApiError("Duplicate rarity names in request", 400);
    }

    // Check if any rarity already exists for this set
    const existingRarities = await this.prisma.rarity.findMany({
      where: {
        setId: body.setId,
        name: { in: names },
        isActive: true,
      },
    });

    if (existingRarities.length > 0) {
      const existingNames = existingRarities.map((r) => r.name).join(", ");
      throw new ApiError(
        `Rarities already exist for this set: ${existingNames}`,
        400
      );
    }

    // Create all rarities in a transaction
    const createdRarities = await this.prisma.$transaction(
      body.rarities.map((rarity) =>
        this.prisma.rarity.create({
          data: {
            setId: body.setId,
            name: rarity.name,
            shortName: rarity.shortName,
            isActive: true,
          },
          include: {
            set: {
              include: {
                game: true,
                language: true,
              },
            },
          },
        })
      )
    );

    return {
      message: `${createdRarities.length} rarities created successfully`,
      rarities: createdRarities,
    };
  };

  update = async (id: number, body: UpdateCardRarityDTO) => {
    const rarity = await this.prisma.rarity.findFirst({
      where: {
        id: id,
        isActive: true,
      },
    });

    if (!rarity) {
      throw new ApiError("Card rarity not found", 404);
    }

    // Check if set exists (if provided)
    if (body.setId) {
      const set = await this.prisma.set.findFirst({
        where: { id: body.setId, isActive: true },
      });

      if (!set) {
        throw new ApiError("Card set not found", 404);
      }
    }

    // Check if new combination of set + name already exists
    if (body.setId || body.name) {
      const existingRarity = await this.prisma.rarity.findFirst({
        where: {
          setId: body.setId ?? rarity.setId,
          name: body.name ?? rarity.name,
          isActive: true,
          NOT: { id: rarity.id },
        },
      });

      if (existingRarity) {
        throw new ApiError(
          "Rarity with this name already exists for this set",
          400
        );
      }
    }

    return await this.prisma.rarity.update({
      where: { id: rarity.id },
      data: {
        setId: body.setId,
        name: body.name,
        shortName: body.shortName,
        isActive: body.isActive,
      },
      include: {
        set: {
          include: {
            game: true,
            language: true,
          },
        },
      },
    });
  };

  delete = async (id: number) => {
    const rarity = await this.prisma.rarity.findFirst({
      where: {
        id: id,
        isActive: true,
      },
    });

    if (!rarity) {
      throw new ApiError("Card rarity not found", 404);
    }

    // ⭐ FIXED: Check productVariants instead of products
    const variantCount = await this.prisma.productVariant.count({
      where: { rarityId: rarity.id },
    });

    if (variantCount > 0) {
      throw new ApiError(
        "Cannot delete rarity with existing product variants",
        400
      );
    }

    // Soft delete
    await this.prisma.rarity.update({
      where: { id: rarity.id },
      data: { isActive: false },
    });

    return { message: "Card rarity deleted successfully" };
  };
}
