import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client on the server
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API client:", err);
  }
} else {
  console.log("Gemini API key is not set. AI-powered features will fall back to smart simulated responses.");
}

// In-Memory Shared Database
interface Substitute {
  name: string;
  priceDiff: string;
  reason: string;
}

interface MedicineItem {
  name: string;
  qty: number;
  price: number;
  dosage?: string;
  substitutes?: Substitute[];
}

interface Bid {
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

interface OrderTimeline {
  status: string;
  statusAr: string;
  time: string;
  completed: boolean;
}

interface Order {
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
}

// Seed Database
let orders: Order[] = [
  {
    id: "ORD-1234",
    customerName: "أحمد محمد",
    customerPhone: "+20 102 345 6789",
    customerAddress: "12 شارع القصر العيني، جاردن سيتي، القاهرة",
    status: "delivering",
    statusAr: "جاري التوصيل",
    prescriptionImage: null,
    items: [
      { name: "Panadol Extra", qty: 2, price: 24.00, dosage: "500mg" },
      { name: "Vitamin C", qty: 1, price: 21.00, dosage: "1000mg" }
    ],
    notes: "يرجى التوصيل بين الساعة 3-5 مساءً. رن الجرس مرتين.",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    acceptedBidId: "BID-1",
    deliveryFee: 15,
    bids: [
      {
        id: "BID-1",
        pharmacyId: "ph-1",
        pharmacyName: "صيدلية هيلث بلس (HealthPlus)",
        pharmacyRating: 4.9,
        pharmacyDistance: 1.5,
        deliveryTime: 20,
        price: 45.00,
        substitutesOffered: [],
        score: 95.5,
        scoreBreakdown: { priceScore: 40, ratingScore: 29.4, distanceScore: 18, speedScore: 8.1 }
      }
    ],
    deliveryPartner: {
      name: "جون سائق",
      rating: 4.9,
      deliveries: 156,
      phone: "+20 115 987 6543",
      avatar: "JD",
      eta: "10 دقائق"
    },
    timeline: [
      { status: "placed", statusAr: "تم تقديم الطلب", time: "13:45", completed: true },
      { status: "confirmed", statusAr: "تم قبول العرض", time: "14:00", completed: true },
      { status: "preparing", statusAr: "جاري تحضير الدواء", time: "14:15", completed: true },
      { status: "delivering", statusAr: "المندوب في الطريق", time: "14:30", completed: true },
      { status: "delivered", statusAr: "تم التسليم", time: "--:--", completed: false }
    ],
    interactionsWarning: null,
    hasInteractions: false
  },
  {
    id: "ORD-1233",
    customerName: "أحمد محمد",
    customerPhone: "+20 102 345 6789",
    customerAddress: "12 شارع القصر العيني، جاردن سيتي، القاهرة",
    status: "delivered",
    statusAr: "تم التوصيل",
    prescriptionImage: null,
    items: [
      { name: "Ibuprofen 400mg", qty: 1, price: 32.50 }
    ],
    notes: "",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    acceptedBidId: "BID-2",
    deliveryFee: 15,
    bids: [
      {
        id: "BID-2",
        pharmacyId: "ph-2",
        pharmacyName: "صيدلية مصر إكسبريس (MediCare)",
        pharmacyRating: 4.7,
        pharmacyDistance: 2.3,
        deliveryTime: 30,
        price: 32.50,
        substitutesOffered: [],
        score: 88.2,
        scoreBreakdown: { priceScore: 40, ratingScore: 28.2, distanceScore: 15, speedScore: 5 }
      }
    ],
    deliveryPartner: {
      name: "تامر علي",
      rating: 4.8,
      deliveries: 94,
      phone: "+20 122 333 4444",
      avatar: "TA"
    },
    timeline: [
      { status: "placed", statusAr: "تم تقديم الطلب", time: "11:15", completed: true },
      { status: "confirmed", statusAr: "تم قبول العرض", time: "11:20", completed: true },
      { status: "preparing", statusAr: "جاري تحضير الدواء", time: "11:35", completed: true },
      { status: "delivering", statusAr: "المندوب في الطريق", time: "11:50", completed: true },
      { status: "delivered", statusAr: "تم التسليم بنجاح", time: "12:10", completed: true }
    ],
    interactionsWarning: null,
    hasInteractions: false
  },
  {
    id: "ORD-1232",
    customerName: "أحمد محمد",
    customerPhone: "+20 102 345 6789",
    customerAddress: "12 شارع القصر العيني، جاردن سيتي، القاهرة",
    status: "cancelled",
    statusAr: "ملغي",
    prescriptionImage: null,
    items: [
      { name: "Cough Syrup", qty: 1, price: 28.00 }
    ],
    notes: "يرجى توفير بديل مصري إن أمكن",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    acceptedBidId: null,
    deliveryFee: 0,
    bids: [],
    deliveryPartner: null,
    timeline: [
      { status: "placed", statusAr: "تم تقديم الطلب", time: "16:45", completed: true },
      { status: "cancelled", statusAr: "تم إلغاء الطلب من قبل العميل", time: "17:00", completed: true }
    ],
    interactionsWarning: null,
    hasInteractions: false
  }
];

// Consultation Chats
interface ChatMessage {
  id: string;
  sender: "customer" | "pharmacist" | "system";
  text: string;
  timestamp: string;
  pharmacyName?: string;
}

let chats: ChatMessage[] = [
  {
    id: "m1",
    sender: "pharmacist",
    text: "مرحباً أحمد، أنا الصيدلي المناوب من صيدلية هيلث بلس. كيف يمكنني مساعدتك اليوم؟",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    pharmacyName: "صيدلية هيلث بلس"
  },
  {
    id: "m2",
    sender: "customer",
    text: "أهلاً بك، كنت أتساءل هل يوجد بديل محلي أرخص للبندول إكسترا وبنفس المفعول؟",
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString()
  },
  {
    id: "m3",
    sender: "pharmacist",
    text: "نعم بالطبع! يتوفر لدينا عقار 'أبيمول إكسترا' (Abimol Extra) وهو مصري الصنع، يحتوي على نفس التركيبة تماماً (باراسيتامول مع كافيين) وبسعر اقتصادي جداً (حوالي ثلث السعر).",
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    pharmacyName: "صيدلية هيلث بلس"
  }
];

// Smart Bidding Algorithm Score Calculator
function calculateBidScore(
  price: number,
  rating: number,
  distance: number,
  deliveryTime: number,
  minPrice: number,
  maxPrice: number,
  maxDistance: number = 5,
  maxTime: number = 60
) {
  // S = Price(40%) + Rating(30%) + Distance(20%) + DeliveryTime(10%)
  const priceRange = maxPrice - minPrice;
  const priceScore = priceRange > 0 ? ((maxPrice - price) / priceRange) * 40 : 40;

  const ratingScore = (rating / 5) * 30;

  const distanceScore = (1 - Math.min(distance / maxDistance, 1)) * 20;

  const speedScore = (1 - Math.min(deliveryTime / maxTime, 1)) * 10;

  const finalScore = parseFloat((priceScore + ratingScore + distanceScore + speedScore).toFixed(1));

  return {
    score: finalScore,
    breakdown: {
      priceScore: parseFloat(priceScore.toFixed(1)),
      ratingScore: parseFloat(ratingScore.toFixed(1)),
      distanceScore: parseFloat(distanceScore.toFixed(1)),
      speedScore: parseFloat(speedScore.toFixed(1))
    }
  };
}

// Shared Data Stores for Registered Pharmacies, Couriers and Clients
let pharmacies = [
  { id: "PH-1", name: "صيدلية هيلث بلس (HealthPlus)", owner: "د. هاني عادل", status: "Approved", phone: "01005551234", city: "new-cairo", orders: 48 },
  { id: "PH-2", name: "صيدلية مصر إكسبريس (MediCare)", owner: "د. محمد فاروق", status: "Approved", phone: "01227779988", city: "heliopolis", orders: 125 },
  { id: "PH-3", name: "صيدليات العزبي - فرع الدقي", owner: "د. أحمد كمال", status: "Approved", phone: "01112223344", city: "zamalek", orders: 92 },
  { id: "PH-4", name: "صيدلية العناية القصوى", owner: "د. شيماء علي", status: "Pending", phone: "01054448811", city: "sheikh-zayed", orders: 0 },
];

let couriers = [
  { id: "CR-1", name: "كابتن سيف الدين", vehicle: "سكوتر بينيلي", status: "Online", phone: "01158889900", rating: 4.9, earnings: "420.00 EGP", ordersCompleted: 45 },
  { id: "CR-2", name: "كابتن حازم مصطفى", vehicle: "دراجة نارية هوجان", status: "Online", phone: "01094445566", rating: 4.8, earnings: "250.00 EGP", ordersCompleted: 22 },
  { id: "CR-3", name: "كابتن رامي شريف", vehicle: "سيارة هيونداي", status: "Offline", phone: "01201112233", rating: 4.7, earnings: "850.00 EGP", ordersCompleted: 78 },
];

// Simulated Pharmacy Bidding Runner
function simulateBiddingForOrder(orderId: string) {
  setTimeout(() => {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1 || orders[orderIndex].status !== "pending") return;

    // Filter approved pharmacies to participate in the bid simulation
    const approvedPharmacies = pharmacies.filter(p => p.status === "Approved");

    const activeBidders = approvedPharmacies.length > 0 ? approvedPharmacies.map((p, index) => ({
      id: p.id,
      name: p.name,
      rating: 4.5 + (index % 5) * 0.1,
      distance: 1.0 + (index % 4) * 0.8,
      speed: 15 + (index % 3) * 10,
      priceFactor: 0.95 + (index % 3) * 0.05
    })) : [
      { id: "PH-1", name: "صيدلية هيلث بلس (HealthPlus)", rating: 4.8, distance: 1.2, speed: 20, priceFactor: 1.0 },
      { id: "PH-2", name: "صيدلية مصر إكسبريس (MediCare)", rating: 4.5, distance: 2.8, speed: 35, priceFactor: 0.9 },
      { id: "PH-3", name: "صيدليات العزبي - فرع الدقي", rating: 4.9, distance: 3.5, speed: 15, priceFactor: 1.2 }
    ];

    // Determine mock prices based on items
    let basePrice = 0;
    if (orders[orderIndex].items.length > 0) {
      basePrice = orders[orderIndex].items.reduce((sum, item) => sum + (item.price || 30) * item.qty, 0);
    } else {
      // If image only, mock standard price
      basePrice = 85.00;
      // Populate items with something standard
      orders[orderIndex].items = [
        { name: "Augmentin 1g (أوجمنتين مضاد حيوي)", qty: 1, price: 65.00 },
        { name: "Panadol Joint (بنادول للمفاصل)", qty: 1, price: 20.00 }
      ];
    }

    const calculatedBids = activeBidders.map((p, i) => {
      const bidPrice = Math.round(basePrice * p.priceFactor);
      return {
        id: `BID-${Date.now()}-${i}`,
        pharmacyId: p.id,
        pharmacyName: p.name,
        pharmacyRating: p.rating,
        pharmacyDistance: p.distance,
        deliveryTime: p.speed,
        price: bidPrice,
        substitutesOffered: i === 1 ? ["أبيمول (بديل مصري مكافئ بسعر أقل 40%)"] : []
      };
    });

    // Min and Max prices for score scaling
    const prices = calculatedBids.map(b => b.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    orders[orderIndex].bids = calculatedBids.map(b => {
      const scoring = calculateBidScore(b.price, b.pharmacyRating, b.pharmacyDistance, b.deliveryTime, minPrice, maxPrice);
      return {
        ...b,
        score: scoring.score,
        scoreBreakdown: scoring.breakdown
      };
    }).sort((a, b) => b.score - a.score); // Sorted by smart rating!

    // Shift status from pending to bidding
    orders[orderIndex].status = "bidding";
    orders[orderIndex].statusAr = "بانتظار العروض";

    console.log(`Bids generated for order ${orderId} using active pharmacies.`);
  }, 4000); // Trigger after 4 seconds
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// 1. Get All Orders
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// 2. Submit New Order (Prescription Upload or Hand-written names)
app.post("/api/orders", (req, res) => {
  const { customerName, customerPhone, customerAddress, prescriptionImage, notes, items, chronicConditions } = req.body;

  const newOrder: Order = {
    id: `ORD-${1000 + Math.floor(Math.random() * 9000)}`,
    customerName: customerName || "أحمد محمد",
    customerPhone: customerPhone || "+20 102 345 6789",
    customerAddress: customerAddress || "12 شارع القصر العيني، القاهرة",
    status: "pending",
    statusAr: "جاري البحث عن صيدليات",
    prescriptionImage: prescriptionImage || null,
    items: items || [],
    notes: notes || "",
    timestamp: new Date().toISOString(),
    bids: [],
    acceptedBidId: null,
    deliveryFee: 15,
    deliveryPartner: null,
    timeline: [
      { status: "placed", statusAr: "تم إرسال الروشتة", time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }), completed: true },
      { status: "confirmed", statusAr: "بانتظار تأكيد العرض", time: "--:--", completed: false },
      { status: "preparing", statusAr: "تحضير الطلب في الصيدلية", time: "--:--", completed: false },
      { status: "delivering", statusAr: "المندوب في الطريق", time: "--:--", completed: false },
      { status: "delivered", statusAr: "تم التسليم", time: "--:--", completed: false }
    ],
    interactionsWarning: null,
    hasInteractions: false,
    chronicConditions: chronicConditions || []
  };

  orders.unshift(newOrder);

  // Trigger simulated bidding in background
  simulateBiddingForOrder(newOrder.id);

  res.status(201).json(newOrder);
});

