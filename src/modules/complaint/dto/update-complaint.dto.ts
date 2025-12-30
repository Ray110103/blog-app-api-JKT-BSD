import { IsString, IsEnum, IsOptional, IsNumber, Min } from "class-validator";

export enum ComplaintStatus {
  PENDING = "PENDING",
  UNDER_INVESTIGATION = "UNDER_INVESTIGATION",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  RESOLVED = "RESOLVED",
  CANCELLED = "CANCELLED",
}

export enum ResolutionType {
  REFUND = "REFUND",
  REPLACE = "REPLACE",
  PARTIAL_REFUND = "PARTIAL_REFUND",
}

export class UpdateComplaintDTO {
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsEnum(ResolutionType)
  resolution?: ResolutionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}