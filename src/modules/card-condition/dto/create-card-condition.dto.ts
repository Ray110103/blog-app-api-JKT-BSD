import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateCardConditionDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  shortName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}