// 3. Accept Pharmacy Bid
app.post("/api/orders/:id/accept", (req, res) => {
  const { bidId } = req.body;
  const orderIndex = orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  const acceptedBid = order.bids.find(b => b.id === bidId);

  if (!acceptedBid) {
    return res.status(404).json({ error: "Bid not found" });
  }

  order.status = "preparing";
  order.statusAr = "جاري التحضير";
  order.acceptedBidId = bidId;
  order.deliveryFee = 15;

  // Set the correct items prices based on pharmacy bid
  // Simulate setting final price
  order.timeline[1] = {
    status: "confirmed",
    statusAr: "تم قبول عرض " + acceptedBid.pharmacyName,
    time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    completed: true
  };
  order.timeline[2] = {
    status: "preparing",
    statusAr: "جاري تحضير الأدوية وتغليفها",
    time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    completed: true
  };

  // Mock driver partner
  order.deliveryPartner = {
    name: "محمد جابر (مندوب التوصيل)",
    rating: 4.8,
    deliveries: 342,
    phone: "+20 112 456 7890",
    avatar: "MG",
    eta: `${acceptedBid.deliveryTime} دقيقة`
  };

  res.json(order);
});

// 4. Pharmacy Update Order Status
app.post("/api/orders/:id/status", (req, res) => {
  const { status } = req.body;
  const orderIndex = orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  order.status = status;

  const nowTime = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  if (status === "ready") {
    order.statusAr = "جاهز للتوصيل";
    order.timeline[2] = { status: "preparing", statusAr: "تم تجهيز وتغليف الأدوية", time: nowTime, completed: true };
  } else if (status === "delivering") {
    order.statusAr = "جاري التوصيل";
    order.timeline[3] = { status: "delivering", statusAr: "استلم المندوب الشحنة وهو في الطريق إليك", time: nowTime, completed: true };
  } else if (status === "delivered") {
    order.statusAr = "تم التوصيل";
    order.timeline[4] = { status: "delivered", statusAr: "تم تسليم الدواء والمبلغ المدفوع بالكامل", time: nowTime, completed: true };
  } else if (status === "cancelled") {
    order.statusAr = "ملغي";
    order.timeline.push({ status: "cancelled", statusAr: "تم إلغاء الطلب", time: nowTime, completed: true });
  }

  res.json(order);
});

