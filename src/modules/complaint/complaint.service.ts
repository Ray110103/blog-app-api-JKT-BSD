import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ApiError } from "../../utils/api-error";
import { CreateComplaintDTO } from "./dto/create-complaint.dto";
import { UpdateComplaintDTO } from "./dto/update-complaint.dto";

export class ComplaintService {
  private prisma: PrismaService;
  private cloudinary: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinary = new CloudinaryService();
  }

  // ===========================
  // GET ALL COMPLAINTS (Admin + User's Own)
  // ===========================
  getAll = async (userId: number, isAdmin: boolean) => {
    const where: any = isAdmin ? {} : { userId };

    return await this.prisma.complaint.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            pictureProfile: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            deliveredAt: true,
            completedAt: true, // ⭐ Added for reference
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        photos: true,
      },
      orderBy: { createdAt: "desc" },
    });
  };

  getAllPaginated = async (
    userId: number,
    isAdmin: boolean,
    pagination?: { page?: number; limit?: number; skip?: number }
  ) => {
    const where: any = isAdmin ? {} : { userId };
    const limit = pagination?.limit ?? 20;
    const skip = pagination?.page !== undefined ? (pagination.page - 1) * limit : 0;
    const effectiveSkip =
      pagination?.page !== undefined ? skip : (pagination?.skip ?? 0);
    const page =
      pagination?.page !== undefined
        ? pagination.page
        : Math.floor(effectiveSkip / limit) + 1;

    const [complaints, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              pictureProfile: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              deliveredAt: true,
              completedAt: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          photos: true,
        },
        orderBy: { createdAt: "desc" },
        skip: effectiveSkip,
        take: limit,
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  };

  // ===========================
  // GET COMPLAINT BY ID
  // ===========================
  getById = async (complaintId: number, userId: number, isAdmin: boolean) => {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            pictureProfile: true,
          },
        },
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    thumbnail: true,
                  },
                },
                variant: {
                  select: {
                    id: true,
                    price: true,
                    rarity: true,
                    condition: true,
                  },
                },
              },
            },
            address: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        photos: true,
      },
    });

    if (!complaint) {
      throw new ApiError("Complaint not found", 404);
    }

    // Check access permission
    if (!isAdmin && complaint.userId !== userId) {
      throw new ApiError("You don't have permission to view this complaint", 403);
    }

    return complaint;
  };

  // ===========================
  // CREATE COMPLAINT
  // ===========================
  create = async (
  userId: number,
  body: CreateComplaintDTO,
  videoFile: Express.Multer.File,
  photoFiles: Express.Multer.File[]
) => {
  // ... existing validation code ...

  console.log("📤 Uploading files to Cloudinary...");

  // 5. Upload video to Cloudinary
  if (!videoFile) {
    throw new ApiError("Video unboxing is required", 400);
  }

  console.log("📹 Uploading video:", {
    name: videoFile.originalname,
    type: videoFile.mimetype,
    size: `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
  });

  // ✅ CRITICAL: Pass "video" as resource type
  const videoUpload = await this.cloudinary.upload(
    videoFile,
    "complaints/videos",
    "video" // ✅ Specify video resource type
  );

  console.log("✅ Video uploaded:", videoUpload.secure_url);

  // 6. Upload photos (if any)
  console.log("📷 Uploading photos:", photoFiles.length);

  const photoUploads = await Promise.all(
    photoFiles.map(async (file, index) => {
      console.log(`  Uploading photo ${index + 1}:`, {
        name: file.originalname,
        type: file.mimetype,
        size: `${(file.size / 1024).toFixed(2)}KB`,
      });

      // ✅ CRITICAL: Pass "image" as resource type
      const upload = await this.cloudinary.upload(
        file,
        "complaints/photos",
        "image" // ✅ Specify image resource type
      );

      console.log(`  ✅ Photo ${index + 1} uploaded:`, upload.secure_url);
      return upload;
    })
  );

  console.log("✅ All files uploaded successfully");

  // 7. Create complaint
  console.log("💾 Creating complaint record in database...");

  const complaint = await this.prisma.complaint.create({
    data: {
      userId,
      orderId: body.orderId,
      type: body.type,
      description: body.description,
      videoUrl: videoUpload.secure_url,
      photos: {
        create: photoUploads.map((upload) => ({
          url: upload.secure_url,
        })),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
      photos: true,
    },
  });

  console.log("✅ Complaint created successfully:", complaint.id);

  return complaint;
};

  // ===========================
  // UPDATE COMPLAINT (Admin Only)
  // ===========================
  update = async (complaintId: number, adminId: number, body: UpdateComplaintDTO) => {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new ApiError("Complaint not found", 404);
    }

    // Build update data
    const updateData: any = {
      adminId,
      updatedAt: new Date(),
    };

    if (body.status) {
      updateData.status = body.status;

      // Set reviewedAt when status changes from PENDING
      if (complaint.status === "PENDING" && body.status !== "PENDING") {
        updateData.reviewedAt = new Date();
      }

      // Set resolvedAt when status is RESOLVED
      if (body.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }

    if (body.adminNotes) {
      updateData.adminNotes = body.adminNotes;
    }

    if (body.resolution) {
      updateData.resolution = body.resolution;
    }

    if (body.refundAmount !== undefined) {
      updateData.refundAmount = body.refundAmount;
    }

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
        photos: true,
      },
    });

    return updated;
  };

  // ===========================
  // CANCEL COMPLAINT (User)
  // ===========================
  cancel = async (complaintId: number, userId: number) => {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new ApiError("Complaint not found", 404);
    }

    // Check ownership
    if (complaint.userId !== userId) {
      throw new ApiError("You can only cancel your own complaints", 403);
    }

    // Can only cancel if PENDING or UNDER_INVESTIGATION
    if (!["PENDING", "UNDER_INVESTIGATION"].includes(complaint.status)) {
      throw new ApiError(
        "You can only cancel complaints that are pending or under investigation",
        400
      );
    }

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        photos: true,
      },
    });

    return updated;
  };

  // ===========================
  // CHECK IF USER CAN COMPLAIN
  // ===========================
  canComplain = async (orderId: number, userId: number) => {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        canComplain: false,
        reason: "order_not_found",
        message: "Order not found",
      };
    }

    if (order.userId !== userId) {
      return {
        canComplain: false,
        reason: "not_your_order",
        message: "This order does not belong to you",
      };
    }

    // ⭐ UPDATED: Check if order is SHIPPED or COMPLETED
    if (order.status !== "SHIPPED" && order.status !== "COMPLETED") {
      return {
        canComplain: false,
        reason: "not_shipped_or_completed",
        message: "You can only file a complaint after the order is shipped or completed",
        orderStatus: order.status,
      };
    }

    // Check existing complaint
    const existingComplaint = await this.prisma.complaint.findFirst({
      where: { orderId },
    });

    if (existingComplaint) {
      return {
        canComplain: false,
        reason: "already_complained",
        message: "A complaint has already been filed for this order",
        complaint: existingComplaint,
      };
    }

    // ⭐ UPDATED: Check time limit (3 days after completion/delivery)
    const referenceDate = order.completedAt || order.deliveredAt;
    
    if (referenceDate) {
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const referenceTime = new Date(referenceDate).getTime();
      const timeDiff = now - referenceTime;

      if (timeDiff > threeDaysInMs) {
        return {
          canComplain: false,
          reason: "expired",
          message: "Complaint period has expired (3 days after order completion)",
        };
      }

      // Calculate remaining time
      const remainingMs = threeDaysInMs - timeDiff;
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));

      return {
        canComplain: true,
        message: "You can file a complaint for this order",
        remainingHours,
      };
    }

    return {
      canComplain: true,
      message: "You can file a complaint for this order",
    };
  };
}
