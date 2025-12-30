export interface UserAuctionStatsResponse {
  userId: number;
  totalWon: number;
  totalPaid: number;
  totalFailed: number;
  successRate: number;
  lastFailedAt: Date | null;
  bannedUntil: Date | null;
  isBanned: boolean;
}

export interface CanBidResponse {
  allowed: boolean;
  reason?: string;
  stats?: UserAuctionStatsResponse;
}