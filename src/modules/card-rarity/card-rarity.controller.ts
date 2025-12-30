import { Request, Response, NextFunction } from "express";
import { CardRarityService } from "./card-rarity.service";

export class CardRarityController {
  private cardRarityService: CardRarityService;

  constructor() {
    this.cardRarityService = new CardRarityService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rarities = await this.cardRarityService.getAll();
      res.status(200).json(rarities);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rarity = await this.cardRarityService.getById(Number(id));
      res.status(200).json(rarity);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rarity = await this.cardRarityService.create(req.body);
      res.status(201).json(rarity);
    } catch (error) {
      next(error);
    }
  };

  // ⭐ NEW: Bulk create
  createBulk = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.cardRarityService.createBulk(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const rarity = await this.cardRarityService.update(Number(id), req.body);
      res.status(200).json(rarity);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.cardRarityService.delete(Number(id));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}