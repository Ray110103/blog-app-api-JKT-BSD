import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CalculateCostDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  originCityId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  destinationCityId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: "Weight must be at least 1 gram" })
  weight!: number;

  @IsNotEmpty()
  @IsString()
  courier!: string; // "jne", "tiki", "pos", or "jne:tiki:pos"
}