import { Router } from "express";
import { CronController } from "./cron.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";

export class CronRouter {
  router: Router;
  cronController: CronController;
  jwtMiddleware: JwtMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.cronController = new CronController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializeRoutes();
  }

  initializeRoutes = () => {
    const jwtSecret = process.env.JWT_SECRET!;
    const adminChain = [
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.roleMiddleware.isAdmin,
    ];

    /**
     * POST /cron/trigger/auto-complete-orders
     * Manually trigger auto-complete orders job (Admin only)
     */
    this.router.post(
      "/trigger/auto-complete-orders",
      ...adminChain,
      this.cronController.triggerAutoCompleteOrders
    );

    /**
     * POST /cron/trigger/auto-end-auctions
     * Manually trigger auto-end auctions job (Admin only)
     */
    this.router.post(
      "/trigger/auto-end-auctions",
      ...adminChain,
      this.cronController.triggerAutoEndAuctions
    );

    /**
     * POST /cron/trigger/detect-payment-failures
     * Manually trigger detect payment failures job (Admin only)
     */
    this.router.post(
      "/trigger/detect-payment-failures",
      ...adminChain,
      this.cronController.triggerDetectPaymentFailures
    );

    /**
     * ✅ NEW: POST /cron/trigger/cancel-unpaid-auction-orders
     * Manually trigger cancel unpaid auction orders job (Admin only)
     */
    this.router.post(
      "/trigger/cancel-unpaid-auction-orders",
      ...adminChain,
      this.cronController.triggerCancelUnpaidAuctionOrders
    );
  };

  getRouter = () => this.router;
}