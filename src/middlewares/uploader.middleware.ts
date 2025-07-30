import multer from "multer";

export class UploadMiddleware {
  upload = (fileSize: number = 5) => {
    const storage = multer.memoryStorage();

    const limits = { fileSize: fileSize * 1024 * 1024 };

    return multer({ storage, limits });
  };
}