// 4.1 Courier Claim Ready Order
app.post("/api/orders/:id/claim", (req, res) => {
  const { name, phone, vehicle, rating } = req.body;
  const orderIndex = orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  order.status = "delivering";
  order.statusAr = "جاري التوصيل";
  
  order.deliveryPartner = {
    name: name || "كابتن سيف الدين",
    phone: phone || "+20 115 888 9900",
    avatar: "CS",
    rating: rating || 4.9,
    deliveries: 151,
    eta: "15 دقيقة"
  };

  const nowTime = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  order.timeline[3] = { 
    status: "delivering", 
    statusAr: "استلم كابتن " + (name || "سيف") + " الشحنة وهو في طريقه إليك", 
    time: nowTime, 
    completed: true 
  };

  res.json(order);
});

// 5. Submit Bid (Manual Pharmacy bidding for simulation)
app.post("/api/orders/:id/bid", (req, res) => {
  const { pharmacyName, pharmacyRating, pharmacyDistance, deliveryTime, price, substitutesOffered } = req.body;
  const orderIndex = orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  const order = orders[orderIndex];
  const newBid: Bid = {
    id: `BID-${Date.now()}`,
    pharmacyId: `ph-${Math.floor(Math.random() * 100)}`,
    pharmacyName: pharmacyName || "صيدلية العميل اليدوية",
    pharmacyRating: pharmacyRating || 4.7,
    pharmacyDistance: pharmacyDistance || 2.1,
    deliveryTime: deliveryTime || 25,
    price: price || 75.00,
    substitutesOffered: substitutesOffered || [],
    score: 85, // Simple default, will recalibrate
    scoreBreakdown: { priceScore: 35, ratingScore: 25, distanceScore: 15, speedScore: 10 }
  };

  order.bids.push(newBid);

  // Recalibrate scoring
  const prices = order.bids.map(b => b.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  order.bids = order.bids.map(b => {
    const scoring = calculateBidScore(b.price, b.pharmacyRating, b.pharmacyDistance, b.deliveryTime, minPrice, maxPrice);
    return {
      ...b,
      score: scoring.score,
      scoreBreakdown: scoring.breakdown
    };
  }).sort((a, b) => b.score - a.score);

  if (order.status === "pending") {
    order.status = "bidding";
    order.statusAr = "بانتظار العروض";
  }

  res.status(201).json(order);
});

// 6. Consultations Chats APIs
app.get("/api/chats", (req, res) => {
  res.json(chats);
});

app.post("/api/chats", (req, res) => {
  const { sender, text, pharmacyName } = req.body;
  const newMessage: ChatMessage = {
    id: `m-${Date.now()}`,
    sender: sender || "customer",
    text,
    timestamp: new Date().toISOString(),
    pharmacyName
  };
  chats.push(newMessage);
  res.status(201).json(newMessage);
});

// 6.1. Dynamic Pharmacies APIs
app.get("/api/pharmacies", (req, res) => {
  res.json(pharmacies);
});

app.post("/api/pharmacies/register", (req, res) => {
  const { name, owner, phone, city } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "اسم الصيدلية ورقم الهاتف مطلوبان" });
  }

  // Support 11-digit Egypt numbers (optionally starting with +20 or 002)
  const cleanPhone = phone.replace(/\s+/g, "").replace(/^(\+20|002)/, "");
  const phonePattern = /^0?1[0125]\d{8}$/;
  if (!phonePattern.test(cleanPhone)) {
    return res.status(400).json({ error: "رقم هاتف مصري غير صالح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً." });
  }

  // Format formatted Egyptian phone display
  const formattedPhone = cleanPhone.startsWith("0") ? cleanPhone : "0" + cleanPhone;

  const newId = `PH-${100 + pharmacies.length + 1}`;
  const newPhar = {
    id: newId,
    name,
    owner: owner || "دكتور صيدلي",
    status: "Pending", // Must be approved by Admin
    phone: formattedPhone,
    city: city || "new-cairo",
    orders: 0
  };
  pharmacies.push(newPhar);
  res.status(201).json(newPhar);
});

