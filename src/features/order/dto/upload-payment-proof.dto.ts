import { IsNotEmpty, IsString } from "class-validator";

export class UploadPaymentProofDto {
  @IsString()
  @IsNotEmpty({ message: "Bank name is required" })
  bankName!: string; // "BCA", "Mandiri", "BNI", etc

  @IsString()
  @IsNotEmpty({ message: "Account number is required" })
  accountNumber!: string; // Customer's account number

  @IsString()
  @IsNotEmpty({ message: "Account name is required" })
  accountName!: string; // Customer's account name

  // Note: file is handled by Multer middleware, not class-validator
}