import { Router } from "express";
import { ShippingController } from "./shipping.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";

export class ShippingRouter {
  private router: Router;
  private shippingController: ShippingController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.shippingController = new ShippingController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    const jwtSecret = process.env.JWT_SECRET!;

    /**
     * GET /shipping/provinces
     * Get all provinces (Public - no auth required)
     */
    this.router.get("/provinces", this.shippingController.getProvinces);

    /**
     * GET /shipping/cities
     * Get all cities (Public - no auth required)
     */
    this.router.get("/cities", this.shippingController.getAllCities);

    /**
     * GET /shipping/cities/:provinceId
     * Get cities by province ID (Public - no auth required)
     */
    this.router.get("/cities/:provinceId", this.shippingController.getCities);

    /**
     * POST /shipping/cost
     * Calculate shipping cost (Protected - auth required)
     */
    this.router.post(
      "/cost",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.shippingController.calculateCost
    );
  };

  getRouter = () => this.router;
}