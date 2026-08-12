export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  customerName: string;
  rating: number;
  review: string;
  verifiedPurchase: boolean;
  status: 'published';
  createdAt: string;
  updatedAt: string;
};

export type ProductReviewSummary = {
  averageRating: number;
  reviewCount: number;
};
