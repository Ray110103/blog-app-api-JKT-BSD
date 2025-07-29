import express, { Express } from "express";
import cors from "cors";
import "reflect-metadata";
import { PORT } from "./config/env";
import { SampleRouter } from "./modules/sample/sample.router";
import { errorMiddleware } from "./middlewares/error.middleware";
import { AuthRouter } from "./modules/auth/auth.router";
import { BlogRouter } from "./modules/blog/blog.router";

export class App {
  app: Express;
  
  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private routes() {
    const sampleRouter = new SampleRouter();
    const authRouter = new AuthRouter();
    const blogRouter = new BlogRouter();

    this.app.use("/samples", sampleRouter.getRouter());
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/blogs", blogRouter.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  }
}
