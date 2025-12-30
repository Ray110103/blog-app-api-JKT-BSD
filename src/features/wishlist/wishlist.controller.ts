import { Request, Response, NextFunction } from "express";
import { WishlistService } from "./wishlist.service";

export class WishlistController {
  private wishlistService: WishlistService;

  constructor() {
    this.wishlistService = new WishlistService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
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