import "express";

declare module "express" {
  export interface Locals {
    user?: {
      id: number;
      email: string;
      name: string;
      role: "ADMIN" | "USER";
      iat?: number;
      exp?: number;
    };
  }
}