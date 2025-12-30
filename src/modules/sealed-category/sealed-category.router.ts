import { Router } from "express";
import { SealedCategoryController } from "./sealed-category.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateSealedCategoryDTO } from "./dto/create-sealed-category.dto";
import { UpdateSealedCategoryDTO } from "./dto/update-sealed-category.dto";

export class SealedCategoryRouter {
  private router: Router;
  private sealedCategoryController: SealedCategoryController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.sealedCategoryController = new SealedCategoryController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.sealedCategoryController.getAll);
    this.router.get("/:slug", this.sealedCategoryController.getBySlug);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"), // ⭐ Single file only
      validateBody(CreateSealedCategoryDTO),
      this.sealedCategoryController.create
    );

    this.router.patch(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"), // ⭐ Single file only
      validateBody(UpdateSealedCategoryDTO),
      this.sealedCategoryController.update
    );

    this.router.delete(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.sealedCategoryController.delete
    );
  };

  getRouter = () => this.router;
}