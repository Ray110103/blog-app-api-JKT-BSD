// profile.service.ts
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PasswordService } from "../password/password.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

export class ProfileService {
  private prisma: PrismaService;
  private passwordService: PasswordService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.passwordService = new PasswordService();
    this.cloudinaryService = new CloudinaryService();
  }

  getProfile = async (id: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    return user;
  };

  updateProfile = async (
    id: number,
    body: UpdateProfileDto,
    pictureProfile?: Express.Multer.File
  ) => {
    try {
      console.log("=== UPDATE PROFILE SERVICE ===");
      console.log("User ID:", id);
      console.log("Body:", body);
      console.log("Has file:", !!pictureProfile);

      // 1. CEK USER EXISTS DULU - INI PENTING!
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      // 2. THROW ERROR JIKA USER TIDAK ADA
      if (!user) {
        throw new ApiError("User not found", 404);
      }

      console.log("User found:", user.email);

      // 3. SEKARANG AMAN UNTUK AKSES user.pictureProfile
      let updatedPicture = user.pictureProfile; // Sekarang user sudah pasti ada

      // 4. HANDLE FILE UPLOAD
      if (pictureProfile) {
        console.log("Processing image upload...");
        console.log("File:", pictureProfile.originalname);
        console.log("Size:", pictureProfile.size);

        if (!pictureProfile.buffer) {
          throw new ApiError("File buffer is missing", 400);
        }

        try {
          // Remove old picture if exists
          if (user.pictureProfile) {
            console.log("Removing old picture...");
            try {
              await this.cloudinaryService.remove(user.pictureProfile);
              console.log("Old picture removed");
            } catch (removeError) {
              console.error("Failed to remove old picture:", removeError);
              // Don't throw - continue with upload
            }
          }

          // Upload new picture
          console.log("Uploading to Cloudinary...");
          const uploadResult = await this.cloudinaryService.upload(
            pictureProfile,
            "profile-pictures"
          );

          updatedPicture = uploadResult.secure_url;
          console.log("Upload successful:", updatedPicture);
        } catch (uploadError) {
          console.error("Cloudinary error:", uploadError);
          throw new ApiError("Failed to upload image", 500);
        }
      }

      // 5. UPDATE DATABASE
      console.log("Updating database...");
      
      const updateData: any = {};
      
      if (body.name) {
        updateData.name = body.name;
      }
      
      if (updatedPicture !== user.pictureProfile) {
        updateData.pictureProfile = updatedPicture;
      }

      console.log("Update data:", updateData);

      await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      console.log("Profile updated successfully");
      return { message: "Profile Updated" };
      
    } catch (error) {
      console.error("=== PROFILE SERVICE ERROR ===");
      console.error(error);
      throw error;
    }
  };

  changePassword = async (body: ChangePasswordDto, id: number) => {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user?.password) throw new ApiError("User not found", 404);

    const isValid = await this.passwordService.comparePassword(
      body.oldPassword,
      user.password
    );
    if (!isValid) throw new ApiError("Incorrect current password", 400);

    const newHashed = await this.passwordService.hashPassword(body.newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: newHashed },
    });

    return { message: "password successfully changed" };
  };
}