import { Router } from "express";
import { BlogController } from "./blog.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateBlogPostDTO } from "./dto/create-blog-post.dto";
import { UpdateBlogPostDTO } from "./dto/update-blog-post.dto";
import { CreateCommentDTO } from "./dto/create-comment.dto";
import { UpdateCommentDTO } from "./dto/update-comment.dto";

export class BlogRouter {
  private router: Router;
  private blogController: BlogController;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.blogController = new BlogController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    const jwtSecret = process.env.JWT_SECRET!;

    // =====================================
    // BLOG POST ROUTES
    // =====================================

    /**
     * GET /blog/posts
     * Get all blog posts (public for published, admin sees all)
     */
    this.router.get("/posts", this.blogController.getAllPosts);

    /**
     * GET /blog/posts/:slug
     * Get single blog post (public for published, admin sees all)
     */
    this.router.get("/posts/:slug", this.blogController.getPostBySlug);

    /**
     * POST /blog/posts
     * Create blog post (Admin only)
     * ⭐ IMPORTANT: Multer MUST come BEFORE validateBody!
     */
    this.router.post(
      "/posts",
      this.uploaderMiddleware.upload().single("coverImage"), // ⭐ MOVED TO FIRST
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.roleMiddleware.isAdmin,
      validateBody(CreateBlogPostDTO),
      this.blogController.createPost
    );

    /**
     * PATCH /blog/posts/:slug
     * Update blog post (Admin only)
     */
    this.router.patch(
      "/posts/:slug",
      this.uploaderMiddleware.upload().single("coverImage"), // ⭐ MOVED TO FIRST
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.roleMiddleware.isAdmin,
      validateBody(UpdateBlogPostDTO),
      this.blogController.updatePost
    );

    /**
     * DELETE /blog/posts/:slug
     * Delete blog post (Admin only)
     */
    this.router.delete(
      "/posts/:slug",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.roleMiddleware.isAdmin,
      this.blogController.deletePost
    );

    // =====================================
    // COMMENT ROUTES
    // =====================================

    /**
     * GET /blog/posts/:postId/comments
     * Get all comments for a post (public)
     */
    this.router.get("/posts/:postId/comments", this.blogController.getComments);

    /**
     * POST /blog/posts/:postId/comments
     * Create comment (Authenticated users)
     */
    this.router.post(
      "/posts/:postId/comments",
      this.jwtMiddleware.verifyToken(jwtSecret),
      validateBody(CreateCommentDTO),
      this.blogController.createComment
    );

    /**
     * PATCH /blog/comments/:commentId
     * Update comment (Owner only)
     */
    this.router.patch(
      "/comments/:commentId",
      this.jwtMiddleware.verifyToken(jwtSecret),
      validateBody(UpdateCommentDTO),
      this.blogController.updateComment
    );

    /**
     * DELETE /blog/comments/:commentId
     * Delete comment (Owner or Admin)
     */
    this.router.delete(
      "/comments/:commentId",
      this.jwtMiddleware.verifyToken(jwtSecret),
      this.blogController.deleteComment
    );
  };

  getRouter = () => this.router;
}