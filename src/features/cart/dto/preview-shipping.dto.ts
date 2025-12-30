import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class PreviewShippingDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  addressId!: number;

  @IsNotEmpty()
  @IsString()
  courier!: string; // "jne" or "jne:tiki:pos"
}