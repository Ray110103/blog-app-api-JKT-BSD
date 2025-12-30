import { NextFunction, Request, Response } from "express";
import { TokenExpiredError, verify } from "jsonwebtoken";
import { ApiError } from "../utils/api-error";

export class JwtMiddleware {
  verifyToken = (secretKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw new ApiError("No token provided", 401);
        }

        const token = authHeader.split(" ")[1];

        try {
          const payload = verify(token, secretKey) as any;

          // ✅ KONSISTEN: Gunakan "id" bukan "userId"
          const user = {
            id: payload.id,           // ✅ Ubah dari "userId" ke "id"
            email: payload.email,
            role: payload.role,
          };

          // Validate
          if (!user.id) {
            console.error("❌ No user ID found in token!");
            console.error("Payload:", payload);
            throw new ApiError("User ID not found in token", 401);
          }

          if (!user.role) {
            console.error("❌ No role found in token!");
            console.error("Payload:", payload);
            throw new ApiError("User role not found in token", 401);
          }

          res.locals.user = user;
          next();
        } catch (err) {
          if (err instanceof TokenExpiredError) {
            throw new ApiError("Token expired. Please login again", 401);
          }
          if (err instanceof ApiError) {
            throw err;
          }
          throw new ApiError("Invalid token", 401);
        }
      } catch (error) {
        next(error);
      }
    };
  };
}