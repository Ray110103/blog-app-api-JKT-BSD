import { IsInt, IsNotEmpty, Min } from "class-validator";

export class CreateAuctionDto {
  @IsNotEmpty({ message: "Product ID is required" })
  @IsInt()
  productId!: number;

  @IsNotEmpty({ message: "Variant ID is required" })  // ✅ NEW
  @IsInt()
  variantId!: number;

  @IsNotEmpty({ message: "Quantity is required" })    // ✅ NEW
  @IsInt()
  @Min(1, { message: "Quantity must be at least 1" })
  quantity!: number;

  @IsNotEmpty({ message: "Start price is required" })
  @IsInt()
  @Min(1000, { message: "Start price must be at least Rp 1,000" })
  startPrice!: number;

  @IsNotEmpty({ message: "Buy out price is required" })
  @IsInt()
  @Min(1000, { message: "Buy out price must be at least Rp 1,000" })
  buyOutPrice!: number;
}