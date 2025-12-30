import { IsInt, IsNotEmpty, Min } from "class-validator";

export class PlaceBidDto {
  @IsNotEmpty({ message: "Bid amount is required" })
  @IsInt()
  @Min(1000, { message: "Bid amount must be at least Rp 1,000" })
  bidAmount!: number;
}