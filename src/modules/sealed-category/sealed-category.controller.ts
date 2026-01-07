import { Request, Response, NextFunction } from "express";
import { SealedCategoryService } from "./sealed-category.service";
import { ApiError } from "../../utils/api-error";

export class SealedCategoryController {
  private sealedCategoryService: SealedCategoryService;

  constructor() {
    this.sealedCategoryService = new SealedCategoryService();
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
        const result = await this.sealedCategoryService.getAllPaginated({
          page,
          limit,
          skip,
        });
        res.status(200).json({
          success: true,
          data: result.categories,
          pagination: result.pagination,
        });
        return;
      }

      const categories = await this.sealedCategoryService.getAll();
      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const category = await this.sealedCategoryService.getBySlug(slug);
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thumbnail = req.file; // Single file
      const category = await this.sealedCategoryService.create(
        req.body,
        thumbnail
      );
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const thumbnail = req.file; // Single file
      const category = await this.sealedCategoryService.update(
        slug,
        req.body,
        thumbnail
      );
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const result = await this.sealedCategoryService.delete(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
