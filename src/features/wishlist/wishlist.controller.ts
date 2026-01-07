import { Request, Response, NextFunction } from "express";
import { WishlistService } from "./wishlist.service";
import { ApiError } from "../../utils/api-error";

export class WishlistController {
  private wishlistService: WishlistService;

  constructor() {
    this.wishlistService = new WishlistService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
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
        const result = await this.wishlistService.getAllPaginated(userId, {
          page,
          limit,
          skip,
        });
        res.status(200).json({
          success: true,
          data: result.wishlist,
          pagination: result.pagination,
        });
        return;
      }

      const wishlist = await this.wishlistService.getAll(userId);
      res.status(200).json(wishlist);
    } catch (error) {
      next(error);
    }
  };

  add = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const { productId } = req.body;

      const wishlistItem = await this.wishlistService.add(
        userId,
        Number(productId)
      );
      res.status(201).json(wishlistItem);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const { productId } = req.params;

      const result = await this.wishlistService.remove(
        userId,
        Number(productId)
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  check = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const { productId } = req.params;

      const result = await this.wishlistService.check(
        userId,
        Number(productId)
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const result = await this.wishlistService.getCount(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
