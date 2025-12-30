import { Router } from "express";
import { CardConditionController } from "./card-condition.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateCardConditionDTO } from "./dto/create-card-condition.dto";
import { UpdateCardConditionDTO } from "./dto/update-card-condition.dto";

export class CardConditionRouter {
  private router: Router;
  private cardConditionController: CardConditionController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.cardConditionController = new CardConditionController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.cardConditionController.getAll);
    this.router.get("/:id", this.cardConditionController.getById);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(CreateCardConditionDTO),
      this.cardConditionController.create
    );

    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(UpdateCardConditionDTO),
      this.cardConditionController.update
    );

    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.cardConditionController.delete
    );
  };

  getRouter = () => this.router;
}