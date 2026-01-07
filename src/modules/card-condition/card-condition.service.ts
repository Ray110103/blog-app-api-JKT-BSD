import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { CreateCardConditionDTO } from "./dto/create-card-condition.dto";
import { UpdateCardConditionDTO } from "./dto/update-card-condition.dto";

export class CardConditionService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getAll = async () => {
    return await this.prisma.condition.findMany({
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

    const [conditions, total] = await this.prisma.$transaction([
      this.prisma.condition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: effectiveSkip,
        take: limit,
      }),
      this.prisma.condition.count({ where }),
    ]);

    return {
      conditions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getById = async (id: number) => {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id: id,
        isActive: true,
      },
      include: {
        _count: { select: { productVariants: true } },
      },
    });

    if (!condition) {
      throw new ApiError("Card condition not found", 404);
    }

    return condition;
  };

  create = async (body: CreateCardConditionDTO) => {
    // Check if name already exists (active only)
    const existingName = await this.prisma.condition.findFirst({
      where: {
        name: body.name,
        isActive: true,
      },
    });

    if (existingName) {
      throw new ApiError("Condition with this name already exists", 400);
    }

    // Check if shortName already exists (active only)
    const existingShortName = await this.prisma.condition.findFirst({
      where: {
        shortName: body.shortName,
        isActive: true,
      },
    });

    if (existingShortName) {
      throw new ApiError("Condition with this short name already exists", 400);
    }

    return await this.prisma.condition.create({
      data: {
        name: body.name,
        shortName: body.shortName,
        description: body.description,
        isActive: true,
      },
    });
  };

  update = async (id: number, body: UpdateCardConditionDTO) => {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id: id,
        isActive: true,
      },
    });

    if (!condition) {
      throw new ApiError("Card condition not found", 404);
    }

    // Check if new name already exists (active only)
    if (body.name && body.name !== condition.name) {
      const existingName = await this.prisma.condition.findFirst({
        where: {
          name: body.name,
          isActive: true,
          NOT: { id: condition.id },
        },
      });

      if (existingName) {
        throw new ApiError("Condition name already taken", 400);
      }
    }

    // Check if new shortName already exists (active only)
    if (body.shortName && body.shortName !== condition.shortName) {
      const existingShortName = await this.prisma.condition.findFirst({
        where: {
          shortName: body.shortName,
          isActive: true,
          NOT: { id: condition.id },
        },
      });

      if (existingShortName) {
        throw new ApiError("Condition short name already taken", 400);
      }
    }

    return await this.prisma.condition.update({
      where: { id: condition.id },
      data: {
        name: body.name,
        shortName: body.shortName,
        description: body.description,
        isActive: body.isActive,
      },
    });
  };

  delete = async (id: number) => {
    const condition = await this.prisma.condition.findFirst({
      where: {
        id: id,
        isActive: true,
      },
    });

    if (!condition) {
      throw new ApiError("Card condition not found", 404);
    }

    // Check if condition has product variants
    const variantCount = await this.prisma.productVariant.count({
      where: { conditionId: condition.id },
    });

    if (variantCount > 0) {
      throw new ApiError(
        "Cannot delete condition with existing product variants",
        400
      );
    }

    // Soft delete
    await this.prisma.condition.update({
      where: { id: condition.id },
      data: { isActive: false },
    });

    return { message: "Card condition deleted successfully" };
  };
}
