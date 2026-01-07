import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ApiError } from "../../utils/api-error";

import { generateSlug } from "../../utils/generate-slug";
import { CreateAccessoryCategoryDTO } from "./dto/create-accessory-category.dto";
import { UpdateAccessoryCategoryDTO } from "./dto/update-accessory-category.dto";

export class AccessoryCategoryService {
  private prisma: PrismaService;
  private cloudinary: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinary = new CloudinaryService();
  }

  getAll = async () => {
    return await this.prisma.accessoryCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: true } },
      },
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

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.accessoryCategory.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { createdAt: "desc" },
        skip: effectiveSkip,
        take: limit,
      }),
      this.prisma.accessoryCategory.count({ where }),
    ]);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  getBySlug = async (slug: string) => {
    const category = await this.prisma.accessoryCategory.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new ApiError("Accessory category not found", 404);
    }

    return category;
  };

  create = async (
    body: CreateAccessoryCategoryDTO,
    thumbnail?: Express.Multer.File
  ) => {
    // Check if name already exists (active only)
    const existingName = await this.prisma.accessoryCategory.findFirst({
      where: {
        name: body.name,
        isActive: true,
      },
    });

    if (existingName) {
      throw new ApiError(
        "Accessory category with this name already exists",
        400
      );
    }

    // Generate slug
    let slug = generateSlug(body.name);
    let counter = 1;

    while (
      await this.prisma.accessoryCategory.findFirst({
        where: { slug, isActive: true },
      })
    ) {
      slug = `${generateSlug(body.name)}-${counter}`;
      counter++;
    }

    // Upload thumbnail to Cloudinary
    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      const uploadResult = await this.cloudinary.upload(
        thumbnail,
        "accessory-categories/thumbnails"
      );
      thumbnailUrl = uploadResult.secure_url;
    }

    // Create category
    return await this.prisma.accessoryCategory.create({
      data: {
        name: body.name,
        slug: slug,
        description: body.description,
        thumbnail: thumbnailUrl,
        isActive: true,
      },
    });
  };

  update = async (
    slug: string,
    body: UpdateAccessoryCategoryDTO,
    thumbnail?: Express.Multer.File
  ) => {
    const category = await this.prisma.accessoryCategory.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!category) {
      throw new ApiError("Accessory category not found", 404);
    }

    // Check if new name already exists (active only)
    if (body.name && body.name !== category.name) {
      const existingName = await this.prisma.accessoryCategory.findFirst({
        where: {
          name: body.name,
          isActive: true,
          NOT: { id: category.id },
        },
      });

      if (existingName) {
        throw new ApiError("Accessory category name already taken", 400);
      }
    }

    // Generate new slug if name changed
    let newSlug = category.slug;
    if (body.name && body.name !== category.name) {
      newSlug = generateSlug(body.name);
      let counter = 1;

      while (
        await this.prisma.accessoryCategory.findFirst({
          where: { slug: newSlug, isActive: true, NOT: { id: category.id } },
        })
      ) {
        newSlug = `${generateSlug(body.name)}-${counter}`;
        counter++;
      }
    }

    // Upload new thumbnail if provided
    let thumbnailUrl = category.thumbnail;
    if (thumbnail) {
      // Delete old thumbnail from Cloudinary if exists
      if (category.thumbnail) {
        await this.cloudinary.remove(category.thumbnail);
      }

      const uploadResult = await this.cloudinary.upload(
        thumbnail,
        "accessory-categories/thumbnails"
      );
      thumbnailUrl = uploadResult.secure_url;
    }

    // Update category
    return await this.prisma.accessoryCategory.update({
      where: { id: category.id },
      data: {
        name: body.name,
        slug: newSlug,
        description: body.description,
        thumbnail: thumbnailUrl,
        isActive: body.isActive,
      },
    });
  };

  delete = async (slug: string) => {
    const category = await this.prisma.accessoryCategory.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!category) {
      throw new ApiError("Accessory category not found", 404);
    }

    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { accessoryCategoryId: category.id },
    });

    if (productCount > 0) {
      throw new ApiError(
        "Cannot delete accessory category with existing products",
        400
      );
    }

    // Delete thumbnail from Cloudinary
    if (category.thumbnail) {
      await this.cloudinary.remove(category.thumbnail);
    }

    // Soft delete
    await this.prisma.accessoryCategory.update({
      where: { id: category.id },
      data: { isActive: false },
    });

    return { message: "Accessory category deleted successfully" };
  };
}
