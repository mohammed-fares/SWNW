export interface Substitute {
  name: string;
  priceDiff: string;
  reason: string;
}

export interface MedicineItem {
  name: string;
  qty: number;
  price: number;
  dosage?: string;
  substitutes?: Substitute[];
}

export interface Bid {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyRating: number;
  pharmacyDistance: number; // in km
  deliveryTime: number; // in mins
  price: number; // EGP
  substitutesOffered: string[];
  score: number;
  scoreBreakdown: {
    priceScore: number;
    ratingScore: number;
    distanceScore: number;
    speedScore: number;
  };
}

export interface OrderTimeline {
  status: string;
  statusAr: string;
  time: string;
  completed: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: "pending" | "bidding" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled";
  statusAr: string;
  prescriptionImage: string | null;
  items: MedicineItem[];
  notes: string;
  timestamp: string;
  bids: Bid[];
  acceptedBidId: string | null;
  deliveryFee: number;
  deliveryPartner: {
    name: string;
    rating: number;
    deliveries: number;
    phone: string;
    avatar: string;
    eta?: string;
  } | null;
  timeline: OrderTimeline[];
  interactionsWarning: string | null;
  hasInteractions: boolean;
  chronicConditions?: string[];
}

export interface ChatMessage {
  id: string;
  sender: "customer" | "pharmacist" | "system";
  text: string;
  timestamp: string;
  pharmacyName?: string;
}
