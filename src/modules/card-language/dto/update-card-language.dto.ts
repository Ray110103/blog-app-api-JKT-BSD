import { IsOptional, IsString, Length, Matches, IsBoolean } from "class-validator";

export class UpdateCardLanguageDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Z]+$/, {
    message: "Code must be uppercase letters only",
  })
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}