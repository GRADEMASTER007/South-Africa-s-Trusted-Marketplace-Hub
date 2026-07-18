export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  createdAt: string;
  businessProfile?: BusinessProfile;
  isVerified?: boolean;
  isBlocked?: boolean;
}

export interface BusinessProfile {
  id: string;
  ownerId: string;
  companyName: string;
  logoUrl?: string;
  description: string;
  address: string;
  phone: string;
  whatsApp: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  openingHours?: string;
  photos?: string[];
  rating?: number;
  reviewsCount?: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  isNegotiable: boolean;
  category: string;
  subcategory: string;
  province: string;
  city: string;
  suburb: string;
  condition: 'new' | 'used' | 'refurbished';
  contactPhone: string;
  whatsAppNumber: string;
  images: string[];
  videoUrl?: string;
  hasLogo?: boolean;
  packageType: 'free' | 'starter' | 'business' | 'premium';
  status: 'active' | 'expired' | 'draft' | 'pending_approval';
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: string;
  expiresAt: string;
  isFeatured?: boolean;
  viewCount: number;
  latitude?: number;
  longitude?: number;
  priceHistory?: { price: number; date: string }[];
}

export interface PaymentRecord {
  id: string;
  userId: string;
  listingId?: string;
  amount: number;
  packageName: string;
  status: 'success' | 'failed' | 'pending';
  reference: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingImage?: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount?: { [uid: string]: number };
}

export interface Review {
  id: string;
  targetId: string; // userId (for seller) or businessId (for business profile)
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  rating: number; // 1 to 5
  text: string;
  createdAt: string;
}

export interface ScamReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterEmail: string;
  reason: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'payment' | 'system' | 'chat';
  read: boolean;
  listingId?: string;
  createdAt: string;
}
