import { IsOptional, IsString, IsInt, IsBoolean, IsDateString } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateCardSetDTO {
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined)) // ⭐ ADD THIS
  @IsInt()
  gameId?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined)) // ⭐ ADD THIS
  @IsInt()
  languageId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}