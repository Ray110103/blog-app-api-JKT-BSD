import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterTenantDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;
}