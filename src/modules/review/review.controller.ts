import { Request, Response } from "express";
import { ReviewService } from "./review.service";

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  // GET /reviews
  getAll = async (req: Request, res: Response) => {
    try {
      const filters = {
        productId: req.query.productId ? Number(req.query.productId) : undefined,
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        rating: req.query.rating ? Number(req.query.rating) : undefined,
      };

      const reviews = await this.reviewService.getAll(filters);
      res.status(200).json(reviews);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // GET /reviews/product/:productId
  getByProduct = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const reviews = await this.reviewService.getByProduct(Number(productId));
      res.status(200).json(reviews);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // GET /reviews/product/:productId/stats
  getProductStats = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const stats = await this.reviewService.getProductStats(Number(productId));
      res.status(200).json(stats);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // POST /reviews
  create = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user.id;
      const review = await this.reviewService.create(userId, req.body);
      res.status(201).json({
        success: true,
        message: "Review created successfully",
        data: review,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // PATCH /reviews/:reviewId
  update = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const userId = res.locals.user.id;
      const review = await this.reviewService.update(
        Number(reviewId),
        userId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: "Review updated successfully",
        data: review,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // DELETE /reviews/:reviewId
  delete = async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const userId = res.locals.user.id;
      const isAdmin = res.locals.user.role === "ADMIN";
      const result = await this.reviewService.delete(
        Number(reviewId),
        userId,
        isAdmin
      );
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // GET /reviews/can-review/:productId
  canReview = async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const userId = res.locals.user.id;
      const result = await this.reviewService.canUserReview(
        userId,
        Number(productId)
      );
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };
}