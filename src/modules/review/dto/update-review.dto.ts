import { IsInt, IsString, Min, Max, MinLength, IsOptional } from "class-validator";

export class UpdateReviewDTO {
  @IsOptional()
  @IsInt()
  @Min(1, { message: "Rating must be at least 1" })
  @Max(5, { message: "Rating must be at most 5" })
  rating?: number;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: "Comment must be at least 10 characters" })
  comment?: string;
}