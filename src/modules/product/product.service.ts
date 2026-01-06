import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ApiError } from "../../utils/api-error";
import { CreateProductDTO, ProductType } from "./dto/create-product.dto";
import { CreateVariantDTO } from "./dto/create-variant.dto";
import { generateSlug } from "../../utils/generate-slug";
import { UpdateProductDTO } from "./dto/update-variant.dto";
import { UpdateVariantDTO } from "./dto/update-product.dto";

export class ProductService {
  private prisma: PrismaService;
  private cloudinary: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinary = new CloudinaryService();
  }

  // ⭐ ADD TO: ProductService.getAll() method

  getAll = async (filters?: {
    productType?: ProductType;
    gameId?: number;
    setId?: number;
    languageId?: number;
    rarityId?: number;
    sealedCategoryId?: number;
    accessoryCategoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;

    // ⭐ NEW: Pagination & Sorting
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const where: any = { isActive: true };

    // Basic filters
    if (filters?.productType) where.productType = filters.productType;
    if (filters?.gameId) where.gameId = filters.gameId;
    if (filters?.setId) where.setId = filters.setId;
    if (filters?.languageId) where.languageId = filters.languageId;
    if (filters?.sealedCategoryId)
      where.sealedCategoryId = filters.sealedCategoryId;
    if (filters?.accessoryCategoryId)
      where.accessoryCategoryId = filters.accessoryCategoryId;

    // Search filter (case-insensitive)
    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: "insensitive",
      };
      console.log("🔍 [ProductService] Searching for:", filters.search);
    }

    // Rarity filter (nested query)
    if (filters?.rarityId) {
      where.variants = {
        some: {
          rarityId: filters.rarityId,
          isActive: true,
        },
      };
    }

    // Price range filter (nested query on variants)
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      if (where.variants) {
        where.variants.some.price = {};
        if (filters.minPrice !== undefined) {
          where.variants.some.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          where.variants.some.price.lte = filters.maxPrice;
        }
      } else {
        where.variants = {
          some: {
            isActive: true,
            price: {},
          },
        };
        if (filters.minPrice !== undefined) {
          where.variants.some.price.gte = filters.minPrice;
        }
        if (filters.maxPrice !== undefined) {
          where.variants.some.price.lte = filters.maxPrice;
        }
      }
    }

    // ⭐ NEW: Build orderBy dynamically
    const orderBy: any = {};
    const sortBy = filters?.sortBy || "createdAt";
    const sortOrder = filters?.sortOrder || "desc";

    orderBy[sortBy] = sortOrder;

    console.log("🔍 [ProductService] Query params:", {
      limit: filters?.limit,
      skip: filters?.skip,
      sortBy,
      sortOrder,
    });

    return await this.prisma.product.findMany({
      where,
      // ⭐ NEW: Add pagination
      take: filters?.limit,
      skip: filters?.skip,
      include: {
        game: true,
        set: true,
        language: true,
        sealedCategory: true,
        accessoryCategory: true,
        images: {
          orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        },
        variants: {
          where: { isActive: true },
          include: {
            rarity: true,
            condition: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      // ⭐ NEW: Dynamic sorting
      orderBy,
    });
  };

  // ===========================
  // GET BY SLUG (with full details)
  // ===========================
  getBySlug = async (slug: string) => {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      include: {
        game: true,
        set: true,
        language: true,
        sealedCategory: true,
        accessoryCategory: true,
        images: {
          orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        },
        variants: {
          where: { isActive: true },
          include: {
            rarity: true,
            condition: true,
          },
          orderBy: [{ price: "asc" }],
        },
        reviews: {
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
        },
      },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    return product;
  };

  // ===========================
  // CREATE PRODUCT (with images & variants)
  // ===========================
  create = async (
    body: CreateProductDTO,
    thumbnail?: Express.Multer.File,
    photos?: Express.Multer.File[]
  ) => {
    // Validate product type specific fields
    this.validateProductTypeFields(body);

    // Generate slug
    let slug = generateSlug(body.name);
    let counter = 1;

    while (await this.prisma.product.findFirst({ where: { slug } })) {
      slug = `${generateSlug(body.name)}-${counter}`;
      counter++;
    }

    // Upload thumbnail
    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      const uploadResult = await this.cloudinary.upload(
        thumbnail,
        "products/thumbnails"
      );
      thumbnailUrl = uploadResult.secure_url;
    }

    // Upload photos
    const photoUrls: string[] = [];
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const uploadResult = await this.cloudinary.upload(
          photo,
          "products/photos"
        );
        photoUrls.push(uploadResult.secure_url);
      }
    }

    // Create product with images and variants
    return await this.prisma.product.create({
      data: {
        productType: body.productType,
        name: body.name,
        slug: slug,
        description: body.description,
        thumbnail: thumbnailUrl,
        weight: body.weight,

        // Single Card fields
        gameId: body.gameId,
        setId: body.setId,
        languageId: body.languageId,
        cardNumber: body.cardNumber,
        cardType: body.cardType,
        attribute: body.attribute,
        hp: body.hp,

        // Sealed Product fields
        sealedCategoryId: body.sealedCategoryId,
        cardsPerPack: body.cardsPerPack,
        packsPerBox: body.packsPerBox,

        // Accessory fields
        accessoryCategoryId: body.accessoryCategoryId,
        brand: body.brand,
        size: body.size,
        color: body.color,

        // Images
        images: {
          create: photoUrls.map((url, index) => ({
            url: url,
            isMain: index === 0,
          })),
        },

        // Variants
        variants: {
          create: body.variants?.map((variant) => ({
            rarityId: variant.rarityId,
            conditionId: variant.conditionId,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku,
            weight: variant.weight,
          })),
        },
      },
      include: {
        images: true,
        variants: {
          include: {
            rarity: true,
            condition: true,
          },
        },
      },
    });
  };

  // ===========================
  // UPDATE PRODUCT
  // ===========================
  update = async (
    slug: string,
    body: UpdateProductDTO,
    thumbnail?: Express.Multer.File,
    photos?: Express.Multer.File[]
  ) => {
    const product = await this.prisma.product.findFirst({
      where: { slug: slug, isActive: true },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Generate new slug if name changed
    let newSlug = product.slug;
    if (body.name && body.name !== product.name) {
      newSlug = generateSlug(body.name);
      let counter = 1;

      while (
        await this.prisma.product.findFirst({
          where: { slug: newSlug, NOT: { id: product.id } },
        })
      ) {
        newSlug = `${generateSlug(body.name)}-${counter}`;
        counter++;
      }
    }

    // Upload new thumbnail if provided
    let thumbnailUrl = product.thumbnail;
    if (thumbnail) {
      // Delete old thumbnail
      if (product.thumbnail) {
        await this.cloudinary.remove(product.thumbnail);
      }

      const uploadResult = await this.cloudinary.upload(
        thumbnail,
        "products/thumbnails"
      );
      thumbnailUrl = uploadResult.secure_url;
    }

    // Upload new photos if provided
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const uploadResult = await this.cloudinary.upload(
          photo,
          "products/photos"
        );

        await this.prisma.productImage.create({
          data: {
            productId: product.id,
            url: uploadResult.secure_url,
            isMain: false,
          },
        });
      }
    }

    // Update product
    return await this.prisma.product.update({
      where: { id: product.id },
      data: {
        name: body.name,
        slug: newSlug,
        description: body.description,
        thumbnail: thumbnailUrl,
        isActive: body.isActive,
        weight: body.weight,

        // Single Card fields
        gameId: body.gameId,
        setId: body.setId,
        languageId: body.languageId,
        cardNumber: body.cardNumber,
        cardType: body.cardType,
        attribute: body.attribute,
        hp: body.hp,

        // Sealed Product fields
        sealedCategoryId: body.sealedCategoryId,
        cardsPerPack: body.cardsPerPack,
        packsPerBox: body.packsPerBox,

        // Accessory fields
        accessoryCategoryId: body.accessoryCategoryId,
        brand: body.brand,
        size: body.size,
        color: body.color,
      },
      include: {
        images: {
          orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
        },
        variants: {
          include: {
            rarity: true,
            condition: true,
          },
        },
      },
    });
  };

  // ===========================
  // DELETE PRODUCT IMAGE
  // ===========================
  deleteImage = async (imageId: number) => {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new ApiError("Image not found", 404);
    }

    // Delete from Cloudinary
    await this.cloudinary.remove(image.url);

    // Delete from database
    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    return { message: "Image deleted successfully" };
  };

  // ===========================
  // DELETE PRODUCT
  // ===========================
  delete = async (slug: string) => {
    const product = await this.prisma.product.findFirst({
      where: { slug: slug, isActive: true },
      include: { images: true },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Check if product has orders
    const orderCount = await this.prisma.orderItem.count({
      where: { productId: product.id },
    });

    if (orderCount > 0) {
      throw new ApiError("Cannot delete product with existing orders", 400);
    }

    // Delete thumbnail from Cloudinary
    if (product.thumbnail) {
      await this.cloudinary.remove(product.thumbnail);
    }

    // Delete all photos from Cloudinary
    for (const image of product.images) {
      await this.cloudinary.remove(image.url);
    }

    // Soft delete
    await this.prisma.product.update({
      where: { id: product.id },
      data: { isActive: false },
    });

    return { message: "Product deleted successfully" };
  };

  // ===========================
  // VARIANT MANAGEMENT
  // ===========================
  createVariant = async (slug: string, body: CreateVariantDTO) => {
    const product = await this.prisma.product.findFirst({
      where: { slug: slug, isActive: true },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Check for duplicate variant
    const existingVariant = await this.prisma.productVariant.findFirst({
      where: {
        productId: product.id,
        rarityId: body.rarityId || null,
        conditionId: body.conditionId || null,
      },
    });

    if (existingVariant) {
      throw new ApiError("Variant with this combination already exists", 400);
    }

    return await this.prisma.productVariant.create({
      data: {
        productId: product.id,
        rarityId: body.rarityId,
        conditionId: body.conditionId,
        price: body.price,
        stock: body.stock,
        sku: body.sku,
        weight: body.weight,
      },
      include: {
        rarity: true,
        condition: true,
      },
    });
  };

  updateVariant = async (variantId: number, body: UpdateVariantDTO) => {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new ApiError("Variant not found", 404);
    }

    return await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        price: body.price,
        stock: body.stock,
        sku: body.sku,
        isActive: body.isActive,
        weight: body.weight,
      },
      include: {
        rarity: true,
        condition: true,
      },
    });
  };

  deleteVariant = async (variantId: number) => {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new ApiError("Variant not found", 404);
    }

    // Check if variant has orders
    const orderCount = await this.prisma.orderItem.count({
      where: { variantId: variantId },
    });

    if (orderCount > 0) {
      throw new ApiError("Cannot delete variant with existing orders", 400);
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: "Variant deleted successfully" };
  };

  // ===========================
  // GET PRODUCT WEIGHT WITH VARIANT OVERRIDE LOGIC
  // ===========================
  getProductWeight = async (
    productId: number,
    variantId?: number
  ): Promise<number> => {
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new ApiError("Variant not found", 404);
      }

      // Use variant weight if exists, otherwise use product weight
      return variant.weight ?? variant.product.weight;
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    return product.weight;
  };

  // ===========================
  // VALIDATION HELPER
  // ===========================
  private validateProductTypeFields = (body: CreateProductDTO) => {
    switch (body.productType) {
      case ProductType.SINGLE_CARD:
        if (!body.gameId || !body.setId || !body.languageId) {
          throw new ApiError(
            "Game, Set, and Language are required for Single Card",
            400
          );
        }
        break;

      case ProductType.SEALED_PRODUCT:
        if (!body.gameId || !body.sealedCategoryId) {
          throw new ApiError(
            "Game and Sealed Category are required for Sealed Product",
            400
          );
        }
        break;

      case ProductType.ACCESSORY:
        if (!body.accessoryCategoryId) {
          throw new ApiError(
            "Accessory Category is required for Accessory",
            400
          );
        }
        break;
    }
  };
}
