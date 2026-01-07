import { Request, Response, NextFunction } from "express";
import { CardConditionService } from "./card-condition.service";
import { ApiError } from "../../utils/api-error";

export class CardConditionController {
  private cardConditionService: CardConditionService;

  constructor() {
    this.cardConditionService = new CardConditionService();
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
        const result = await this.cardConditionService.getAllPaginated({
          page,
          limit,
          skip,
        });
        res.status(200).json({
          success: true,
          data: result.conditions,
          pagination: result.pagination,
        });
        return;
      }

      const conditions = await this.cardConditionService.getAll();
      res.status(200).json(conditions);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const condition = await this.cardConditionService.getById(Number(id));
      res.status(200).json(condition);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const condition = await this.cardConditionService.create(req.body);
      res.status(201).json(condition);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const condition = await this.cardConditionService.update(
        Number(id),
        req.body
      );
      res.status(200).json(condition);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.cardConditionService.delete(Number(id));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
