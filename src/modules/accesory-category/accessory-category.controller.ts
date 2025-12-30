import { Request, Response, NextFunction } from "express";
import { AccessoryCategoryService } from "./accessory-category.service";

export class AccessoryCategoryController {
  private accessoryCategoryService: AccessoryCategoryService;

  constructor() {
    this.accessoryCategoryService = new AccessoryCategoryService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.accessoryCategoryService.getAll();
      res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const category = await this.accessoryCategoryService.getBySlug(slug);
      res.status(200).json(category);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thumbnail = req.file; // Single file
      const category = await this.accessoryCategoryService.create(
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
      const category = await this.accessoryCategoryService.update(
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
      const result = await this.accessoryCategoryService.delete(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}