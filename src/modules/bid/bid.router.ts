import { Router } from "express";
import { BidController } from "./bid.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { PlaceBidDto } from "./dto/place-bid.dto";

export class BidRouter {
  router: Router;
  bidController: BidController;
  jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.bidController = new BidController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  initializeRoutes = () => {
    const jwtSecret = process.env.JWT_SECRET!;

    /**
     * POST /bids/:auctionId
     * Place bid on auction (Authenticated)
     */
    this.router.post(
      "/:auctionId",
      this.jwtMiddleware.verifyToken(jwtSecret),
      validateBody(PlaceBidDto),
      this.bidController.placeBid
    );

    /**
     * GET /bids/auctions/:auctionId/history
     * Get bid history for auction (Public)
     */
    this.router.get(
      "/auctions/:auctionId/history",
      this.bidController.getHistory
    );

    /**
     * GET /bids/my-bids
     * Get user's active bids (Authenticated)
     */
    this.router.get(
      "/my-bids",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.bidController.getMyActiveBids
    );

    /**
     * GET /bids/won-auctions
     * Get user's won auctions pending payment (Authenticated)
     */
    this.router.get(
      "/won-auctions",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.bidController.getWonAuctions
    );
  };

  getRouter = () => this.router;
}