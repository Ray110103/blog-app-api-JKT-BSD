import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ApiError } from "../../utils/api-error";
import { CreateGameDTO } from "./dto/create-game.dto";
import { UpdateGameDTO } from "./dto/update-game.dto";
import { generateSlug } from "../../utils/generate-slug";

export class GameService {
  private prisma: PrismaService;
  private cloudinary: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinary = new CloudinaryService();
  }

  // ⭐ REMOVED: private generateSlug method (use utils instead)

  getAll = async () => {
    return await this.prisma.game.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  };

  getBySlug = async (slug: string) => {
    const game = await this.prisma.game.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      include: {
        sets: { take: 10, orderBy: { releaseDate: "desc" } },
        _count: { select: { sets: true, products: true } },
      },
    });

    if (!game) {
      throw new ApiError("Game not found", 404);
    }

    return game;
  };

  create = async (body: CreateGameDTO, thumbnail?: Express.Multer.File) => {
    const existingGame = await this.prisma.game.findFirst({
      where: {
        name: body.name,
        isActive: true,
      },
    });

    if (existingGame) {
      throw new ApiError("Game with this name already exists", 400);
    }

    let slug = generateSlug(body.name); // ⭐ USE utils function

    let slugExists = await this.prisma.game.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });
    let counter = 1;

    while (slugExists) {
      slug = `${generateSlug(body.name)}-${counter}`; // ⭐ USE utils function
      slugExists = await this.prisma.game.findFirst({
        where: {
          slug: slug,
          isActive: true,
        },
      });
      counter++;
    }

    let thumbnailUrl: string | undefined;

    if (thumbnail) {
      const { secure_url } = await this.cloudinary.upload(
        thumbnail,
        "games/thumbnails"
      );
      thumbnailUrl = secure_url;
    }

    return await this.prisma.game.create({
      data: {
        name: body.name,
        slug: slug,
        thumbnail: thumbnailUrl,
        isActive: true,
      },
    });
  };

  update = async (
    slug: string,
    body: UpdateGameDTO,
    thumbnail?: Express.Multer.File
  ) => {
    const game = await this.prisma.game.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!game) {
      throw new ApiError("Game not found", 404);
    }

    let newSlug = slug;

    if (body.name && body.name !== game.name) {
      const existingGame = await this.prisma.game.findFirst({
        where: {
          name: body.name,
          isActive: true,
          NOT: { id: game.id },
        },
      });

      if (existingGame) {
        throw new ApiError("Game name already taken", 400);
      }

      newSlug = generateSlug(body.name); // ⭐ USE utils function

      let slugExists = await this.prisma.game.findFirst({
        where: {
          slug: newSlug,
          isActive: true,
          NOT: { id: game.id },
        },
      });

      let counter = 1;
      while (slugExists) {
        newSlug = `${generateSlug(body.name)}-${counter}`; // ⭐ USE utils function
        slugExists = await this.prisma.game.findFirst({
          where: {
            slug: newSlug,
            isActive: true,
            NOT: { id: game.id },
          },
        });
        counter++;
      }
    }

    let thumbnailUrl = game.thumbnail;

    if (thumbnail) {
      if (game.thumbnail) {
        await this.cloudinary.remove(game.thumbnail);
      }

      const { secure_url } = await this.cloudinary.upload(
        thumbnail,
        "games/thumbnails"
      );
      thumbnailUrl = secure_url;
    }

    return await this.prisma.game.update({
      where: { id: game.id },
      data: {
        name: body.name,
        slug: newSlug,
        thumbnail: thumbnailUrl,
        isActive: body.isActive,
      },
    });
  };

  delete = async (slug: string) => {
    const game = await this.prisma.game.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
    });

    if (!game) {
      throw new ApiError("Game not found", 404);
    }

    const productCount = await this.prisma.product.count({
      where: { gameId: game.id },
    });

    if (productCount > 0) {
      throw new ApiError("Cannot delete game with existing products", 400);
    }

    await this.prisma.game.update({
      where: { id: game.id },
      data: { isActive: false },
    });

    return { message: "Game deleted successfully" };
  };
}