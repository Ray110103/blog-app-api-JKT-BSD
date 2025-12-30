import { Request, Response, NextFunction } from "express";
import { CronService } from "./cron.service";

export class CronController {
  cronService: CronService;

  constructor() {
    this.cronService = new CronService();
  }

  /**
   * POST /cron/trigger/auto-complete-orders
   * Manually trigger auto-complete orders job
   */
  triggerAutoCompleteOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.cronService.orderService.autoCompleteOrders();

      res.status(200).json({
        success: true,
        message: "Auto-complete orders job triggered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cron/trigger/auto-end-auctions
   * Manually trigger auto-end auctions job
   */
  triggerAutoEndAuctions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.cronService.autoEndAuctions();

      res.status(200).json({
        success: true,
        message: "Auto-end auctions job triggered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cron/trigger/detect-payment-failures
   * Manually trigger detect payment failures job
   */
  triggerDetectPaymentFailures = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.cronService.auctionStatsService.detectPaymentFailures();

      res.status(200).json({
        success: true,
        message: "Detect payment failures job triggered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * ✅ NEW: POST /cron/trigger/cancel-unpaid-auction-orders
   * Manually trigger cancel unpaid auction orders job
   */
  triggerCancelUnpaidAuctionOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.cronService.autoCancelUnpaidAuctionOrders();

      res.status(200).json({
        success: true,
        message: "Cancel unpaid auction orders job triggered successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}