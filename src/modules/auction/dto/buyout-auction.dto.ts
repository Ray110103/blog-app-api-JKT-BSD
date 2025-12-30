import { IsInt, IsNotEmpty } from "class-validator";

export class BuyoutAuctionDto {
  @IsNotEmpty({ message: "Address ID is required" })
  @IsInt()
  addressId!: number;
}