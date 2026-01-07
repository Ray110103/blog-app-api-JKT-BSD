import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { CreateCardLanguageDTO } from "./dto/create-card-language.dto";
import { UpdateCardLanguageDTO } from "./dto/update-card-language.dto";

export class CardLanguageService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getAll = async () => {
    return await this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  };

  getAllPaginated = async (pagination?: {
    page?: number;
    limit?: number;
    skip?: number;
  }) => {
    const limit = pagination?.limit ?? 20;
    const skip =
      pagination?.page !== undefined ? (pagination.page - 1) * limit : 0;
    const effectiveSkip =
      pagination?.page !== undefined ? skip : (pagination?.skip ?? 0);
    const page =
      pagination?.page !== undefined
        ? pagination.page
        : Math.floor(effectiveSkip / limit) + 1;

    const where = { isActive: true };

    const [languages, total] = await this.prisma.$transaction([
      this.prisma.language.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: effectiveSkip,
        take: limit,
      }),
      this.prisma.language.count({ where }),
    ]);

    return {
      languages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getById = async (id: number) => {
    const language = await this.prisma.language.findFirst({
      where: {
        id: id,
        isActive: true,
      },
      include: {
        _count: { select: { sets: true, products: true } },
      },
    });

    if (!language) {
      throw new ApiError("Card language not found", 404);
    }

    return language;
  };

  create = async (body: CreateCardLanguageDTO) => {
    // Check if name already exists (active only)
    const existingName = await this.prisma.language.findFirst({
      where: {
        name: body.name,
        isActive: true,
      },
    });

    if (existingName) {
      throw new ApiError("Card language with this name already exists", 400);
    }

    // Check if code already exists (active only)
    const existingCode = await this.prisma.language.findFirst({
      where: {
        code: body.code,
        isActive: true,
      },
    });

    if (existingCode) {
      throw new ApiError("Card language with this code already exists", 400);
    }

    return await this.prisma.language.create({
      data: {
        name: body.name,
        code: body.code,
        isActive: true,
      },
    });
  };

  update = async (id: number, body: UpdateCardLanguageDTO) => {
    const language = await this.prisma.language.findFirst({
      where: {
        id: id,
        isActive: true,
      },
    });

    if (!language) {
      throw new ApiError("Card language not found", 404);
    }

    // Check if new name already exists (active only)
    if (body.name && body.name !== language.name) {
      const existingName = await this.prisma.language.findFirst({
        where: {
          name: body.name,
          isActive: true,
          NOT: { id: language.id },
        },
      });

      if (existingName) {
        throw new ApiError("Card language name already taken", 400);
      }
    }

    // Check if new code already exists (active only)
    if (body.code && body.code !== language.code) {
      const existingCode = await this.prisma.language.findFirst({
        where: {
          code: body.code,
          isActive: true,
          NOT: { id: language.id },
        },
      });

      if (existingCode) {
        throw new ApiError("Card language code already taken", 400);
      }
    }

    return await this.prisma.language.update({
      where: { id: language.id },
      data: {
        name: body.name,
        code: body.code,
        isActive: body.isActive,
      },
    });
  };

  delete = async (id: number) => {
    const language = await this.prisma.language.findFirst({
      where: {
        id: id,
        isActive: true,
      },
    });

    if (!language) {
      throw new ApiError("Card language not found", 404);
    }

    // Check if language has products
    const productCount = await this.prisma.product.count({
      where: { languageId: language.id },
    });

    if (productCount > 0) {
      throw new ApiError("Cannot delete card language with existing products", 400);
    }

    // Check if language has sets
    const setCount = await this.prisma.set.count({
      where: { languageId: language.id },
    });

    if (setCount > 0) {
      throw new ApiError("Cannot delete card language with existing sets", 400);
    }

    // Soft delete
    await this.prisma.language.update({
      where: { id: language.id },
      data: { isActive: false },
    });

    return { message: "Card language deleted successfully" };
  };
}
