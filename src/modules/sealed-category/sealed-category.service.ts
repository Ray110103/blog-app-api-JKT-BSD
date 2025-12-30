import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ApiError } from "../../utils/api-error";
import { CreateSealedCategoryDTO } from "./dto/create-sealed-category.dto";
import { UpdateSealedCategoryDTO } from "./dto/update-sealed-category.dto";
import { generateSlug } from "../../utils/generate-slug";

export class SealedCategoryService {
  private prisma: PrismaService;
  private cloudinary: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinary = new CloudinaryService();
  }

  getAll = async () => {
    return await this.prisma.sealedCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  };

  getBySlug = async (slug: string) => {
    const category = await this.prisma.sealedCategory.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new ApiError("Sealed category not found", 404);
    }

    return category;
  };

  create = async (
    body: CreateSealedCategoryDTO,
    thumbnail?: Express.Multer.File
  ) => {
    // Check if name already exists (active only)
    const existingName = await this.prisma.sealedCategory.findFirst({
      where: {
        name: body.name,
        isActive: true,
      },
    });

    if (existingName) {
      throw new ApiError("Sealed category with this name already exists", 400);
    }

    // Generate slug
    let slug = generateSlug(body.name);
    let counter = 1;

    while (
      await this.prisma.sealedCategory.findFirst({
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
        "sealed-categories/thumbnails"
      );
      thumbnailUrl = uploadResult.secure_url;
    }

    // Create category
    return await this.prisma.sealedCategory.create({
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
    body: UpdateSealedCategoryDTO,
    thumbnail?: Express.Multer.File
  ) => {
    const category = await this.prisma.sealedCategory.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!category) {
      throw new ApiError("Sealed category not found", 404);
    }

    // Check if new name already exists (active only)
    if (body.name && body.name !== category.name) {
      const existingName = await this.prisma.sealedCategory.findFirst({
        where: {
          name: body.name,
          isActive: true,
          NOT: { id: category.id },
        },
      });

      if (existingName) {
        throw new ApiError("Sealed category name already taken", 400);
      }
    }

    // Generate new slug if name changed
    let newSlug = category.slug;
    if (body.name && body.name !== category.name) {
      newSlug = generateSlug(body.name);
      let counter = 1;

      while (
        await this.prisma.sealedCategory.findFirst({
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
        "sealed-categories/thumbnails"
      );
      thumbnailUrl = uploadResult.secure_url;
    }

    // Update category
    return await this.prisma.sealedCategory.update({
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
    const category = await this.prisma.sealedCategory.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!category) {
      throw new ApiError("Sealed category not found", 404);
    }

    // Check if category has products
    const productCount = await this.prisma.product.count({
      where: { sealedCategoryId: category.id },
    });

    if (productCount > 0) {
      throw new ApiError(
        "Cannot delete sealed category with existing products",
        400
      );
    }

    // Delete thumbnail from Cloudinary
    if (category.thumbnail) {
      await this.cloudinary.remove(category.thumbnail);
    }

    // Soft delete
    await this.prisma.sealedCategory.update({
      where: { id: category.id },
      data: { isActive: false },
    });

    return { message: "Sealed category deleted successfully" };
  };
}