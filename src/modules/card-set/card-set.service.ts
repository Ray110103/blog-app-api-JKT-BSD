import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ApiError } from "../../utils/api-error";
import { CreateCardSetDTO } from "./dto/create-card-set.dto";
import { UpdateCardSetDTO } from "./dto/update-card-set.dto";
import { generateSlug } from "../../utils/generate-slug";

export class CardSetService {
  private prisma: PrismaService;
  private cloudinary: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinary = new CloudinaryService();
  }

  // ⭐ UPDATED: Add filters parameter
  getAll = async (filters?: { languageId?: number }) => {
    const where: any = { isActive: true };

    // ⭐ NEW: Filter by language if provided
    if (filters?.languageId) {
      where.languageId = filters.languageId;
    }

    return await this.prisma.set.findMany({
      where,
      include: {
        game: { select: { id: true, name: true } },
        language: { select: { id: true, name: true, code: true } },
      },
      // ⭐ UPDATED: Sort by releaseDate DESC (newest first), then by name
      orderBy: [
        { releaseDate: "desc" },
        { name: "asc" }
      ],
    });
  };

  getBySlug = async (slug: string) => {
    const set = await this.prisma.set.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      include: {
        game: true,
        language: true,
        _count: { select: { products: true } },
      },
    });

    if (!set) {
      throw new ApiError("Card set not found", 404);
    }

    return set;
  };

  create = async (body: CreateCardSetDTO, thumbnail?: Express.Multer.File) => {
    // Check if game exists and is active
    const game = await this.prisma.game.findFirst({
      where: { id: body.gameId, isActive: true },
    });

    if (!game) {
      throw new ApiError("Game not found", 404);
    }

    // Check if language exists and is active
    const language = await this.prisma.language.findFirst({
      where: { id: body.languageId, isActive: true },
    });

    if (!language) {
      throw new ApiError("Card language not found", 404);
    }

    // Check if set with same game + language + name already exists (active only)
    const existingSet = await this.prisma.set.findFirst({
      where: {
        gameId: body.gameId,
        languageId: body.languageId,
        name: body.name,
        isActive: true,
      },
    });

    if (existingSet) {
      throw new ApiError(
        "Set with this game, language, and name already exists",
        400
      );
    }

    // Generate slug
    let slug = generateSlug(body.name);
    let slugExists = await this.prisma.set.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });
    let counter = 1;

    while (slugExists) {
      slug = `${generateSlug(body.name)}-${counter}`;
      slugExists = await this.prisma.set.findFirst({
        where: {
          slug: slug,
          isActive: true,
        },
      });
      counter++;
    }

    // Upload thumbnail
    let thumbnailUrl: string | undefined;

    if (thumbnail) {
      const { secure_url } = await this.cloudinary.upload(
        thumbnail,
        "sets/thumbnails"
      );
      thumbnailUrl = secure_url;
    }

    return await this.prisma.set.create({
      data: {
        gameId: body.gameId,
        languageId: body.languageId,
        name: body.name,
        slug: slug,
        code: body.code,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
        thumbnail: thumbnailUrl,
        isActive: true,
      },
      include: {
        game: true,
        language: true,
      },
    });
  };

  update = async (
    slug: string,
    body: UpdateCardSetDTO,
    thumbnail?: Express.Multer.File
  ) => {
    const set = await this.prisma.set.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!set) {
      throw new ApiError("Card set not found", 404);
    }

    // Check if game exists (if provided)
    if (body.gameId) {
      const game = await this.prisma.game.findFirst({
        where: { id: body.gameId, isActive: true },
      });

      if (!game) {
        throw new ApiError("Game not found", 404);
      }
    }

    // Check if language exists (if provided)
    if (body.languageId) {
      const language = await this.prisma.language.findFirst({
        where: { id: body.languageId, isActive: true },
      });

      if (!language) {
        throw new ApiError("Card language not found", 404);
      }
    }

    // Check if new combination of game + language + name already exists
    if (body.gameId || body.languageId || body.name) {
      const existingSet = await this.prisma.set.findFirst({
        where: {
          gameId: body.gameId ?? set.gameId,
          languageId: body.languageId ?? set.languageId,
          name: body.name ?? set.name,
          isActive: true,
          NOT: { id: set.id },
        },
      });

      if (existingSet) {
        throw new ApiError(
          "Set with this game, language, and name already exists",
          400
        );
      }
    }

    // Generate new slug if name changed
    let newSlug = slug;
    if (body.name && body.name !== set.name) {
      newSlug = generateSlug(body.name);
      let slugExists = await this.prisma.set.findFirst({
        where: {
          slug: newSlug,
          isActive: true,
          NOT: { id: set.id },
        },
      });

      let counter = 1;
      while (slugExists) {
        newSlug = `${generateSlug(body.name)}-${counter}`;
        slugExists = await this.prisma.set.findFirst({
          where: {
            slug: newSlug,
            isActive: true,
            NOT: { id: set.id },
          },
        });
        counter++;
      }
    }

    // Handle thumbnail upload
    let thumbnailUrl = set.thumbnail;

    if (thumbnail) {
      if (set.thumbnail) {
        await this.cloudinary.remove(set.thumbnail);
      }

      const { secure_url } = await this.cloudinary.upload(
        thumbnail,
        "sets/thumbnails"
      );
      thumbnailUrl = secure_url;
    }

    return await this.prisma.set.update({
      where: { id: set.id },
      data: {
        gameId: body.gameId,
        languageId: body.languageId,
        name: body.name,
        slug: newSlug,
        code: body.code,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : undefined,
        thumbnail: thumbnailUrl,
        isActive: body.isActive,
      },
      include: {
        game: true,
        language: true,
      },
    });
  };

  delete = async (slug: string) => {
    const set = await this.prisma.set.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!set) {
      throw new ApiError("Card set not found", 404);
    }

    // Check if set has products
    const productCount = await this.prisma.product.count({
      where: { setId: set.id },
    });

    if (productCount > 0) {
      throw new ApiError("Cannot delete set with existing products", 400);
    }

    // Soft delete
    await this.prisma.set.update({
      where: { id: set.id },
      data: { isActive: false },
    });

    return { message: "Card set deleted successfully" };
  };
}