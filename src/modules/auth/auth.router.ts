import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateBody } from "../../middlewares/validate.middleware";
import { RegisterDTO } from "./dto/register.dto";
import { LoginDTO } from "./dto/login.dto";

export class AuthRouter {
  private authController: AuthController;
  private router: Router;
  
  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/register",
      validateBody(RegisterDTO),
      this.authController.register
    );
    this.router.post(
      "/login",
      validateBody(LoginDTO),
      this.authController.login
    );
  };

  getRouter = () => {
    return this.router;
  };
}
