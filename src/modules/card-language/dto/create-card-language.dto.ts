import { IsNotEmpty, IsString, Length, Matches } from "class-validator";

export class CreateCardLanguageDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 3)
  @Matches(/^[A-Z]+$/, {
    message: "Code must be uppercase letters only (e.g., EN, JP, KR)",
  })
  code!: string;
}