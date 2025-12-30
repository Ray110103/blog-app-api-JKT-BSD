import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ShipOrderDTO {
  @IsNotEmpty()
  @IsString()
  trackingNumber!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}