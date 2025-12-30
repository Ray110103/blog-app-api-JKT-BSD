import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

export class RoleMiddleware {
  isAdmin = (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("🔍 Role Middleware - res.locals.user:", res.locals.user);

      const user = res.locals.user;

      if (!user) {
        throw new ApiError("Unauthorized", 401);
      }

      if (user.role !== "ADMIN") {
        throw new ApiError("Access denied. Admin only.", 403);
      }

      console.log("✅ Role Middleware - Admin verified!");

      next();
    } catch (error) {
      next(error);
    }
  };
}