app.post("/api/pharmacies/:id/status", (req, res) => {
  const { status } = req.body;
  const phIndex = pharmacies.findIndex(p => p.id === req.params.id);
  if (phIndex === -1) {
    return res.status(404).json({ error: "الصيدلية غير موجودة" });
  }
  if (!["Approved", "Pending", "Suspended"].includes(status)) {
    return res.status(400).json({ error: "حالة تشغيل غير صالحة" });
  }
  pharmacies[phIndex].status = status;
  res.json(pharmacies[phIndex]);
});

// 6.2. Dynamic Couriers APIs
app.get("/api/couriers", (req, res) => {
  res.json(couriers);
});

app.post("/api/couriers/register", (req, res) => {
  const { name, vehicle, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: "اسم المندوب ورقم الهاتف مطلوبان" });
  }

  const cleanPhone = phone.replace(/\s+/g, "").replace(/^(\+20|002)/, "");
  const phonePattern = /^0?1[0125]\d{8}$/;
  if (!phonePattern.test(cleanPhone)) {
    return res.status(400).json({ error: "رقم هاتف مصري غير صالح. يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً." });
  }

  const formattedPhone = cleanPhone.startsWith("0") ? cleanPhone : "0" + cleanPhone;

  const newId = `CR-${10 + couriers.length + 1}`;
  const newCour = {
    id: newId,
    name,
    vehicle: vehicle || "سكوتر",
    status: "Pending", // Needs admin approval to go Online
    phone: formattedPhone,
    rating: 5.0,
    earnings: "0.00 EGP",
    ordersCompleted: 0
  };
  couriers.push(newCour);
  res.status(201).json(newCour);
});

