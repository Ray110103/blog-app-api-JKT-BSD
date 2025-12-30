import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";

export class CloudinaryService {
  constructor() {
    console.log("=== CLOUDINARY CONFIG ===");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("API Key exists:", !!process.env.CLOUDINARY_API_KEY);
    console.log("API Secret exists:", !!process.env.CLOUDINARY_API_SECRET);

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error("Cloudinary credentials are missing in .env");
    }

    cloudinary.config({
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    });
  }

  private bufferToStream = (buffer: Buffer) => {
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    return readable;
  };

  // ✅ UPDATED: Add resourceType parameter
  upload = (
    file: Express.Multer.File,
    folder?: string,
    resourceType?: "image" | "video" | "raw" | "auto" // ✅ NEW parameter
  ): Promise<UploadApiResponse> => {
    return new Promise((resolve, reject) => {
      console.log("☁️ Cloudinary upload started:", {
        folder,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        resourceType: resourceType || "auto",
      });

      if (!file.buffer) {
        console.error("❌ File buffer is missing");
        return reject(new Error("File buffer is required"));
      }

      console.log("📦 Buffer size:", `${(file.buffer.length / 1024).toFixed(2)}KB`);

      const readableStream = this.bufferToStream(file.buffer);

      // ✅ CRITICAL FIX: Use "auto" or specific resource type
      const uploadOptions = {
        folder: folder || "uploads",
        resource_type: resourceType || "auto", // ✅ Changed from hardcoded "image"
      };

      console.log("📤 Upload options:", uploadOptions);

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (err, result) => {
          if (err) {
            console.error("❌ Cloudinary upload error:", {
              message: err.message,
              error: err,
            });
            return reject(err);
          }

          if (!result) {
            console.error("❌ Upload failed: No result returned");
            return reject(new Error("Upload failed: No result returned"));
          }

          console.log("✅ Cloudinary upload successful:", {
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format,
            resource_type: result.resource_type,
          });

          resolve(result);
        }
      );

      readableStream.pipe(uploadStream);
    });
  };

  private extractPublicIdFromUrl = (url: string) => {
    try {
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const publicId = fileName.split(".")[0];

      // Include folder if exists
      const uploadIndex = urlParts.indexOf("upload");
      if (uploadIndex !== -1 && uploadIndex < urlParts.length - 2) {
        const folders = urlParts.slice(uploadIndex + 2, -1);
        return [...folders, publicId].join("/");
      }

      return publicId;
    } catch (error) {
      console.error("Error extracting public ID:", error);
      throw error;
    }
  };

  remove = async (secureUrl: string) => {
    try {
      console.log("🗑️ Removing from Cloudinary:", secureUrl);
      const publicId = this.extractPublicIdFromUrl(secureUrl);
      console.log("Public ID:", publicId);

      // ✅ Detect resource type from URL
      const resourceType = secureUrl.includes("/video/") ? "video" : "image";
      console.log("Resource type:", resourceType);

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      console.log("Remove result:", result);

      return result;
    } catch (error) {
      console.error("❌ Cloudinary remove error:", error);
      // Don't throw, just log - removing old image shouldn't block upload
      return null;
    }
  };
}