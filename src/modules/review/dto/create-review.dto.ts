import { IsInt, IsString, Min, Max, MinLength } from "class-validator";

export class CreateReviewDTO {
  @IsInt()
  productId!: number;

  @IsInt()
  @Min(1, { message: "Rating must be at least 1" })
  @Max(5, { message: "Rating must be at most 5" })
  rating!: number;

  @IsString()
  @MinLength(10, { message: "Comment must be at least 10 characters" })
  comment!: string;
}