app.post("/api/couriers/:id/status", (req, res) => {
  const { status } = req.body;
  const cIndex = couriers.findIndex(c => c.id === req.params.id);
  if (cIndex === -1) {
    return res.status(404).json({ error: "المندوب غير موجود" });
  }
  if (!["Online", "Offline", "Suspended"].includes(status)) {
    return res.status(400).json({ error: "حالة تشغيل غير صالحة" });
  }
  couriers[cIndex].status = status;
  res.json(couriers[cIndex]);
});

// 6.3. Admin Order Controls (Deletions & Overrides)
app.delete("/api/orders/:id", (req, res) => {
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }
  orders.splice(orderIndex, 1);
  res.json({ success: true, message: "تم حذف وإلغاء الشحنة تماماً من النظام" });
});

app.post("/api/orders/:id/admin-override", (req, res) => {
  const { status, statusAr, deliveryPartner, items } = req.body;
  const orderIndex = orders.findIndex(o => o.id === req.params.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }
  const order = orders[orderIndex];
  if (status) order.status = status;
  if (statusAr) order.statusAr = statusAr;
  if (items) order.items = items;
  if (deliveryPartner) order.deliveryPartner = deliveryPartner;

  // Add timeline event representing administrative action
  const nowTime = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  order.timeline.push({
    status: status || "admin_override",
    statusAr: `تم تحديث الشحنة من مركز الإدارة: ${statusAr || status}`,
    time: nowTime,
    completed: true
  });

  res.json(order);
});

