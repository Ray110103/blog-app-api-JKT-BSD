import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class TrackPackageDto {
  @IsString()
  @IsNotEmpty()
  waybill!: string;

  @IsString()
  @IsNotEmpty()
  courier!: string;

  @IsString()
  @IsOptional()
  lastPhoneNumber!: string; // ✅ ADDED: Optional last phone number for tracking
}