import { Request, Response, NextFunction } from "express";
import { AuctionService } from "./auction.service";
import { ApiError } from "../../utils/api-error";

export class AuctionController {
  auctionService: AuctionService;

  constructor() {
    this.auctionService = new AuctionService();
  }

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

  /**
   * POST /auctions
   * Create auction (Admin only)
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = this.getUserId(res);
      const auction = await this.auctionService.create(adminId, req.body);

      res.status(201).json({
        success: true,
        message: "Auction created successfully",
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /auctions/:id
   * Update auction (Admin only)
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = this.getUserId(res);
      const auctionId = parseInt(req.params.id);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const auction = await this.auctionService.update(
        adminId,
        auctionId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Auction updated successfully",
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  endAuction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = this.getUserId(res);
      const auctionId = parseInt(req.params.id);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const auction = await this.auctionService.endAuction(adminId, auctionId);

      res.status(200).json({
        success: true,
        message: auction.winner 
          ? "Auction ended successfully. Winner has 48 hours to complete payment."
          : "Auction ended successfully with no winner.",
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auctions
   * Get all auctions (Public)
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: any = {};

      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      if (req.query.productId) {
        filters.productId = parseInt(req.query.productId as string);
      }

      if (req.query.minPrice) {
        filters.minPrice = parseInt(req.query.minPrice as string);
      }

      if (req.query.maxPrice) {
        filters.maxPrice = parseInt(req.query.maxPrice as string);
      }

      const auctions = await this.auctionService.getAll(filters);

      res.status(200).json({
        success: true,
        count: auctions.length,
        data: auctions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auctions/:id
   * Get auction by ID (Public)
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auctionId = parseInt(req.params.id);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const auction = await this.auctionService.getById(auctionId);

      res.status(200).json({
        success: true,
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auctions/:id/buyout
   * Buy out auction (Authenticated)
   */
  buyOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const auctionId = parseInt(req.params.id);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const auction = await this.auctionService.buyOut(userId, auctionId);

      res.status(200).json({
        success: true,
        message: "Auction bought out successfully. Please complete payment within 48 hours.",
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auctions/:id/relist
   * Re-list auction (Admin only)
   */
  relist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = this.getUserId(res);
      const auctionId = parseInt(req.params.id);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const auction = await this.auctionService.relist(
        adminId,
        auctionId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Auction re-listed successfully",
        data: auction,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auctions/:id/cancel
   * Cancel auction (Admin only)
   */
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = this.getUserId(res);
      const auctionId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      if (!reason) {
        throw new ApiError("Cancellation reason is required", 400);
      }

      const result = await this.auctionService.cancel(
        adminId,
        auctionId,
        reason
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
   * GET /auctions/admin/failed-payments
   * Get auctions with payment failures (Admin only)
   */
  getFailedPayments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const auctions = await this.auctionService.getFailedPayments();

      res.status(200).json({
        success: true,
        count: auctions.length,
        data: auctions,
      });
    } catch (error) {
      next(error);
    }
  };

  getBidHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auctionId = parseInt(req.params.id);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const bids = await this.auctionService.getBidHistory(auctionId);

      res.status(200).json({
        success: true,
        count: bids.length,
        data: bids,
      });
    } catch (error) {
      next(error);
    }
  };
}