import { Request, Response, NextFunction } from "express";
import { CardLanguageService } from "./card-language.service";
import { ApiError } from "../../utils/api-error";

export class CardLanguageController {
  private cardLanguageService: CardLanguageService;

  constructor() {
    this.cardLanguageService = new CardLanguageService();
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
        const result = await this.cardLanguageService.getAllPaginated({
          page,
          limit,
          skip,
        });
        res.status(200).json({
          success: true,
          data: result.languages,
          pagination: result.pagination,
        });
        return;
      }

      const languages = await this.cardLanguageService.getAll();
      res.status(200).json(languages);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const language = await this.cardLanguageService.getById(Number(id));
      res.status(200).json(language);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const language = await this.cardLanguageService.create(req.body);
      res.status(201).json(language);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const language = await this.cardLanguageService.update(Number(id), req.body);
      res.status(200).json(language);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.cardLanguageService.delete(Number(id));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
