import { Request, Response } from "express";
import { ComplaintService } from "./complaint.service";
import { ApiError } from "../../utils/api-error";

export class ComplaintController {
  private complaintService: ComplaintService;

  constructor() {
    this.complaintService = new ComplaintService();
  }

  // GET /complaints
  getAll = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user.id;
      const isAdmin = res.locals.user.role === "ADMIN";

      const rawPage = req.query.page;
      const rawLimit = req.query.limit ?? req.query.take;
      const rawSkip = req.query.skip;

      const hasPagination =
        rawPage !== undefined || rawLimit !== undefined || rawSkip !== undefined;

      const page = rawPage !== undefined ? Number(rawPage) : undefined;
      const limit = rawLimit !== undefined ? Number(rawLimit) : undefined;
      const skip = rawSkip !== undefined ? Number(rawSkip) : undefined;

      if (page !== undefined && (!Number.isFinite(page) || page < 1)) {
        throw new ApiError("Invalid `page` query param", 400);
      }
      if (
        limit !== undefined &&
        (!Number.isFinite(limit) || limit < 1 || limit > 100)
      ) {
        throw new ApiError("Invalid `limit` query param", 400);
      }
      if (skip !== undefined && (!Number.isFinite(skip) || skip < 0)) {
        throw new ApiError("Invalid `skip` query param", 400);
      }

      if (hasPagination) {
        const result = await this.complaintService.getAllPaginated(
          userId,
          isAdmin,
          { page, limit, skip }
        );

        res.status(200).json({
          success: true,
          data: result.complaints,
          pagination: result.pagination,
        });
        return;
      }

      const complaints = await this.complaintService.getAll(userId, isAdmin);
      res.status(200).json(complaints);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // GET /complaints/:complaintId
  getById = async (req: Request, res: Response) => {
    try {
      const { complaintId } = req.params;
      const userId = res.locals.user.id;
      const isAdmin = res.locals.user.role === "ADMIN";

      const complaint = await this.complaintService.getById(
        Number(complaintId),
        userId,
        isAdmin
      );
      res.status(200).json(complaint);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // POST /complaints
  create = async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user.id;

      // Get video and photos from multer
      const videoFile = (req.files as any)?.video?.[0];
      const photoFiles = (req.files as any)?.photos || [];

      const complaint = await this.complaintService.create(
        userId,
        req.body,
        videoFile,
        photoFiles
      );

      res.status(201).json({
        success: true,
        message: "Complaint submitted successfully",
        data: complaint,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // PATCH /complaints/:complaintId (Admin only)
  update = async (req: Request, res: Response) => {
    try {
      const { complaintId } = req.params;
      const adminId = res.locals.user.id;

      const complaint = await this.complaintService.update(
        Number(complaintId),
        adminId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Complaint updated successfully",
        data: complaint,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // PATCH /complaints/:complaintId/cancel
  cancel = async (req: Request, res: Response) => {
    try {
      const { complaintId } = req.params;
      const userId = res.locals.user.id;

      const complaint = await this.complaintService.cancel(
        Number(complaintId),
        userId
      );

      res.status(200).json({
        success: true,
        message: "Complaint cancelled successfully",
        data: complaint,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };

  // GET /complaints/can-complain/:orderId
  canComplain = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = res.locals.user.id;

      const result = await this.complaintService.canComplain(
        Number(orderId),
        userId
      );

      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  };
}
