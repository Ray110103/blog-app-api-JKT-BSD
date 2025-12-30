import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateAccessoryCategoryDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}