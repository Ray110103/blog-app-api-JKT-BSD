import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  Min,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { CreateVariantDTO } from "./create-variant.dto";

export enum ProductType {
  SINGLE_CARD = "SINGLE_CARD",
  SEALED_PRODUCT = "SEALED_PRODUCT",
  ACCESSORY = "ACCESSORY",
}

export class CreateProductDTO {
  @IsNotEmpty({ message: "Product type is required" })
  @IsEnum(ProductType, { message: "Invalid product type" })
  productType!: ProductType;

  @IsNotEmpty({ message: "Product name is required" })
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // ⭐ NEW: Default weight for product (gram)
  @IsNotEmpty({ message: "Weight is required" })
  @IsInt()
  @Min(1, { message: "Weight must be at least 1 gram" })
  weight!: number;

  // === SHARED Fields (SINGLE_CARD & SEALED_PRODUCT) ===
  
  // gameId: Required for SINGLE_CARD OR SEALED_PRODUCT
  @ValidateIf((o) => 
    o.productType === ProductType.SINGLE_CARD || 
    o.productType === ProductType.SEALED_PRODUCT
  )
  @IsNotEmpty({ message: "Game is required for Single Card and Sealed Product" })
  @IsInt()
  gameId?: number;

  // === SINGLE CARD Only Fields ===
  
  @ValidateIf((o) => o.productType === ProductType.SINGLE_CARD)
  @IsNotEmpty({ message: "Set is required for Single Card" })
  @IsInt()
  setId?: number;

  @ValidateIf((o) => o.productType === ProductType.SINGLE_CARD)
  @IsNotEmpty({ message: "Language is required for Single Card" })
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

  // === SEALED PRODUCT Only Fields ===
  
  @ValidateIf((o) => o.productType === ProductType.SEALED_PRODUCT)
  @IsNotEmpty({ message: "Sealed Category is required for Sealed Product" })
  @IsInt()
  sealedCategoryId?: number;

  @IsOptional()
  @IsInt()
  cardsPerPack?: number;

  @IsOptional()
  @IsInt()
  packsPerBox?: number;

  // === ACCESSORY Only Fields ===
  
  @ValidateIf((o) => o.productType === ProductType.ACCESSORY)
  @IsNotEmpty({ message: "Accessory Category is required for Accessory" })
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

  // === VARIANTS (JSON string from form-data) ===
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDTO)
  variants?: CreateVariantDTO[];
}