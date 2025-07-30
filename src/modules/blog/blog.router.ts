import { Router } from "express";
import { BlogController } from "./blog.controller";

export class BlogRouter {
  private router: Router;
  private blogController: BlogController;

  constructor() {
    this.router = Router();
    this.blogController = new BlogController();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.get("/", this.blogController.getBlogs);
    this.router.get("/:slug", this.blogController.getBlogBySlug);
  };

  getRouter = () => {
    return this.router;
  };
}
