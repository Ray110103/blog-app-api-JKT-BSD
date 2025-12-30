import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from "class-validator";
import { Transform } from "class-transformer";

export class CreateCardSetDTO {
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10)) // ⭐ ADD THIS
  @IsInt()
  gameId!: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10)) // ⭐ ADD THIS
  @IsInt()
  languageId!: number;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;
}