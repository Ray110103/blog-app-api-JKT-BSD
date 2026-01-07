import { Request, Response, NextFunction } from "express";
import { GameService } from "./game.service";
import { ApiError } from "../../utils/api-error";

export class GameController {
  private gameService: GameService;

  constructor() {
    this.gameService = new GameService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawPage = req.query.page;
      const rawLimit = req.query.limit ?? req.query.take;
      const rawSkip = req.query.skip;

      const hasPagination =
        rawPage !== undefined || rawLimit !== undefined || rawSkip !== undefined;

      const page = rawPage !== undefined ? Number(rawPage) : undefined;
      const limit = rawLimit !== undefined ? Number(rawLimit) : undefined;
      const skip = rawSkip !== undefined ? Number(rawSkip) : undefined;

      if (page !== undefined && (!Number.isFinite(page) || page < 1)) {
        throw new ApiError("Invalid `page` query param", 400);
      }
      if (
        limit !== undefined &&
        (!Number.isFinite(limit) || limit < 1 || limit > 100)
      ) {
        throw new ApiError("Invalid `limit` query param", 400);
      }
      if (skip !== undefined && (!Number.isFinite(skip) || skip < 0)) {
        throw new ApiError("Invalid `skip` query param", 400);
      }

      if (hasPagination) {
        const result = await this.gameService.getAllPaginated({
          page,
          limit,
          skip,
        });
        res.status(200).json({
          success: true,
          data: result.games,
          pagination: result.pagination,
        });
        return;
      }

      const games = await this.gameService.getAll();
      res.status(200).json(games);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const game = await this.gameService.getBySlug(slug);
      res.status(200).json(game);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thumbnail = req.file;
      const game = await this.gameService.create(req.body, thumbnail);
      res.status(201).json(game);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const thumbnail = req.file;
      const game = await this.gameService.update(slug, req.body, thumbnail);
      res.status(200).json(game);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const result = await this.gameService.delete(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
