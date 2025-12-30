import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateOrderDto {
  @IsNotEmpty()
  @IsInt()
  addressId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  shippingCost!: number;

  // ⭐ NEW: Courier information (all required)
  @IsNotEmpty()
  @IsString()
  courier!: string; // e.g., "JNE", "TIKI", "POS"

  @IsNotEmpty()
  @IsString()
  courierCode!: string; // e.g., "jne", "tiki", "pos"

  @IsNotEmpty()
  @IsString()
  courierService!: string; // e.g., "REG", "YES", "OKE"

  @IsNotEmpty()
  @IsString()
  courierServiceName!: string; // e.g., "Reguler", "Yakin Esok Sampai"

  @IsOptional()
  @IsString()
  estimatedDelivery?: string; // e.g., "2-3 hari"

  @IsOptional()
  @IsString()
  notes?: string;
}