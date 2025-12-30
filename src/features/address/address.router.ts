import { Router } from "express";
import { AddressController } from "./address.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import { validateBody } from "../../middlewares/validate.middleware";

export class AddressRouter {
  private router: Router;
  private addressController: AddressController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.addressController = new AddressController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    const jwtSecret = process.env.JWT_SECRET!;

    /**
     * GET /addresses/default
     * Get default address (must be before /:id to avoid conflict)
     */
    this.router.get(
      "/default",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.addressController.getDefault
    );

    /**
     * GET /addresses
     * Get all addresses
     */
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.addressController.getAll
    );

    /**
     * GET /addresses/:id
     * Get single address
     */
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.addressController.getById
    );

    /**
     * POST /addresses
     * Create address
     */
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(jwtSecret),
      validateBody(CreateAddressDto),
      this.addressController.create
    );

    /**
     * PATCH /addresses/:id
     * Update address
     */
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(jwtSecret),
      validateBody(UpdateAddressDto),
      this.addressController.update
    );

    /**
     * DELETE /addresses/:id
     * Delete address
     */
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.addressController.delete
    );

    /**
     * PATCH /addresses/:id/set-default
     * Set as default address
     */
    this.router.patch(
      "/:id/set-default",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.addressController.setDefault
    );
  };

  getRouter = () => this.router;
}