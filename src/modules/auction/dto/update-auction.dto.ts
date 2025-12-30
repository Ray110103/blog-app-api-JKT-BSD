import { IsNumber, IsOptional, Min } from "class-validator";

export class UpdateAuctionDto {
  @IsOptional()
  @IsNumber()
  @Min(1000)
  startPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  buyOutPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}