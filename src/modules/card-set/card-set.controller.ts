import { Request, Response, NextFunction } from "express";
import { CardSetService } from "./card-set.service";
import { ApiError } from "../../utils/api-error";

export class CardSetController {
  private cardSetService: CardSetService;

  constructor() {
    this.cardSetService = new CardSetService();
  }

  // ⭐ EXISTING: Get all sets (with optional language filter)
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        languageId: req.query.languageId
          ? Number(req.query.languageId)
          : undefined,
      };

      const sets = await this.cardSetService.getAll(filters);
      res.status(200).json(sets);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ NEW: Get sets by game
  getByGame = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gameId = req.query.gameId ? Number(req.query.gameId) : undefined;
      const languageId = req.query.languageId
        ? Number(req.query.languageId)
        : undefined;

      if (!gameId) {
        throw new ApiError("gameId query parameter is required", 400);
      }

      const sets = await this.cardSetService.getByGame(gameId, languageId);
      res.status(200).json(sets);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ NEW: Get sets grouped by language
  getGroupedByLanguage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const gameId = req.query.gameId ? Number(req.query.gameId) : undefined;

      if (!gameId) {
        throw new ApiError("gameId query parameter is required", 400);
      }

      const grouped = await this.cardSetService.getGroupedByLanguage(gameId);
      res.status(200).json(grouped);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ EXISTING: Get by slug
  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const set = await this.cardSetService.getBySlug(slug);
      res.status(200).json(set);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ EXISTING: Create (unchanged)
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thumbnail = req.file;
      const set = await this.cardSetService.create(req.body, thumbnail);
      res.status(201).json(set);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ EXISTING: Update (unchanged)
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const thumbnail = req.file;
      const set = await this.cardSetService.update(slug, req.body, thumbnail);
      res.status(200).json(set);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ EXISTING: Delete (unchanged)
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const result = await this.cardSetService.delete(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}