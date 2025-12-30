import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload payment proof to Cloudinary
 * @param file - Multer file object
 * @returns Cloudinary upload result with secure_url
 */
export const uploadPaymentProof = async (
  file: Express.Multer.File
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "payment-proofs",
        resource_type: "image",
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto:good" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Delete payment proof from Cloudinary
 * @param publicId - Cloudinary public_id
 */
export const deletePaymentProof = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Extract public_id from Cloudinary URL
 * @param url - Cloudinary secure_url
 * @returns public_id
 */
export const getPublicIdFromUrl = (url: string): string => {
  // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/payment-proofs/abc123.jpg
  // Extract: payment-proofs/abc123
  const parts = url.split("/");
  const uploadIndex = parts.indexOf("upload");
  const publicIdWithExtension = parts.slice(uploadIndex + 2).join("/");
  const publicId = publicIdWithExtension.split(".")[0];
  return publicId;
};