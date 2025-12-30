import { IsInt, IsNotEmpty, Min } from "class-validator";

export class AddToCartDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  productId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  variantId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: "Quantity must be at least 1" })
  quantity!: number;
}