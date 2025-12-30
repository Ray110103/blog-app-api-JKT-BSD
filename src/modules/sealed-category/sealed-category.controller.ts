import { Request, Response, NextFunction } from "express";
import { SealedCategoryService } from "./sealed-category.service";

export class SealedCategoryController {
  private sealedCategoryService: SealedCategoryService;

  constructor() {
    this.sealedCategoryService = new SealedCategoryService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
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