// 7. Gemini AI-powered Prescription OCR, Interaction check and Alternative Generator
app.post("/api/ocr", async (req, res) => {
  const { imageBase64 } = req.body;

  // Fallback data if API key isn't provided or fails
  const fallbackResponse = {
    medicines: [
      {
        name: "Panadol Extra (بنادول إكسترا)",
        dosage: "500mg باراسيتامول / 65mg كافيين",
        frequency: "قرص كل 8 ساعات عند اللزوم لتسكين الألم وخفض الحرارة",
        substitutes: [
          { name: "Abimol Extra (أبيمول إكسترا)", priceDiff: "-60%", reason: "بديل مصري مكافئ 100% ويحتوي على نفس المواد الفعالة وبسعر اقتصادي جداً" },
          { name: "Adol Extra (أدول إكسترا)", priceDiff: "-20%", reason: "نفس التركيبة الفعالة ومتوفر بكثرة في السوق المحلي" }
        ]
      },
      {
        name: "Augmentin (أوجمنتين مضاد حيوي واسع المجال)",
        dosage: "1g أموكسيسيلين / كلافولانيك أسيد",
        frequency: "قرص كل 12 ساعة بعد الأكل لمدة 7 أيام للالتهابات البكتيرية",
        substitutes: [
          { name: "Curam 1g (كيورام مضاد حيوي)", priceDiff: "-15%", reason: "نفس المكونات الطبية الفعالة وبنفس الجودة والكفاءة" },
          { name: "Megamox 1g (ميجاموكس)", priceDiff: "-30%", reason: "بديل محلي ممتاز ومتوفر كخيار طبي بديل معتمد" }
        ]
      }
    ],
    hasInteractions: false,
    interactionsWarning: "لم يتم العثور على تداخلات دوائية خطيرة بين الأدوية المستخرجة من هذه الروشتة. يرجى دائماً استشارة الصيدلي قبل تناول أي علاج."
  };

  if (!ai) {
    console.log("No Gemini API key available. Returning high-fidelity simulated OCR analysis.");
    return res.json(fallbackResponse);
  }

  try {
    const prompt = `أنت صيدلي خبير ومساعد طبي ذكي جداً.
قم بتحليل صورة الروشتة المرفقة واستخرج الأدوية المكتوبة فيها بدقة.
إذا لم يتم توفير صورة حقيقية أو كانت الصورة عبارة عن عينة عشوائية، افترض أن الروشتة تحتوي على دواء مسكن قوي (مثل بنادول إكسترا أو كتافلام) ومضاد حيوي واسع المجال (مثل أوجمنتين 1 جم) أو دواء للمعدة (مثل أوميز).

الرجاء توفير مخرجات منظمة بصيغة JSON مطابقة تماماً للمخطط التالي باللغة العربية:
{
  "medicines": [
    {
      "name": "اسم الدواء بالإنجليزية مع تعريبه بين قوسين",
      "dosage": "الجرعة والتركيز المكتوب",
      "frequency": "طريقة وكيفية تناول الدواء باللغة العربية",
      "substitutes": [
        {
          "name": "اسم البديل المقترح بالإنجليزية والتعريب",
          "priceDiff": "نسبة فرق السعر التقريبية مثل -30% أو -50%",
          "reason": "توضيح طبي لماذا يعتبر بديلاً ممتازاً (مثلاً نفس المادة الفعالة وسعر أوفر)"
        }
      ]
    }
  ],
  "hasInteractions": true_or_false_value,
  "interactionsWarning": "تحذير تفصيلي باللغة العربية في حال وجود تداخل دوائي خطير بين الأدوية المذكورة، أو نصيحة طبية صيدلانية وقائية دافئة"
}

تأكد من صياغة النص باللغة العربية بأسلوب راقٍ ومهني وصيدلاني دقيق.`;

    // Process base64 image if provided
    let contentParts: any[] = [];
    if (imageBase64) {
      // Remove dataurl prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64
        }
      });
    }

    contentParts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentParts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medicines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  substitutes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        priceDiff: { type: Type.STRING },
                        reason: { type: Type.STRING }
                      },
                      required: ["name", "priceDiff", "reason"]
                    }
                  }
                },
                required: ["name", "dosage", "frequency", "substitutes"]
              }
            },
            hasInteractions: { type: Type.BOOLEAN },
            interactionsWarning: { type: Type.STRING }
          },
          required: ["medicines", "hasInteractions", "interactionsWarning"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err) {
    console.error("Gemini OCR extraction failed:", err);
    res.json(fallbackResponse);
  }
});

// -------------------------------------------------------------
// VITE AND STATIC ASSETS HANDLERS
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static files served in production mode from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
