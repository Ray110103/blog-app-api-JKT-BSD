import { IsNotEmpty, IsInt, IsArray, ValidateNested, IsString, IsOptional } from "class-validator";
import { Transform, Type } from "class-transformer";

class RarityItem {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  shortName?: string;
}

export class CreateBulkCardRaritiesDTO {
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  setId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RarityItem)
  rarities!: RarityItem[];
}