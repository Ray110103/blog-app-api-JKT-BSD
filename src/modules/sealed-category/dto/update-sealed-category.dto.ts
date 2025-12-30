import { IsOptional, IsString, IsBoolean } from "class-validator";

export class UpdateSealedCategoryDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Files will be handled via req.file and req.files
}