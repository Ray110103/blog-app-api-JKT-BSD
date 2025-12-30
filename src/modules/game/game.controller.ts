import { Request, Response, NextFunction } from "express";
import { GameService } from "./game.service";

export class GameController {
  private gameService: GameService;

  constructor() {
    this.gameService = new GameService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const games = await this.gameService.getAll();
      res.status(200).json(games);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const game = await this.gameService.getBySlug(slug);
      res.status(200).json(game);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const thumbnail = req.file;
      const game = await this.gameService.create(req.body, thumbnail);
      res.status(201).json(game);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const thumbnail = req.file;
      const game = await this.gameService.update(slug, req.body, thumbnail);
      res.status(200).json(game);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const result = await this.gameService.delete(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}