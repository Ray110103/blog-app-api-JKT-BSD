import { Request, Response, NextFunction } from "express";
import { CardRarityService } from "./card-rarity.service";
import { ApiError } from "../../utils/api-error";

export class CardRarityController {
  private cardRarityService: CardRarityService;

  constructor() {
    this.cardRarityService = new CardRarityService();
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

      const filters = {
        setId: req.query.setId ? Number(req.query.setId) : undefined,
        gameId: req.query.gameId ? Number(req.query.gameId) : undefined,
        languageId: req.query.languageId ? Number(req.query.languageId) : undefined,
      };

      if (hasPagination) {
        const result = await this.cardRarityService.getAllPaginated(filters, {
          page,
          limit,
          skip,
        });
        res.status(200).json({
          success: true,
          data: result.rarities,
          pagination: result.pagination,
        });
        return;
      }

      const rarities = await this.cardRarityService.getAll();
      res.status(200).json(rarities);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rarity = await this.cardRarityService.getById(Number(id));
      res.status(200).json(rarity);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rarity = await this.cardRarityService.create(req.body);
      res.status(201).json(rarity);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ NEW: Bulk create
  createBulk = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.cardRarityService.createBulk(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rarity = await this.cardRarityService.update(Number(id), req.body);
      res.status(200).json(rarity);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.cardRarityService.delete(Number(id));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
