import { Request, Response, NextFunction } from "express";
import { CartService } from "./cart.service";

export class CartController {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  /**
   * GET /cart
   * Get user cart with calculations
   */
  getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const cart = await this.cartService.getCart(userId);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cart/items
   * Add item to cart
   */
  addItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const { productId, variantId, quantity } = req.body;

      const cart = await this.cartService.addItem(
        userId,
        productId,
        variantId,
        quantity
      );

      res.status(201).json({
        success: true,
        message: "Item added to cart",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /cart/items/:cartItemId
   * Update cart item quantity
   */
  updateItemQuantity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = res.locals.user.id;
      const cartItemId = parseInt(req.params.cartItemId);
      const { quantity } = req.body;

      const cart = await this.cartService.updateItemQuantity(
        userId,
        cartItemId,
        quantity
      );

      res.status(200).json({
        success: true,
        message: "Cart item updated",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /cart/items/:cartItemId
   * Remove item from cart
   */
  removeItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const cartItemId = parseInt(req.params.cartItemId);

      const cart = await this.cartService.removeItem(userId, cartItemId);

      res.status(200).json({
        success: true,
        message: "Item removed from cart",
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /cart
   * Clear cart
   */
  clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const result = await this.cartService.clearCart(userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /cart/preview-shipping
   * Preview shipping cost
   */
  previewShipping = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id;
      const { addressId, courier } = req.body;

      const preview = await this.cartService.previewShipping(
        userId,
        addressId,
        courier
      );

      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  };
}