import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsString,
  Min,
} from "class-validator";

export class CreateVariantDTO {
  @IsOptional()
  @IsInt()
  rarityId?: number;

  @IsOptional()
  @IsInt()
  conditionId?: number;

  @IsNotEmpty({ message: "Price is required" })
  @IsNumber()
  @Min(0, { message: "Price must be at least 0" })
  price!: number;

  @IsNotEmpty({ message: "Stock is required" })
  @IsInt()
  @Min(0, { message: "Stock must be at least 0" })
  stock!: number;

  @IsOptional()
  @IsString()
  sku?: string;

  // ⭐ NEW: Weight override (gram) - optional, will use product weight if not provided
  @IsOptional()
  @IsInt()
  @Min(1, { message: "Weight must be at least 1 gram" })
  weight?: number;
}