import { IsNotEmpty, IsString, IsOptional, IsInt } from "class-validator";
import { Transform } from "class-transformer";

export class CreateCommentDTO {
  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : null))
  @IsInt()
  parentId?: number | null;
}