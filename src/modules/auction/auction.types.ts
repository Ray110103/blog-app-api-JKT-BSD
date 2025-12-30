export interface AuctionWithDetails {
  id: number;
  productId: number;
  product: {
    id: number;
    name: string;
    slug: string;
    thumbnail: string | null;
    description: string | null;
  };
  startPrice: number;
  buyOutPrice: number;
  currentBid: number;
  minIncrement: number;
  startTime: Date;
  lastBidTime: Date | null;
  endTime: Date | null;
  paymentDeadline: Date | null;
  status: string;
  winnerId: number | null;
  winner?: {
    id: number;
    name: string;
    email: string;
  } | null;
  isRelisted: boolean;
  totalBids: number;
  uniqueBidders: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BidHistory {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
  };
  bidAmount: number;
  bidTime: Date;
}