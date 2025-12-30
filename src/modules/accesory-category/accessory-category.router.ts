import { Router } from "express";
import { AccessoryCategoryController } from "./accessory-category.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateAccessoryCategoryDTO } from "./dto/create-accessory-category.dto";
import { UpdateAccessoryCategoryDTO } from "./dto/update-accessory-category.dto";

export class AccessoryCategoryRouter {
  private router: Router;
  private accessoryCategoryController: AccessoryCategoryController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.accessoryCategoryController = new AccessoryCategoryController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // Public routes
    this.router.get("/", this.accessoryCategoryController.getAll);
    this.router.get("/:slug", this.accessoryCategoryController.getBySlug);

    // Admin only routes
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"), // ⭐ Single file only
      validateBody(CreateAccessoryCategoryDTO),
      this.accessoryCategoryController.create
    );

    this.router.patch(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().single("thumbnail"), // ⭐ Single file only
      validateBody(UpdateAccessoryCategoryDTO),
      this.accessoryCategoryController.update
    );

    this.router.delete(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.accessoryCategoryController.delete
    );
  };

  getRouter = () => this.router;
}