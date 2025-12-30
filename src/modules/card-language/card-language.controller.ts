import { Request, Response, NextFunction } from "express";
import { CardLanguageService } from "./card-language.service";

export class CardLanguageController {
  private cardLanguageService: CardLanguageService;

  constructor() {
    this.cardLanguageService = new CardLanguageService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
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