import { Router } from "express";
import multer from "multer";
import { ComplaintController } from "./complaint.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { CreateComplaintDTO } from "./dto/create-complaint.dto";
import { UpdateComplaintDTO } from "./dto/update-complaint.dto";

const storage = multer.memoryStorage();

// ✅ IMPROVED: Better file validation
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 6, // Max 6 files (1 video + 5 photos)
  },
  fileFilter: (req, file, cb) => {
    console.log("📁 Validating file:", {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (file.fieldname === "video") {
      // ✅ Accept common video formats
      const allowedVideoTypes = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm",
      ];
      
      if (!allowedVideoTypes.includes(file.mimetype)) {
        console.error("❌ Invalid video type:", file.mimetype);
        return cb(
          new Error(
            `Invalid video format. Allowed: MP4, MOV, AVI, WEBM. Got: ${file.mimetype}`
          )
        );
      }
    } else if (file.fieldname === "photos") {
      // ✅ Accept common image formats
      const allowedImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      
      if (!allowedImageTypes.includes(file.mimetype)) {
        console.error("❌ Invalid image type:", file.mimetype);
        return cb(
          new Error(
            `Invalid image format. Allowed: JPG, PNG, WEBP. Got: ${file.mimetype}`
          )
        );
      }
    } else {
      console.error("❌ Unknown field:", file.fieldname);
      return cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
    
    console.log("✅ File validated:", file.originalname);
    cb(null, true);
  },
});

export class ComplaintRouter {
  private complaintController: ComplaintController;
  private router: Router;
  private jwtMiddleware: JwtMiddleware;
  private roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.complaintController = new ComplaintController();
    this.jwtMiddleware = new JwtMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    console.log("🚀 Initializing Complaint Routes...");

    // 1. Check can complain (SPECIFIC - MUST BE FIRST)
    this.router.get(
      "/can-complain/:orderId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.complaintController.canComplain
    );

    // 2. Cancel complaint (SPECIFIC with suffix)
    this.router.patch(
      "/:complaintId/cancel",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.complaintController.cancel
    );

    // 3. Get all complaints
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.complaintController.getAll
    );

    // 4. Create complaint with file upload
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      (req, res, next) => {
        // ✅ Add custom error handler for multer
        upload.fields([
          { name: "video", maxCount: 1 },
          { name: "photos", maxCount: 5 },
        ])(req, res, (err) => {
          if (err) {
            console.error("❌ Multer error:", err.message);
            return res.status(400).json({
              success: false,
              message: err.message || "File upload error",
            });
          }
          next();
        });
      },
      validateBody(CreateComplaintDTO),
      this.complaintController.create
    );

    // 5. Get complaint by ID
    this.router.get(
      "/:complaintId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.complaintController.getById
    );

    // 6. Update complaint - ADMIN ONLY
    this.router.patch(
      "/:complaintId",
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.roleMiddleware.isAdmin,
      validateBody(UpdateComplaintDTO),
      this.complaintController.update
    );

    console.log("✅ Complaint Routes Initialized Successfully!");
  };

  getRouter = () => {
    return this.router;
  };
}