import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { PaginationQueryParams } from "../pagination/dto/pagination.dto";
import { BlogService } from "./blog.service";
import { ApiError } from "../../utils/api-error";

export class BlogController {
  private blogService: BlogService;

  constructor() {
    this.blogService = new BlogService();
  }

  getBlogs = async (req: Request, res: Response) => {
    const query = plainToInstance(PaginationQueryParams, req.query);
    const result = await this.blogService.getBlogs(query);
    res.status(200).send(result);
  };

  getBlogBySlug = async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const result = await this.blogService.getBlogBySlug(slug);
    res.status(200).send(result);
  };

  createBlog = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const thumbnail = files.thumbnail?.[0];
    if (!thumbnail) throw new ApiError("Thumbnail Is Required", 400);

    const result = await this.blogService.createBlog(
      req.body,
      thumbnail,
      authUserId
    );
    res.status(200).send(result);
  };
}
