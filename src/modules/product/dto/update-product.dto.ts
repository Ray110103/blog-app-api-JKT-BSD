import {
  IsOptional,
  IsInt,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
} from "class-validator";

export class UpdateVariantDTO {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Price must be at least 0" })
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: "Stock must be at least 0" })
  stock?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ⭐ NEW: Update weight (gram)
  // Set to null to remove override and use product's default weight
  @IsOptional()
  @IsInt()
  @Min(1, { message: "Weight must be at least 1 gram" })
  weight?: number | null;
}