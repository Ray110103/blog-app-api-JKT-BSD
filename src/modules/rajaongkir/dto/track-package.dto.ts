import { IsNotEmpty, IsString } from "class-validator";

export class TrackPackageDto {
  @IsNotEmpty()
  @IsString()
  waybill!: string; // Nomor resi

  @IsNotEmpty()
  @IsString()
  courier!: string; // "jne", "tiki", "pos"
}