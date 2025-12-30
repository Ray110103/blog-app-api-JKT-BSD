import { IsOptional, IsString, IsInt, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateCardRarityDTO {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  setId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}