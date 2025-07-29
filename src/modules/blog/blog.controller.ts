import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { PaginationQueryParams } from "../pagination/dto/pagination.dto";
import { BlogService } from "./blog.service";

export class BlogController {
  private blogService: BlogService;
  
  constructor() {
    this.blogService = new BlogService();
  }

  getBlogs = async (req: Request, res: Response) => {
    const query = plainToInstance(PaginationQueryParams, req.query)
    const result = await this.blogService.getBlogs(query);
    res.status(200).send(result);
  };
}
