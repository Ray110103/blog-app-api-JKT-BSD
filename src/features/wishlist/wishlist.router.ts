import { Router } from "express";
import { WishlistController } from "./wishlist.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { AddToWishlistDTO } from "./dto/add-to-wishlist.dto";
import { validateBody } from "../../middlewares/validate.middleware";

export class WishlistRouter {
  private router: Router;
  private wishlistController: WishlistController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.wishlistController = new WishlistController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // All routes require authentication
    this.router.use(
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!)
    );

    // Get all wishlist items
    this.router.get("/", this.wishlistController.getAll);

    // Get wishlist count
    this.router.get("/count", this.wishlistController.getCount);

    // Check if product is in wishlist
    this.router.get("/:productId/check", this.wishlistController.check);

    // Add to wishlist
    this.router.post(
      "/",
      validateBody(AddToWishlistDTO),
      this.wishlistController.add
    );

    // Remove from wishlist
    this.router.delete("/:productId", this.wishlistController.remove);
  };

  getRouter = () => this.router;
}