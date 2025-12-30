import { Router } from "express";
import { ProductController } from "./product.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateVariantDTO } from "./dto/create-variant.dto";
import { UpdateVariantDTO } from "./dto/update-product.dto";

export class ProductRouter {
  private router: Router;
  private productController: ProductController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.productController = new ProductController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // ===========================
    // PUBLIC ROUTES
    // ===========================
    this.router.get("/", this.productController.getAll);
    this.router.get("/:slug", this.productController.getBySlug);

    // ===========================
    // ADMIN ONLY ROUTES - PRODUCTS
    // ===========================
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "photos", maxCount: 10 },
      ]),
      // ⭐ REMOVED: validateBody(CreateProductDTO) - not compatible with multipart
      this.productController.create
    );

    this.router.patch(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.uploaderMiddleware.upload().fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "photos", maxCount: 10 },
      ]),
      // ⭐ REMOVED: validateBody(UpdateProductDTO) - not compatible with multipart
      this.productController.update
    );

    this.router.delete(
      "/images/:imageId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.productController.deleteImage
    );

    this.router.delete(
      "/:slug",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.productController.delete
    );

    // ===========================
    // ADMIN ONLY ROUTES - VARIANTS
    // ===========================
    this.router.post(
      "/:slug/variants",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(CreateVariantDTO), // ✅ Keep this - variants use x-www-form-urlencoded
      this.productController.createVariant
    );

    this.router.patch(
      "/:slug/variants/:variantId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(UpdateVariantDTO), // ✅ Keep this
      this.productController.updateVariant
    );

    this.router.delete(
      "/:slug/variants/:variantId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      this.productController.deleteVariant
    );
  };

  getRouter = () => this.router;
}