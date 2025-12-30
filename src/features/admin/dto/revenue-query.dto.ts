import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export enum RevenueGroupBy {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
}

export class RevenueQueryDTO {
  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO format: 2025-01-01

  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO format: 2025-01-31

  @IsOptional()
  @IsEnum(RevenueGroupBy)
  groupBy?: RevenueGroupBy; // day, week, month

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  compareWithPrevious?: boolean; // true/false

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  topProductsLimit?: number; // Default: 10
}