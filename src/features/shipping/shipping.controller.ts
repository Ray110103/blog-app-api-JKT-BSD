import { Request, Response, NextFunction } from "express";
import { ShippingService } from "./shipping.service";
import { ApiError } from "../../utils/api-error";

export class ShippingController {
  private shippingService: ShippingService;

  constructor() {
    this.shippingService = new ShippingService();
  }

  /**
   * GET /shipping/provinces
   * Get all provinces
   */
  getProvinces = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provinces = await this.shippingService.getProvinces();

      res.status(200).json({
        success: true,
        data: provinces,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /shipping/cities/:provinceId
   * Get cities by province ID
   */
  getCities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provinceId } = req.params;

      // Validate provinceId
      if (!provinceId || isNaN(parseInt(provinceId))) {
        throw new ApiError("Invalid province ID", 400);
      }

      const cities = await this.shippingService.getCities(parseInt(provinceId));

      res.status(200).json({
        success: true,
        data: cities,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /shipping/cities
   * Get all cities (no filter)
   */
  getAllCities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cities = await this.shippingService.getAllCities();

      res.status(200).json({
        success: true,
        data: cities,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /shipping/cost
   * Calculate shipping cost
   * Body: { destinationPostalCode: string, weight: number, couriers?: string[] }
   */
  calculateCost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { destinationPostalCode, weight, couriers } = req.body;

      // Validation
      if (!destinationPostalCode) {
        throw new ApiError("Destination postal code is required", 400);
      }

      if (!weight) {
        throw new ApiError("Weight is required", 400);
      }

      if (weight <= 0) {
        throw new ApiError("Weight must be greater than 0", 400);
      }

      // Validate postal code format (5 digits)
      const postalCodeStr = destinationPostalCode.toString();
      if (!/^\d{5}$/.test(postalCodeStr)) {
        throw new ApiError("Invalid postal code format. Must be 5 digits.", 400);
      }

      const costs = await this.shippingService.calculateShippingCost({
        destinationPostalCode: postalCodeStr,
        weight: parseInt(weight.toString()),
        couriers,
      });

      res.status(200).json({
        success: true,
        data: costs,
      });
    } catch (error) {
      next(error);
    }
  };
}