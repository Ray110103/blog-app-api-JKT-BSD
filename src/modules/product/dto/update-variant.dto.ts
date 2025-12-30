import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator";

export class UpdateProductDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ⭐ NEW: Update weight
  @IsOptional()
  @IsInt()
  @Min(1, { message: "Weight must be at least 1 gram" })
  weight?: number;

  // === SINGLE CARD Fields ===
  @IsOptional()
  @IsInt()
  gameId?: number;

  @IsOptional()
  @IsInt()
  setId?: number;

  @IsOptional()
  @IsInt()
  languageId?: number;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardType?: string;

  @IsOptional()
  @IsString()
  attribute?: string;

  @IsOptional()
  @IsInt()
  hp?: number;

  // === SEALED PRODUCT Fields ===
  @IsOptional()
  @IsInt()
  sealedCategoryId?: number;

  @IsOptional()
  @IsInt()
  cardsPerPack?: number;

  @IsOptional()
  @IsInt()
  packsPerBox?: number;

  // === ACCESSORY Fields ===
  @IsOptional()
  @IsInt()
  accessoryCategoryId?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}