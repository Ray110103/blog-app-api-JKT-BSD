import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "../../../generated/prisma";

export class UpdateStatusDTO {
  @IsNotEmpty()
  @IsEnum(OrderStatus, {
    message: "Invalid order status. Must be one of: PENDING, WAITING_FOR_CONFIRMATION, PAYMENT_REJECTED, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, COMPLETED, CANCELLED",
  })
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}