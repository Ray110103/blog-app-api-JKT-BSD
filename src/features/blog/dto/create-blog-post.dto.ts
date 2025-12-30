import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, IsDateString } from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateBlogPostDTO {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((tag) => tag.trim());
    }
    return value;
  })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  published?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}