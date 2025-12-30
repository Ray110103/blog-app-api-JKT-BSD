import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXX
 * Example: ORD-20250116-001
 */
export const generateOrderNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const datePrefix = `ORD-${year}${month}${day}`;

  // Get today's order count
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const todayOrderCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  // Generate sequence number (001, 002, 003, etc.)
  const sequence = String(todayOrderCount + 1).padStart(3, "0");

  return `${datePrefix}-${sequence}`;
};