import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { OAuthUserData } from "./types/oauth.type";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).send(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.forgotPassword(req.body);
      res.status(200).send(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const authUserId = res.locals.user.id;
      const result = await this.authService.resetPassword(req.body, authUserId);
      res.status(200).send(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  getCurrentUser = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user.id;
      const user = await this.authService.getCurrentUser(userId);
      res.status(200).json(user);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  verifyEmailAndSetPassword = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      const result = await this.authService.verifyEmailAndSetPassword(
        token,
        password
      );
      res.status(200).send(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  resendVerification = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.resendVerification(req.body);
      res.status(200).send(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  googleCallback = async (req: Request, res: Response) => {
    try {
      const { user } = req as any;

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=oauth_failed`
        );
      }

      const oauthData: OAuthUserData = {
        email: user.email,
        name: user.name,
        provider: "GOOGLE",
        providerId: user.id,
        avatar: user.picture,
      };

      const result = await this.authService.loginWithOAuth(oauthData);

      res.redirect(
        `${process.env.FRONTEND_URL}/callback?token=${result.accessToken}`
      );
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
    }
  };

  githubCallback = async (req: Request, res: Response) => {
    try {
      const { user } = req as any;

      if (!user) {
        console.log("No user found in GitHub callback");
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=oauth_failed`
        );
      }

      const oauthData: OAuthUserData = {
        email: user.emails?.[0]?.value || user.email,
        name: user.displayName || user.username || user.login,
        provider: "GITHUB",
        providerId: user.id.toString(),
        avatar: user.photos?.[0]?.value || user.avatar_url,
      };

      console.log("GitHub OAuth data:", oauthData);

      const result = await this.authService.loginWithOAuth(oauthData);

      console.log("GitHub login result:", result);

      res.redirect(
        `${process.env.FRONTEND_URL}/callback?token=${result.accessToken}`
      );
    } catch (error: any) {
      console.error("GitHub OAuth error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
    }
  };

  updateEmail = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user.id;
      const result = await this.authService.updateEmail(userId, req.body);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  resendEmailVerification = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user.id;
      const result = await this.authService.resendEmailVerification(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };
}