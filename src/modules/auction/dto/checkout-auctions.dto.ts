import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ArrayMinSize } from "class-validator";

export class CheckoutAuctionsDto {
  @IsNotEmpty({ message: "Auction IDs are required" })
  @IsArray()
  @ArrayMinSize(1, { message: "At least 1 auction must be selected" })
  @IsInt({ each: true })
  auctionIds!: number[];

  @IsNotEmpty({ message: "Address ID is required" })
  @IsInt()
  @Min(1)
  addressId!: number;

  @IsNotEmpty({ message: "Shipping cost is required" })
  @IsInt()
  @Min(0)
  shippingCost!: number;

  // Courier information (required)
  @IsNotEmpty({ message: "Courier is required" })
  @IsString()
  courier!: string; // "JNE", "TIKI", "POS"

  @IsNotEmpty({ message: "Courier code is required" })
  @IsString()
  courierCode!: string; // "jne", "tiki", "pos"

  @IsNotEmpty({ message: "Courier service is required" })
  @IsString()
  courierService!: string; // "REG", "YES", "OKE"

  @IsNotEmpty({ message: "Courier service name is required" })
  @IsString()
  courierServiceName!: string; // "Reguler", "Yakin Esok Sampai"

  @IsOptional()
  @IsString()
  estimatedDelivery?: string; // "2-3 hari"

  @IsOptional()
  @IsString()
  notes?: string;
}