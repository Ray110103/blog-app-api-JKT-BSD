import { Router } from "express";
import { GameController } from "./game.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateGameDTO } from "./dto/create-game.dto";
import { UpdateGameDTO } from "./dto/update-game.dto";


export class GameRouter {
  private router: Router;
  private gameController: GameController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.gameController = new GameController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.gameController.getAll);
    this.router.get("/:slug", this.gameController.getBySlug);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"),
      validateBody(CreateGameDTO),
      this.gameController.create
    );

    this.router.patch(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"),
      validateBody(UpdateGameDTO),
      this.gameController.update
    );

    this.router.delete(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.gameController.delete
    );
  };

  getRouter = () => this.router;
}