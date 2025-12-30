import { IsArray, IsInt, IsNotEmpty, Min, ArrayMinSize } from "class-validator";

export class PreviewAuctionCheckoutDto {
  @IsNotEmpty({ message: "Auction IDs are required" })
  @IsArray()
  @ArrayMinSize(1, { message: "At least 1 auction must be selected" })
  @IsInt({ each: true })
  auctionIds!: number[];

  @IsNotEmpty({ message: "Address ID is required" })
  @IsInt()
  @Min(1)
  addressId!: number;

  @IsNotEmpty({ message: "Courier is required" })
  courier!: string; // "jne", "tiki", "pos"
}