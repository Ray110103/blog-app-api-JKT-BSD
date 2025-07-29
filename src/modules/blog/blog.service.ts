import { Prisma } from "../../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import { GetBlogsDTO } from "./dto/get-blogs.dto";

export class BlogService {
  private prisma: PrismaService;
  
  constructor() {
    this.prisma = new PrismaService();
  }

  getBlogs = async (query: GetBlogsDTO) => {
    const { take, page, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.BlogWhereInput = {}

    if(search){
      whereClause.title = {contains: search, mode: "insensitive"}
    }

    const blogs = await this.prisma.blog.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take, //offset
      take: take, // limit
      include: { user: { omit: { password: true } } }, // join ke table user
    });

    const total = await this.prisma.blog.count({where: whereClause});

    return {
      data: blogs,
      meta: { page, take, total },
    };
  };
}
