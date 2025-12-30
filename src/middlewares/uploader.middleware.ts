// uploader.middleware.ts
import multer from "multer";
import { ApiError } from "../utils/api-error";
import { NextFunction, Request, Response } from "express";

export class UploaderMiddleware {
  upload = () => {
    const storage = multer.memoryStorage();
    const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB
    return multer({ storage, limits });
  };

  fileFilter = (allowedTypes: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        console.log("=== FILE FILTER ===");
        console.log("Has file:", !!req.file);

        if (!req.file) {
          console.log("No file uploaded, skipping validation");
          return next();
        }

        console.log("File mimetype:", req.file.mimetype);

        // Cek mimetype dari Multer (tidak perlu file-type package)
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new ApiError(
            `File type ${req.file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
            400
          );
        }

        console.log("File type valid");
        next();
      } catch (error) {
        console.error("File filter error:", error);
        next(error);
      }
    };
  };
}