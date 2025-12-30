import { NextFunction, Request, Response } from "express";
import { ProfileService } from "./profile.service";
import { ApiError } from "../../utils/api-error";

export class ProfileController {
  private profileService: ProfileService;
  constructor() {
    this.profileService = new ProfileService();
  }

  getProfile = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const result = await this.profileService.getProfile(authUserId);
    res.status(200).send(result);
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("=== CONTROLLER ===");
    console.log("User ID from token:", res.locals.user?.id);
    console.log("Body:", req.body);
    console.log("File:", req.file?.originalname);

    if (!res.locals.user?.id) {
      throw new ApiError("Unauthorized - User ID not found", 401);
    }

    const pictureProfile = req.file;
    const authUserId = res.locals.user.id;
    const body = req.body;

    const result = await this.profileService.updateProfile(
      authUserId,
      body,
      pictureProfile
    );

    res.status(200).send(result);
  } catch (error) {
    console.error("=== CONTROLLER ERROR ===");
    console.error(error);
    next(error);
  }
};

  changePassword = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const result = await this.profileService.changePassword(
      req.body,
      authUserId
    );
    res.status(200).send(result);
  };
}
