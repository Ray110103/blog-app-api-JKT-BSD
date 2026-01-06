import { Request, Response, NextFunction } from "express";
import { ProductService } from "./product.service";
import { ProductType } from "./dto/create-product.dto";
import { ApiError } from "../../utils/api-error";

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
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

      const filters = {
        productType: req.query.productType as ProductType,
        gameId: req.query.gameId ? Number(req.query.gameId) : undefined,
        setId: req.query.setId ? Number(req.query.setId) : undefined,
        languageId: req.query.languageId
          ? Number(req.query.languageId)
          : undefined,
        rarityId: req.query.rarityId ? Number(req.query.rarityId) : undefined,
        sealedCategoryId: req.query.sealedCategoryId
          ? Number(req.query.sealedCategoryId)
          : undefined,
        accessoryCategoryId: req.query.accessoryCategoryId
          ? Number(req.query.accessoryCategoryId)
          : undefined,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search as string | undefined,

        // ⭐ Pagination & Sorting
        page,
        limit,
        skip,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      console.log("🔍 [ProductController] Filters:", filters);

      if (hasPagination) {
        const result = await this.productService.getAllPaginated(filters);
        res.status(200).json({
          success: true,
          data: result.products,
          pagination: result.pagination,
        });
        return;
      }

      const products = await this.productService.getAll(filters);
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const product = await this.productService.getBySlug(slug);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const thumbnail = files?.thumbnail?.[0];
      const photos = files?.photos || [];

      // Manual validation: Required fields
      if (!req.body.productType) {
        throw new ApiError("Product type is required", 400);
      }
      if (!req.body.name) {
        throw new ApiError("Product name is required", 400);
      }
      if (!req.body.weight) {
        throw new ApiError("Weight is required", 400);
      }

      // Parse variants from JSON string
      if (req.body.variants && typeof req.body.variants === "string") {
        try {
          req.body.variants = JSON.parse(req.body.variants);
        } catch (error) {
          throw new ApiError("Invalid JSON format for variants", 400);
        }
      }

      // Convert numeric fields
      const numericFields = [
        "gameId",
        "setId",
        "languageId",
        "hp",
        "sealedCategoryId",
        "cardsPerPack",
        "packsPerBox",
        "accessoryCategoryId",
        "weight",
      ];

      numericFields.forEach((field) => {
        if (req.body[field]) {
          req.body[field] = Number(req.body[field]);
        }
      });

      // Validate weight
      if (req.body.weight < 1) {
        throw new ApiError("Weight must be at least 1 gram", 400);
      }

      // Convert weight in variants
      if (req.body.variants && Array.isArray(req.body.variants)) {
        req.body.variants = req.body.variants.map((variant: any) => ({
          ...variant,
          rarityId: variant.rarityId ? Number(variant.rarityId) : undefined,
          conditionId: variant.conditionId
            ? Number(variant.conditionId)
            : undefined,
          price: Number(variant.price),
          stock: Number(variant.stock),
          weight: variant.weight ? Number(variant.weight) : undefined,
        }));
      }

      const product = await this.productService.create(
        req.body,
        thumbnail,
        photos
      );
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const thumbnail = files?.thumbnail?.[0];
      const photos = files?.photos || [];

      // Convert numeric fields
      const numericFields = [
        "gameId",
        "setId",
        "languageId",
        "hp",
        "sealedCategoryId",
        "cardsPerPack",
        "packsPerBox",
        "accessoryCategoryId",
        "weight",
      ];

      numericFields.forEach((field) => {
        if (req.body[field]) {
          req.body[field] = Number(req.body[field]);
        }
      });

      const product = await this.productService.update(
        slug,
        req.body,
        thumbnail,
        photos
      );
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  };

  deleteImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageId } = req.params;
      const result = await this.productService.deleteImage(Number(imageId));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const result = await this.productService.delete(slug);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // Variant endpoints
  createVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      // Convert numeric fields
      if (req.body.rarityId) req.body.rarityId = Number(req.body.rarityId);
      if (req.body.conditionId)
        req.body.conditionId = Number(req.body.conditionId);
      if (req.body.price) req.body.price = Number(req.body.price);
      if (req.body.stock) req.body.stock = Number(req.body.stock);
      if (req.body.weight) req.body.weight = Number(req.body.weight);

      const variant = await this.productService.createVariant(slug, req.body);
      res.status(201).json(variant);
    } catch (error) {
      next(error);
    }
  };

  updateVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { variantId } = req.params;

      // Convert numeric fields
      if (req.body.price) req.body.price = Number(req.body.price);
      if (req.body.stock) req.body.stock = Number(req.body.stock);

      // Handle weight (can be null to remove override)
      if (req.body.weight !== undefined) {
        req.body.weight = req.body.weight ? Number(req.body.weight) : null;
      }

      const variant = await this.productService.updateVariant(
        Number(variantId),
        req.body
      );
      res.status(200).json(variant);
    } catch (error) {
      next(error);
    }
  };

  deleteVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { variantId } = req.params;
      const result = await this.productService.deleteVariant(Number(variantId));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
