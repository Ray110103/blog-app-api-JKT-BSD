import { Request, Response, NextFunction } from "express";
import { CardConditionService } from "./card-condition.service";

export class CardConditionController {
  private cardConditionService: CardConditionService;

  constructor() {
    this.cardConditionService = new CardConditionService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
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