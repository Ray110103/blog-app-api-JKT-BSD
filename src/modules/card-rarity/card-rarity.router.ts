import { Router } from "express";
import { CardRarityController } from "./card-rarity.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateCardRarityDTO } from "./dto/create-card-rarity.dto";
import { CreateBulkCardRaritiesDTO } from "./dto/create-bulk-card-rarities.dto";
import { UpdateCardRarityDTO } from "./dto/update-card-rarity.dto";

export class CardRarityRouter {
  private router: Router;
  private cardRarityController: CardRarityController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.cardRarityController = new CardRarityController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.cardRarityController.getAll);
    this.router.get("/:id", this.cardRarityController.getById);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(CreateCardRarityDTO),
      this.cardRarityController.create
    );

    // ⭐ NEW: Bulk create endpoint
    this.router.post(
      "/bulk",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(CreateBulkCardRaritiesDTO),
      this.cardRarityController.createBulk
    );

    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(UpdateCardRarityDTO),
      this.cardRarityController.update
    );

    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.cardRarityController.delete
    );
  };

  getRouter = () => this.router;
}