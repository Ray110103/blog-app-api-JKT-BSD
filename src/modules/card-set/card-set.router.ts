import { Router } from "express";
import { CardSetController } from "./card-set.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateCardSetDTO } from "./dto/create-card-set.dto";
import { UpdateCardSetDTO } from "./dto/update-card-set.dto";

export class CardSetRouter {
  private router: Router;
  private cardSetController: CardSetController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.cardSetController = new CardSetController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.cardSetController.getAll);
    this.router.get("/:slug", this.cardSetController.getBySlug);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"),
      validateBody(CreateCardSetDTO),
      this.cardSetController.create
    );

    this.router.patch(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"),
      validateBody(UpdateCardSetDTO),
      this.cardSetController.update
    );

    this.router.delete(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.cardSetController.delete
    );
  };

  getRouter = () => this.router;
}