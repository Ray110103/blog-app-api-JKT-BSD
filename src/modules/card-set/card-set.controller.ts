import { Request, Response, NextFunction } from "express";
import { CardSetService } from "./card-set.service";

export class CardSetController {
  private cardSetService: CardSetService;

  constructor() {
    this.cardSetService = new CardSetService();
  }

  // ⭐ UPDATED: Parse languageId from query
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        languageId: req.query.languageId ? Number(req.query.languageId) : undefined,
      };

      const sets = await this.cardSetService.getAll(filters);
      res.status(200).json(sets);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const set = await this.cardSetService.getBySlug(slug);
      res.status(200).json(set);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thumbnail = req.file;
      const set = await this.cardSetService.create(req.body, thumbnail);
      res.status(201).json(set);
    } catch (error) {
      next(error);
    }
  };

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