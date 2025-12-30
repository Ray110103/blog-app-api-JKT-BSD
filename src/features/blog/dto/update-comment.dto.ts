import { IsNotEmpty, IsString } from "class-validator";

export class UpdateCommentDTO {
  @IsNotEmpty()
  @IsString()
  content!: string;
}