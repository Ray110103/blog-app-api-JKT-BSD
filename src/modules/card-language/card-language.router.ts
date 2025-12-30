import { Router } from "express";
import { CardLanguageController } from "./card-language.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateCardLanguageDTO } from "./dto/create-card-language.dto";
import { UpdateCardLanguageDTO } from "./dto/update-card-language.dto";

export class CardLanguageRouter {
  private router: Router;
  private cardLanguageController: CardLanguageController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.cardLanguageController = new CardLanguageController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.cardLanguageController.getAll);
    this.router.get("/:id", this.cardLanguageController.getById);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(CreateCardLanguageDTO),
      this.cardLanguageController.create
    );

    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(UpdateCardLanguageDTO),
      this.cardLanguageController.update
    );

    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.cardLanguageController.delete
    );
  };

  getRouter = () => this.router;
}