import { Router } from "express";
import { ReviewController } from "./review.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateReviewDTO } from "./dto/create-review.dto";
import { UpdateReviewDTO } from "./dto/update-review.dto";

export class ReviewRouter {
  private reviewController: ReviewController;
  private router: Router;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.reviewController = new ReviewController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // ===========================
    // PUBLIC ROUTES
    // ===========================
    // Get all reviews (with optional filters)
    this.router.get("/", this.reviewController.getAll);

    // Get reviews by product
    this.router.get("/product/:productId", this.reviewController.getByProduct);

    // Get review stats for product
    this.router.get(
      "/product/:productId/stats",
      this.reviewController.getProductStats
    );

    // ===========================
    // PROTECTED ROUTES (USER)
    // ===========================
    // Create review
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateReviewDTO),
      this.reviewController.create
    );

    // Update review
    this.router.patch(
      "/:reviewId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(UpdateReviewDTO),
      this.reviewController.update
    );

    // Delete review
    this.router.delete(
      "/:reviewId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.reviewController.delete
    );

    // Check if user can review product
    this.router.get(
      "/can-review/:productId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.reviewController.canReview
    );
  };

  getRouter = () => {
    return this.router;
  };
}