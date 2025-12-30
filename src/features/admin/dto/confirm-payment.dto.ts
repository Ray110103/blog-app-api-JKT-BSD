import { IsOptional, IsString } from "class-validator";

export class ConfirmPaymentDTO {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}