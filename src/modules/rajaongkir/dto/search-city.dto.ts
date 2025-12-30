import { IsOptional, IsString } from "class-validator";

export class SearchCityDto {
  @IsOptional()
  @IsString()
  provinceId?: string; // Province name (e.g., "DKI Jakarta")

  @IsOptional()
  @IsString()
  query?: string; // Search query
}