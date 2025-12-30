import { IsBoolean, IsOptional, IsString } from "class-validator";

export class RelistAuctionDto {
  @IsOptional()
  @IsBoolean()
  notifyPreviousBidders?: boolean;

  @IsOptional()
  @IsString()
  adminNote?: string;
}