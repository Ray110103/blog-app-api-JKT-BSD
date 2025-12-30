import { Request, Response, NextFunction } from "express";
import { BidService } from "./bid.service";
import { ApiError } from "../../utils/api-error";

export class BidController {
  bidService: BidService;

  constructor() {
    this.bidService = new BidService();
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
   * POST /bids/:auctionId
   * Place bid on auction
   */
  placeBid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const auctionId = parseInt(req.params.auctionId);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const bid = await this.bidService.placeBid(userId, auctionId, req.body);

      res.status(201).json({
        success: true,
        message: "Bid placed successfully",
        data: bid,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /bids/auctions/:auctionId/history
   * Get bid history for auction (Public)
   */
  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auctionId = parseInt(req.params.auctionId);

      if (isNaN(auctionId)) {
        throw new ApiError("Invalid auction ID", 400);
      }

      const bids = await this.bidService.getHistory(auctionId);

      res.status(200).json({
        success: true,
        count: bids.length,
        data: bids,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /bids/my-bids
   * Get user's active bids
   */
  getMyActiveBids = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const bids = await this.bidService.getMyBids(userId);

      res.status(200).json({
        success: true,
        count: bids.length,
        data: bids,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /bids/won-auctions
   * Get user's won auctions (pending payment)
   */
  getWonAuctions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const auctions = await this.bidService.getWonAuctions(userId);

      res.status(200).json({
        success: true,
        count: auctions.length,
        data: auctions,
      });
    } catch (error) {
      next(error);
    }
  };
}