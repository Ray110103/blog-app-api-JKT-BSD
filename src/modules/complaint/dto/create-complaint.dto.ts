import { IsInt, IsString, IsEnum, MinLength, IsNotEmpty } from "class-validator";

export enum ComplaintType {
  ITEM_DAMAGED = "ITEM_DAMAGED",
  WRONG_ITEM = "WRONG_ITEM",
  INCOMPLETE_ORDER = "INCOMPLETE_ORDER",
  FAKE_PRODUCT = "FAKE_PRODUCT",
  OTHER = "OTHER",
}

export class CreateComplaintDTO {
  @IsInt()
  @IsNotEmpty()
  orderId!: number;

  @IsEnum(ComplaintType)
  @IsNotEmpty()
  type!: ComplaintType;

  @IsString()
  @MinLength(20, { message: "Description must be at least 20 characters" })
  @IsNotEmpty()
  description!: string;
}