import { IsInt } from "class-validator";

export class AddToWishlistDTO {
  @IsInt()
  productId!: number;
}