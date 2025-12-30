import { Router } from "express";
import { CartController } from "./cart.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { PreviewShippingDto } from "./dto/preview-shipping.dto";

export class CartRouter {
  private router: Router;
  private cartController: CartController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.cartController = new CartController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // All cart routes require authentication
    this.router.use(this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!));

    /**
     * GET /cart
     * Get user cart with calculations
     */
    this.router.get("/", this.cartController.getCart);

    /**
     * POST /cart/items
     * Add item to cart
     */
    this.router.post(
      "/items",
      validateBody(AddToCartDto),
      this.cartController.addItem
    );

    /**
     * PATCH /cart/items/:cartItemId
     * Update cart item quantity
     */
    this.router.patch(
      "/items/:cartItemId",
      validateBody(UpdateCartItemDto),
      this.cartController.updateItemQuantity
    );

    /**
     * DELETE /cart/items/:cartItemId
     * Remove item from cart
     */
    this.router.delete("/items/:cartItemId", this.cartController.removeItem);

    /**
     * DELETE /cart
     * Clear all cart items
     */
    this.router.delete("/", this.cartController.clearCart);

    /**
     * POST /cart/preview-shipping
     * Preview shipping cost before checkout
     */
    this.router.post(
      "/preview-shipping",
      validateBody(PreviewShippingDto),
      this.cartController.previewShipping
    );
  };

  getRouter = () => this.router;
}