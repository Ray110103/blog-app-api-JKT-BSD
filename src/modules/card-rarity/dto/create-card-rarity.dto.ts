import { IsNotEmpty, IsString, IsInt, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

export class CreateCardRarityDTO {
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  setId!: number;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  shortName?: string;
}