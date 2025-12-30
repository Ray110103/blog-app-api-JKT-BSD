import { Request, Response, NextFunction } from "express";
import { AddressService } from "./address.service";
import { ApiError } from "../../utils/api-error";

export class AddressController {
  private addressService: AddressService;

  constructor() {
    this.addressService = new AddressService();
  }

  /**
   * GET /addresses
   * Get all addresses for user
   */
  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const addresses = await this.addressService.getAll(userId);

      res.status(200).json({
        success: true,
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /addresses/default
   * Get default address
   */
  getDefault = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const address = await this.addressService.getDefault(userId);

      res.status(200).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /addresses/:id
   * Get address by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const addressId = parseInt(req.params.id);

      if (isNaN(addressId)) {
        throw new ApiError("Invalid address ID", 400);
      }

      const address = await this.addressService.getById(userId, addressId);

      res.status(200).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /addresses
   * Create new address
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const address = await this.addressService.create(userId, req.body);

      res.status(201).json({
        success: true,
        message: "Address created successfully",
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /addresses/:id
   * Update address
   */
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const addressId = parseInt(req.params.id);

      if (isNaN(addressId)) {
        throw new ApiError("Invalid address ID", 400);
      }

      const address = await this.addressService.update(userId, addressId, req.body);

      res.status(200).json({
        success: true,
        message: "Address updated successfully",
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /addresses/:id
   * Delete address
   */
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const addressId = parseInt(req.params.id);

      if (isNaN(addressId)) {
        throw new ApiError("Invalid address ID", 400);
      }

      const result = await this.addressService.delete(userId, addressId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /addresses/:id/set-default
   * Set address as default
   */
  setDefault = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(res);
      const addressId = parseInt(req.params.id);

      if (isNaN(addressId)) {
        throw new ApiError("Invalid address ID", 400);
      }

      const address = await this.addressService.setDefault(userId, addressId);

      res.status(200).json({
        success: true,
        message: "Default address updated successfully",
        data: address,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper: Get user ID from JWT token
   */
  private getUserId = (res: Response): number => {
    const user = res.locals.user;
    const userId = user?.userId || user?.id || user?.sub;

    if (!userId) {
      throw new ApiError("User ID not found in token", 401);
    }

    return Number(userId);
  };
}