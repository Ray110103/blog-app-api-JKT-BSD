import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class RejectPaymentDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: "Rejection reason must be at least 10 characters" })
  reason!: string;
}