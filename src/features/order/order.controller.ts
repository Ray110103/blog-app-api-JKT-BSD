import { Request, Response, NextFunction } from "express";
import { OrderService } from "./order.service";
import { ApiError } from "../../utils/api-error";

export class OrderController {
  orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * POST /orders/checkout
   * Create order from cart
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const order = await this.orderService.create(userId, req.body);

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ NEW: POST /orders/checkout-auctions/preview
   * Preview auction checkout (calculate shipping)
   */
  previewAuctionCheckout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = this.getUserId(res);
      const preview = await this.orderService.previewAuctionCheckout(
        userId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Auction checkout preview generated successfully",
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ NEW: POST /orders/checkout-auctions
   * Create order from auctions
   */
  createFromAuctions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = this.getUserId(res);
      const order = await this.orderService.createFromAuctions(userId, req.body);

      res.status(201).json({
        success: true,
        message: "Order created successfully from auctions",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders
   * Get all orders for user
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const orders = await this.orderService.getAll(userId);

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/:orderNumber
   * Get order detail
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const { orderNumber } = req.params;

      const order = await this.orderService.getById(userId, orderNumber);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /orders/:orderNumber/payment
   * Upload payment proof
   */
  uploadPaymentProof = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = this.getUserId(res);
      const { orderNumber } = req.params;

      if (!req.file) {
        throw new ApiError("Payment proof file is required", 400);
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ApiError(
          "Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed",
          400
        );
      }

      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        throw new ApiError("File size exceeds 5MB limit", 400);
      }

      const order = await this.orderService.uploadPaymentProof(
        userId,
        orderNumber,
        req.body,
        req.file
      );

      res.status(200).json({
        success: true,
        message:
          "Payment proof uploaded successfully. Waiting for admin confirmation",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /orders/:orderNumber/cancel
   * Cancel order
   */
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const { orderNumber } = req.params;

      const result = await this.orderService.cancel(
        userId,
        orderNumber,
        req.body
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /orders/:orderNumber/confirm-receipt
   * Customer confirms receipt of order
   */
  confirmReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const { orderNumber } = req.params;

      const order = await this.orderService.confirmReceipt(userId, orderNumber);

      res.status(200).json({
        success: true,
        message: "Order completed successfully. Thank you for your purchase!",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper: Get user ID from JWT token
   */
  getUserId = (res: Response): number => {
    const user = res.locals.user;
    const userId = user?.userId || user?.id || user?.sub;

    if (!userId) {
      throw new ApiError("User ID not found in token", 401);
    }

    return Number(userId);
  };
}