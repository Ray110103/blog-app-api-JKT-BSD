import { IsNotEmpty, IsString, IsOptional } from "class-validator";

export class CreateSealedCategoryDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Files will be handled via req.file and req.files
}