import { Router } from "express";
import { SampleController } from "./sample.controller";

export class SampleRouter {
  private sampleController: SampleController;
  private router: Router;
  constructor() {
    this.router = Router();
    this.sampleController = new SampleController();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.get("/", this.sampleController.getSamples);
    this.router.get("/:id", this.sampleController.getSample);
  };

  getRouter = () => {
    return this.router;
  };
}
