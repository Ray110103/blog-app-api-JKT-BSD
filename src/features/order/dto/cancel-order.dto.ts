import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CancelOrderDto {
  @IsString()
  @MinLength(10, { message: "Cancellation reason must be at least 10 characters" })
  @IsNotEmpty({ message: "Cancellation reason is required" })
  reason!: string;
}