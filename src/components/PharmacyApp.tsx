import React, { useState, useEffect } from "react";
import { 
  Building2, TrendingUp, DollarSign, ClipboardList, Truck, 
  ArrowLeft, Check, X, Eye, Phone, MessageSquare, Star, 
  Settings, Clock, Activity, Users, Percent, ShieldCheck, HelpCircle, MapPin, ChevronRight,
  Cloud, FolderOpen, LogOut, RefreshCw, BarChart3
} from "lucide-react";
import { Order, Bid } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from "recharts";
import { EGYPT_CLASS_A_CITIES } from "../data/egyptCities";
import {
  initAuth,
  googleSignIn,
  logout as googleLogout,
  uploadFileToDrive,
} from "../lib/googleDrive";

interface PharmacyAppProps {
  lang: "ar" | "en";
  setLang: (l: "ar" | "en") => void;
  onBackToHub: () => void;
}

export default function PharmacyApp({ lang, setLang, onBackToHub }: PharmacyAppProps) {
  const isAr = lang === "ar";

  // Navigation State: "login" | "otp" | "dashboard" | "orders" | "details" | "deliveries" | "profile" | "analytics"
  const [currentTab, setCurrentTab] = useState<"login" | "otp" | "dashboard" | "orders" | "details" | "deliveries" | "profile" | "analytics">("login");

  // Registration states
  const [pharmacyInfo, setPharmacyInfo] = useState({
    name: "صيدلية هيلث بلس (HealthPlus)",
    owner: "د. هاني عادل",
    phone: "01005551234",
    address: "123 شارع القصر العيني، القاهرة",
    license: "PH-98745-EGY",
    email: "pharmacy@healthplus.com",
    isOpen: true
  });

  // Interactive dynamic sign-up states
  const [regMode, setRegMode] = useState<"login" | "register">("login");
  const [regName, setRegName] = useState("");
  const [regOwner, setRegOwner] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState(EGYPT_CLASS_A_CITIES[0].id);
  const [regError, setRegError] = useState("");
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Manual Bid input (for manual simulation from pharmacy side!)
  const [bidPrice, setBidPrice] = useState("75");
  const [bidSubs, setBidSubs] = useState("");
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  // Google Drive Cloud Integration States
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleStatusMsg, setGoogleStatusMsg] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Initialize Google Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setGoogleStatusMsg(isAr ? "جاري الاتصال بجوجل..." : "Connecting to Google...");
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setGoogleStatusMsg(isAr ? "تم تسجيل الدخول بنجاح!" : "Logged in successfully!");
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      setGoogleStatusMsg(isAr ? "فشل تسجيل الدخول" : "Google login failed");
    }
  };

  const handleGoogleLogout = async () => {
    const confirmed = window.confirm(
      isAr ? "هل تريد تسجيل الخروج من حساب Google؟" : "Are you sure you want to sign out from your Google account?"
    );
    if (!confirmed) return;
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
      setGoogleStatusMsg("");
    } catch (err) {
      console.error("Google logout failed:", err);
    }
  };

  const handleBackupInventoryToDrive = async () => {
    let activeToken = googleToken;
    if (!activeToken) {
      const connectNow = window.confirm(
        isAr 
          ? "يرجى ربط حساب Google الخاص بك أولاً لتتمكن من حفظ النسخ الاحتياطية. هل تريد الاتصال بجوجل الآن؟" 
          : "Please connect your Google account first to save backups. Do you want to connect to Google now?"
      );
      if (!connectNow) return;
      try {
        setGoogleStatusMsg(isAr ? "جاري الاتصال بجوجل..." : "Connecting to Google...");
        const result = await googleSignIn();
        if (result) {
          setGoogleUser(result.user);
          setGoogleToken(result.accessToken);
          activeToken = result.accessToken;
          setGoogleStatusMsg(isAr ? "تم تسجيل الدخول بنجاح!" : "Logged in successfully!");
        } else {
          return;
        }
      } catch (err) {
        console.error("Google sign in failed:", err);
        alert(isAr ? "فشل ربط الحساب بـ Google" : "Failed to connect Google account");
        return;
      }
    }

    const confirmed = window.confirm(
      isAr 
        ? "هل توافق على تصدير ونسخ تقرير مبيعات ومخزون الأدوية النشط إلى Google Drive؟" 
        : "Do you agree to export and backup the active Sales & Inventory Log report to Google Drive?"
    );
    if (!confirmed) return;

    try {
      setIsBackingUp(true);
      setGoogleStatusMsg(isAr ? "جاري رفع التقرير لجوجل درايف..." : "Uploading report to Google Drive...");

      const content = `=== SWNW PHARMACY SYSTEM REPORT ===
Pharmacy: ${pharmacyInfo.name}
License ID: ${pharmacyInfo.license}
Manager: ${pharmacyInfo.owner}
Date of Export: ${new Date().toLocaleString()}

========================================
Active Orders Handled: ${ordersList.length}
Bids Sent & Pending: ${ordersList.filter(o => o.status === "bidding").length}
Completed Orders: ${ordersList.filter(o => o.status === "delivered").length}
Estimated Revenue: ${ordersList.reduce((sum, o) => {
        if (o.status === "delivered") {
          return sum + o.items.reduce((acc, it) => acc + it.price * it.qty, 0);
        }
        return sum;
      }, 0).toFixed(2)} EGP

========================================
Drug Inventory Status:
- AUGMENTIN 1G: 45 boxes
- CONGESTEAL: 12 boxes
- PANADOL EXTRA: 120 boxes
- ANTINAL: 34 boxes

This report is safely generated and backed up via SWNW Cloud Integration.
`;

      const blob = new Blob([content], { type: "text/plain" });
      const fileName = `swnw-pharmacy-report-${Date.now()}.txt`;

      await uploadFileToDrive(activeToken, fileName, "text/plain", blob);
      alert(isAr ? "تم حفظ نسخة التقرير السحابية بنجاح على Google Drive!" : "Report backup copy successfully saved to Google Drive!");
      setGoogleStatusMsg(isAr ? "تم رفع النسخة الاحتياطية بنجاح!" : "Cloud backup completed successfully!");
    } catch (err) {
      console.error("Failed to backup pharmacy data:", err);
      alert(isAr ? "فشل حفظ الملف على Google Drive" : "Failed to save file to Google Drive");
    } finally {
      setIsBackingUp(false);
    }
  };

  // Fetch orders from server API
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrdersList(data);

      if (selectedOrder) {
        const updated = data.find((o: Order) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error("Error fetching pharmacy orders:", err);
    }
  };

  useEffect(() => {
    if (currentTab !== "login" && currentTab !== "otp") {
      fetchOrders();
      const interval = setInterval(fetchOrders, 2500);
      return () => clearInterval(interval);
    }
  }, [currentTab, selectedOrder?.id]);

  // Poll to check if pharmacy was approved by admin
  const checkApprovalStatus = async () => {
    if (pharmacyInfo.phone || regPhone) {
      const activePhone = regPhone || pharmacyInfo.phone;
      try {
        const res = await fetch("/api/pharmacies");
        const list = await res.json();
        // find current pharmacy by phone
        const found = list.find((p: any) => p.phone === activePhone);
        if (found) {
          if (found.status === "Approved") {
            setIsPendingApproval(false);
            setPharmacyInfo(prev => ({
              ...prev,
              name: found.name,
              owner: found.owner,
              phone: found.phone,
              address: `${isAr ? "التجمع الخامس" : "Fifth Settlement"}، ${found.city}`
            }));
            setCurrentTab("dashboard");
          } else if (found.status === "Suspended") {
            setRegError(isAr ? "تم تعليق حساب هذه الصيدلية من قبل الإدارة العامة!" : "This pharmacy has been suspended by the general administration!");
          }
        }
      } catch (err) {
        console.error("Error checking approval:", err);
      }
    }
  };

  useEffect(() => {
    if (isPendingApproval) {
      const interval = setInterval(checkApprovalStatus, 2500);
      return () => clearInterval(interval);
    }
  }, [isPendingApproval, pharmacyInfo.phone, regPhone]);

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTab("otp");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim() || !regPhone.trim()) {
      setRegError(isAr ? "الرجاء تعبئة كافة الحقول المطلوبة" : "Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("/api/pharmacies/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          owner: regOwner.trim() || "دكتور صيدلي",
          phone: regPhone.trim(),
          city: regCity
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setRegError(errData.error || (isAr ? "فشل التسجيل" : "Registration failed"));
        return;
      }

      const registeredPharm = await res.json();
      setPharmacyInfo(prev => ({
        ...prev,
        name: registeredPharm.name,
        owner: registeredPharm.owner,
        phone: registeredPharm.phone,
        address: `${isAr ? "التجمع الخامس" : "Fifth Settlement"}، ${registeredPharm.city}`
      }));

      // Set pending state to wait for admin approval
      setIsPendingApproval(true);
    } catch (err) {
      console.error("Failed to register pharmacy:", err);
      setRegError(isAr ? "فشل في الاتصال بالخادم الرئيسي" : "Main server connection failed");
    }
  };

  // OTP Verification Simulation
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTab("dashboard");
  };

  // Submit Bid for a client's pending order
  const handleSubmitManualBid = async (orderId: string) => {
    if (!bidPrice.trim()) return;
    setIsSubmittingBid(true);

    try {
      await fetch(`/api/orders/${orderId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyName: pharmacyInfo.name,
          pharmacyRating: 4.8,
          pharmacyDistance: 1.5,
          deliveryTime: 25,
          price: parseFloat(bidPrice),
          substitutesOffered: bidSubs ? [bidSubs] : []
        })
      });

      setBidPrice("75");
      setBidSubs("");
      setIsSubmittingBid(false);
      setSelectedOrder(null);
      setCurrentTab("orders");
      fetchOrders();
    } catch (err) {
      console.error("Error submitting manual bid:", err);
      setIsSubmittingBid(false);
    }
  };

  // Update order delivery/fulfillment status
  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const updated = await res.json();
      setSelectedOrder(updated);
      fetchOrders();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Reject order (Status to cancelled)
  const handleRejectOrder = async (orderId: string) => {
    if (!window.confirm(isAr ? "هل أنت متأكد من رفض وتجاهل هذا الطلب؟" : "Are you sure you want to reject this order?")) return;
    await handleUpdateStatus(orderId, "cancelled");
    setSelectedOrder(null);
    setCurrentTab("orders");
  };

  // Filter calculations for Dashboard Cards (Page 15)
  const pendingOrders = ordersList.filter(o => o.status === "pending" || o.status === "bidding");
  const preparingOrders = ordersList.filter(o => o.status === "preparing" || o.status === "ready");
  const deliveringOrders = ordersList.filter(o => o.status === "delivering");
  const deliveredToday = ordersList.filter(o => o.status === "delivered");

  // Sum total EGP revenue from accepted orders
  const todayRevenue = ordersList
    .filter(o => ["preparing", "ready", "delivering", "delivered"].includes(o.status))
    .reduce((sum, o) => {
      const bid = o.bids.find(b => b.pharmacyName.includes("هيلث") || b.pharmacyId === "ph-1");
      return sum + (bid ? bid.price : 45);
    }, 0);

  // Business Hours lists
  const businessHours = [
    { dayAr: "الاثنين - الجمعة", dayEn: "Monday - Friday", hours: "8:00 AM - 9:00 PM" },
    { dayAr: "السبت", dayEn: "Saturday", hours: "9:00 AM - 6:00 PM" },
    { dayAr: "الأحد", dayEn: "Sunday", hours: "10:00 AM - 4:00 PM" }
  ];

  // Top Customers list (Page 16)
  const topCustomers = [
    { rank: "#1", name: "أحمد محمد", count: "45 طلباً", amount: "1245.00 EGP" },
    { rank: "#2", name: "منى علي", count: "38 طلباً", amount: "1089.00 EGP" },
    { rank: "#3", name: "محمود حسن", count: "32 طلباً", amount: "945.00 EGP" },
    { rank: "#4", name: "سارة ويليامز", count: "28 طلباً", amount: "812.00 EGP" }
  ];

  // --- Pharmacy Analytics Data Prep ---
  const monthlyRevenueData = [
    { month: isAr ? "فبراير" : "Feb", revenue: 8400, orders: 120 },
    { month: isAr ? "مارس" : "Mar", revenue: 9800, orders: 145 },
    { month: isAr ? "أبريل" : "Apr", revenue: 11200, orders: 170 },
    { month: isAr ? "مايو" : "May", revenue: 13500, orders: 198 },
    { month: isAr ? "يونيو" : "Jun", revenue: 15800, orders: 230 },
    { month: isAr ? "يوليو" : "Jul", revenue: 18200, orders: 265 }
  ];

  const getTopSellingMedicines = () => {
    const counts: { [key: string]: { name: string; qty: number; revenue: number } } = {};
    
    // Aggregate from ordersList
    ordersList
      .filter(o => ["preparing", "ready", "delivering", "delivered"].includes(o.status))
      .forEach(order => {
        order.items.forEach(item => {
          const name = item.name.trim();
          if (name) {
            const key = name.toUpperCase();
            if (!counts[key]) {
              counts[key] = { name: item.name, qty: 0, revenue: 0 };
            }
            counts[key].qty += item.qty;
            counts[key].revenue += item.qty * item.price;
          }
        });
      });

    const dynamicData = Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .map(item => ({
        name: item.name,
        qty: item.qty,
        revenue: item.revenue
      }));

    const presetData = [
      { name: "Panadol Extra", qty: 120, revenue: 1800 },
      { name: "Augmentin 1G", qty: 45, revenue: 4275 },
      { name: "Congesteal", qty: 32, revenue: 960 },
      { name: "Antinal", qty: 24, revenue: 624 },
      { name: "Brufen 400", qty: 15, revenue: 375 }
    ];

    if (dynamicData.length === 0) {
      return presetData;
    }

    const blended = [...dynamicData];
    presetData.forEach(p => {
      if (!blended.find(b => b.name.toUpperCase() === p.name.toUpperCase())) {
        blended.push(p);
      }
    });

    return blended.slice(0, 5);
  };

  const topSellingData = getTopSellingMedicines();

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-4 font-sans text-right" dir={isAr ? "rtl" : "ltr"}>
      {/* Simulation Device Frame Wrapper */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative h-[860px]">
        
        {/* TOP STATUS BAR WITH HERO EMERALD GRADIENT */}
        <div className="bg-linear-to-tr from-[#00b0ff] to-[#00c853] text-white p-5 pb-8 relative shrink-0">
          <div className="flex justify-between items-center mb-3">
            <button 
              onClick={onBackToHub}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center cursor-pointer"
              title="العودة للقائمة الرئيسية"
            >
              <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            </button>
            <div className="text-xs font-mono opacity-80 flex items-center gap-1">
              <span>SWNW Partner Hub</span>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            </div>
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-all"
            >
              {isAr ? "English" : "العربية"}
            </button>
          </div>

          {currentTab !== "login" && currentTab !== "otp" && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0288d1] to-[#00c853] text-white flex items-center justify-center shadow-md shrink-0 border border-white/10">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/80">{isAr ? "مرحباً بالدكتور الفاضل شريك الخدمة،" : "Welcome, Esteemed Doctor & Partner,"}</p>
                <h2 className="font-bold text-base line-clamp-1">{pharmacyInfo.name}</h2>
              </div>
            </div>
          )}

          {currentTab === "login" && (
            <div className="text-center py-2">
              <div className="inline-flex w-16 h-16 bg-gradient-to-tr from-[#02a8f4] to-[#00c853] text-white rounded-2xl items-center justify-center shadow-lg border border-white/15 mb-2">
                <Building2 className="w-9 h-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
              </div>
              <h1 className="text-xl font-bold">{isAr ? "بوابة SWNW لشركاء الخدمة والصيدليات" : "SWNW Partner & Pharmacy Portal"}</h1>
              <p className="text-xs opacity-90 mt-1">{isAr ? "منظومة الربط والتسويق الذكي الرائدة لزيادة مبيعاتك وجلب العملاء" : "Leading linking & marketing portal to boost sales & acquire clients"}</p>
            </div>
          )}
        </div>

        {/* MAIN BODY AREA WITH OVERFLOW */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative bg-slate-50">
          
          {/* ======================================================= */}
          {/* 1. LOGIN SCREEN (Page 12 / 13) */}
          {/* ======================================================= */}
          {currentTab === "login" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-[-20px] relative z-10 space-y-4">
              
              {isPendingApproval ? (
                /* PENDING APPROVAL VIEW */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-100">
                    <Clock className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-sm text-slate-800">{isAr ? "بانتظار موافقة الإدارة وتفعيل الاشتراك" : "Awaiting Admin Activation"}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed px-2">
                      {isAr 
                        ? "جاري التحقق من بيانات الصيدلية والتراخيص لتفعيل اشتراككم في بوابة الربط التسويقي من قبل إدارة منصة SWNW."
                        : "Your pharmacy credentials and licensing are being verified to activate your marketing & linkage subscription."}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right space-y-1 text-[11px] font-medium text-slate-600">
                    <p>🏥 <strong>{isAr ? "الصيدلية الشريكة:" : "Partner Store:"}</strong> {pharmacyInfo.name}</p>
                    <p>👤 <strong>{isAr ? "المالك/المدير:" : "Owner/Manager:"}</strong> {pharmacyInfo.owner}</p>
                    <p>📞 <strong>{isAr ? "الهاتف:" : "Phone:"}</strong> {pharmacyInfo.phone}</p>
                  </div>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block font-bold">
                    ● {isAr ? "جاري تفعيل الاشتراك تلقائياً..." : "Activating subscription live..."}
                  </span>
                </div>
              ) : (
                /* DUAL TABS FOR REGISTER & LOGIN */
                <>
                  <div className="flex rounded-lg bg-slate-100 p-1">
                    <button 
                      onClick={() => { setRegMode("login"); setRegError(""); }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                        regMode === "login" ? "bg-white text-gray-800 shadow-3xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {isAr ? "تسجيل دخول الشركاء" : "Partner Login"}
                    </button>
                    <button 
                      onClick={() => { setRegMode("register"); setRegError(""); }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                        regMode === "register" ? "bg-white text-gray-800 shadow-3xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {isAr ? "تسجيل صيدلية جديدة (شريك)" : "Register Partner"}
                    </button>
                  </div>

                  {/* Platform Identity & Business Model Banner */}
                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-right space-y-1.5 text-[11px] text-blue-900 leading-relaxed">
                    <p className="font-bold flex items-center gap-1">
                      <span>💡</span>
                      <span>{isAr ? "نحن بوابة ربط وتسويق مستقلة:" : "Independent Marketing & Linking Portal:"}</span>
                    </p>
                    <p>
                      {isAr 
                        ? "منصة SWNW ليست صيدلية ولا تبيع الأدوية، بل هي حلقة وصل ذكية وبوابة تسويقية تجمعكم بالمرضى. الخدمة مجانية بالكامل للمريض، بينما تعتمد المنصة في أرباحها وتشغيلها على اشتراكات الصيدليات الشريكة التي تمكنكم من تقديم عروض الأسعار للعملاء والحصول على حصة تسويقية وعملاء جدد."
                        : "SWNW is NOT a pharmacy and does not dispense medicine. We are an intermediary technology portal. Our service is completely free for patients; our business model operates strictly on affordable pharmacy partner subscriptions to access client requests and leverage our advanced marketing solutions."}
                    </p>
                  </div>

                  {regError && (
                    <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-100 text-right font-medium">
                      ⚠️ {regError}
                    </div>
                  )}

                  {regMode === "login" ? (
                    /* LOGIN FORM */
                    <form key="pharmacy-login-form" onSubmit={handleLogin} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? "رقم ترخيص صيدلية وزارة الصحة" : "Ministry of Health License No."}</label>
                        <input
                          key="pharmacy-login-license"
                          type="text"
                          required
                          defaultValue={pharmacyInfo.license}
                          className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-mono"
                          placeholder="PH-xxxxx-EGY"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? "البريد الإلكتروني للعمل" : "Business Email"}</label>
                        <input
                          key="pharmacy-login-email"
                          type="email"
                          required
                          defaultValue={pharmacyInfo.email}
                          className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? "كلمة المرور" : "Password"}</label>
                        <input
                          key="pharmacy-login-password"
                          type="password"
                          required
                          defaultValue="pass123"
                          className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-linear-to-r from-emerald-500 to-blue-500 text-white py-3 rounded-xl font-bold shadow-md hover:opacity-95 transition-all cursor-pointer mt-2 text-xs"
                      >
                        {isAr ? "الدخول والتحقق من الهوية" : "Login & Validate Credentials"}
                      </button>
                    </form>
                  ) : (
                    /* REGISTER FORM */
                    <form key="pharmacy-register-form" onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "اسم الصيدلية التجاري" : "Commercial Pharmacy Name"}</label>
                        <input
                          key="pharmacy-register-name"
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-semibold"
                          placeholder={isAr ? "صيدلية أليكس جيت" : "e.g. AlexGate Pharmacy"}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "اسم الدكتور المدير والمالك" : "Owner / Manager Doctor Name"}</label>
                        <input
                          key="pharmacy-register-owner"
                          type="text"
                          required
                          value={regOwner}
                          onChange={(e) => setRegOwner(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50"
                          placeholder={isAr ? "د. مصطفى الشافعي" : "e.g. Dr. Mostafa El-Shafei"}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "رقم الهاتف والخط الساخن بمصر" : "Egypt Pharmacy Phone"}</label>
                        <input
                          key="pharmacy-register-phone"
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-mono font-bold"
                          placeholder="01122233445"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "الموقع الجغرافي للفرع" : "Physical Branch Area"}</label>
                        <select
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-bold"
                        >
                          {EGYPT_CLASS_A_CITIES.map(city => (
                            <option key={city.id} value={city.id}>
                              {isAr ? city.nameAr : city.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#00c853] text-white py-3 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all cursor-pointer mt-2 text-xs"
                      >
                        {isAr ? "إرسال طلب الانضمام والاعتماد" : "Submit Pharmacy Application"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 2. OTP VERIFICATION SCREEN (Page 14) */}
          {/* ======================================================= */}
          {currentTab === "otp" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-[-20px] relative z-10 text-center space-y-5">
              <div>
                <h4 className="font-bold text-sm text-slate-800">{isAr ? "التحقق من الهوية (رمز OTP)" : "Identity Verification (OTP)"}</h4>
                <p className="text-xs text-slate-400 mt-1">{isAr ? "تم إرسال رمز التحقق إلى رقم هاتف الصيدلية المسجل" : "Verification SMS code sent to store number"}</p>
                <p className="text-xs text-slate-700 font-bold font-mono mt-0.5">{pharmacyInfo.phone}</p>
              </div>

              {/* Mock OTP inputs */}
              <div className="flex justify-center gap-1.5" dir="ltr">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    defaultValue={i}
                    className="w-9 h-11 rounded-lg border border-slate-200 text-center font-extrabold text-sm focus:outline-emerald-500 bg-slate-50"
                  />
                ))}
              </div>

              <div className="text-xs text-slate-400">
                <span>{isAr ? "لم تستلم الرمز؟" : "Didn't receive SMS?"} </span>
                <button className="text-emerald-600 font-bold hover:underline">{isAr ? "إعادة الإرسال" : "Resend"}</button>
              </div>

              <button
                onClick={handleVerifyOtp}
                className="w-full bg-[#00c853] text-white py-3 rounded-xl font-bold shadow-md transition-all cursor-pointer text-xs"
              >
                {isAr ? "تأكيد الدخول للوحة التحكم" : "Verify & Open Dashboard"}
              </button>
            </div>
          )}

          {/* ======================================================= */}
          {/* 3. PHARMACY DASHBOARD SCREEN (Page 15) */}
          {/* ======================================================= */}
          {currentTab === "dashboard" && (
            <div className="space-y-4 mt-[-30px]">
              {/* Top Operational Status Toggle */}
              <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-3xs relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${pharmacyInfo.isOpen ? "bg-emerald-500 animate-ping" : "bg-red-500"}`}></div>
                  <span className="text-xs font-bold text-slate-700">
                    {pharmacyInfo.isOpen ? (isAr ? "الصيدلية مفتوحة لاستلام العروض" : "Store Active & Open") : (isAr ? "مغلقة مؤقتاً" : "Closed")}
                  </span>
                </div>
                <button
                  onClick={() => setPharmacyInfo({ ...pharmacyInfo, isOpen: !pharmacyInfo.isOpen })}
                  className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                    pharmacyInfo.isOpen ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  }`}
                >
                  {pharmacyInfo.isOpen ? (isAr ? "إغلاق مؤقت" : "Toggle Closed") : (isAr ? "فتح الصيدلية" : "Toggle Open")}
                </button>
              </div>

              {/* Summary Stats Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200/50">
                  <p className="text-[10px] text-blue-800 font-bold">{isAr ? "المناقصات المعلقة" : "Pending Tenders"}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1 font-mono">{pendingOrders.length}</p>
                  <p className="text-[9px] text-blue-700/80 mt-1 font-semibold">{isAr ? "فرص زيادة المبيعات" : "Active sales opportunities"}</p>
                </div>

                <div className="bg-linear-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200/50">
                  <p className="text-[10px] text-emerald-800 font-bold">{isAr ? "أرباح مبيعات اليوم" : "Today's Revenues"}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1 font-mono">{todayRevenue.toFixed(2)}</p>
                  <p className="text-[9px] text-emerald-700/80 mt-1 font-mono">EGP • {deliveredToday.length} طلبات ناجحة</p>
                </div>
              </div>

              {/* Sub-status shortcuts (Page 15) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentTab("orders")}
                  className="bg-white p-3 rounded-xl border border-slate-100 text-right shadow-3xs flex items-center gap-2.5 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-700">{isAr ? "التحضير والروشتات" : "Preparing Queue"}</h5>
                    <p className="text-[9px] text-slate-400 font-mono">{preparingOrders.length} طلبات جارية</p>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentTab("deliveries")}
                  className="bg-white p-3 rounded-xl border border-slate-100 text-right shadow-3xs flex items-center gap-2.5 hover:border-emerald-200 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-700">{isAr ? "إدارة التوصيل" : "Delivery Drivers"}</h5>
                    <p className="text-[9px] text-slate-400 font-mono">{deliveringOrders.length} في الطريق</p>
                  </div>
                </button>
              </div>

              {/* Top Consumer list (Page 16 requirement) */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>{isAr ? "العملاء الأكثر طلباً هذا الشهر" : "Top Customers This Month"}</span>
                  </h5>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">{isAr ? "نشط" : "Active"}</span>
                </div>

                <div className="space-y-2">
                  {topCustomers.map((cust, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/50">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center font-mono">{cust.rank}</span>
                        <span className="font-bold text-slate-800">{cust.name}</span>
                      </div>
                      <div className="text-left font-mono">
                        <p className="font-bold text-slate-800 text-[10px]">{cust.amount}</p>
                        <p className="text-[9px] text-slate-400">{cust.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 4. ORDERS & PRESCRIPTIONS MANAGEMENT (Page 17 / 18) */}
          {/* ======================================================= */}
          {currentTab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentTab("dashboard")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "طلبيات ومناقصات المرضى" : "Client Prescriptions Queue"}</h3>
              </div>

              {/* Tenders list */}
              <div className="space-y-3">
                {ordersList.map((order) => {
                  const hasMyBid = order.bids.some(b => b.pharmacyId === "ph-1" || b.pharmacyName.includes("هيلث"));
                  return (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold font-mono text-slate-600">{order.id}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === "pending" || order.status === "bidding" ? "bg-amber-100 text-amber-800 animate-pulse" :
                          order.status === "preparing" || order.status === "ready" ? "bg-emerald-100 text-emerald-800" :
                          "bg-slate-100 text-slate-800"
                        }`}>
                          {order.statusAr}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        <p className="font-bold text-slate-800">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{isAr ? "العنوان:" : "Address:"} {order.customerAddress}</p>
                        <p className="text-[10px] font-semibold text-emerald-600">
                          {order.items.map(it => it.name).join(", ") || (isAr ? "روشتة مصورة جديدة" : "New prescription image")}
                        </p>
                      </div>

                      {/* Manual bid status in client/pharmacy list */}
                      {order.status === "pending" || order.status === "bidding" ? (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                          <span className="text-[10px] text-slate-400">
                            {hasMyBid ? (isAr ? "✅ تم تقديم عرضك" : "✅ Bid Submitted") : (isAr ? "بانتظار عرض سعرك" : "Awaiting your bid")}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setCurrentTab("details");
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                          >
                            {isAr ? "عرض التفاصيل وتقديم سعر" : "Review & Submit Quote"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                          <span className="text-[10px] text-slate-400">
                            {order.status === "preparing" ? (isAr ? "جاري التجهيز والتغليف" : "Preparing medications") : (isAr ? "جاهز للتسليم للمندوب" : "Ready for driver")}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setCurrentTab("details");
                            }}
                            className="bg-[#00c853] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                          >
                            {isAr ? "إدارة وتعديل الحالة" : "Manage & Update"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 5. ORDER DETAILS & BID SUBMISSION SCREEN (Page 19 / 20) */}
          {/* ======================================================= */}
          {currentTab === "details" && selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentTab("orders")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <div className="text-right">
                  <h3 className="font-bold text-sm text-slate-800">{isAr ? "تفاصيل الروشتة والحساب" : "Prescription & Order Specs"}</h3>
                  <p className="text-[10px] text-slate-400">كود: {selectedOrder.id}</p>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-2.5 text-xs text-slate-600">
                <h5 className="font-bold text-slate-800 text-[11px] uppercase border-b border-slate-50 pb-1.5">{isAr ? "بيانات المريض:" : "Customer Information:"}</h5>
                <p><span className="text-slate-400">{isAr ? "الاسم:" : "Name:"}</span> <strong className="text-slate-800">{selectedOrder.customerName}</strong></p>
                <p><span className="text-slate-400">{isAr ? "العنوان:" : "Address:"}</span> <strong className="text-slate-800">{selectedOrder.customerAddress}</strong></p>
                {selectedOrder.notes && <p><span className="text-slate-400">{isAr ? "ملاحظات المريض:" : "Customer Notes:"}</span> <strong className="text-slate-800">{selectedOrder.notes}</strong></p>}
              </div>

              {/* Items Table */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-2 text-xs">
                <h5 className="font-bold text-slate-800 text-[11px] uppercase border-b border-slate-50 pb-1.5">{isAr ? "الأدوية المطلوبة بالروشتة:" : "Required Medications:"}</h5>
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-bold text-slate-800">{it.name}</p>
                      <p className="text-[10px] text-slate-400">{isAr ? `الكمية: ${it.qty} علب` : `Qty: ${it.qty} boxes`}</p>
                    </div>
                    <span className="font-bold text-slate-700">{it.price.toFixed(2)} EGP</span>
                  </div>
                ))}
              </div>

              {/* Manual Bidding simulation inputs (Page 20 buttons/actions) */}
              {(selectedOrder.status === "pending" || selectedOrder.status === "bidding") ? (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3.5">
                  <h5 className="font-bold text-emerald-800 text-xs">{isAr ? "💼 تقديم عرض سعر تنافسي (مناقصة):" : "💼 Submit Competitive Price Quote:"}</h5>
                  
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500">{isAr ? "السعر الإجمالي للأدوية بالتوصيل (EGP):" : "Total Bid Price including Delivery (EGP):"}</label>
                    <input
                      type="number"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      className="w-full text-right p-2.5 text-xs rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500">{isAr ? "بدائل دوائية متوفرة لديك لتقليل السعر (اختياري):" : "Generic drug substitutes offered (Optional):"}</label>
                    <input
                      type="text"
                      value={bidSubs}
                      onChange={(e) => setBidSubs(e.target.value)}
                      className="w-full text-right p-2.5 text-xs rounded-lg border border-slate-200 bg-white"
                      placeholder="مثال: أبيمول مسكن بسعر أوفر 30%"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRejectOrder(selectedOrder.id)}
                      className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      {isAr ? "❌ رفض الطلب" : "❌ Reject Order"}
                    </button>
                    <button
                      onClick={() => handleSubmitManualBid(selectedOrder.id)}
                      disabled={isSubmittingBid}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer text-center"
                    >
                      {isSubmittingBid ? (isAr ? "إرسال..." : "Submitting...") : (isAr ? "✅ تقديم عرض السعر" : "✅ Send Bid Price")}
                    </button>
                  </div>
                </div>
              ) : (
                /* Managing Status Timeline triggers (Page 20 Accept/Reject / Prepare) */
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-4">
                  <h5 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">{isAr ? "إجراءات التحكم بالطلبية الجارية:" : "Fulfillment Order Controls:"}</h5>
                  
                  <div className="space-y-2 text-xs">
                    {selectedOrder.status === "preparing" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, "ready")}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold shadow-xs cursor-pointer text-center"
                      >
                        {isAr ? "تجهيز وتغليف الدواء -> جاهز للتسليم" : "Mark Prepared & Ready for Driver"}
                      </button>
                    )}

                    {selectedOrder.status === "ready" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, "delivering")}
                        className="w-full bg-[#00c853] hover:bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-xs cursor-pointer text-center"
                      >
                        {isAr ? "تسليم للمندوب -> جاري التوصيل" : "Handover to Courier -> Out for Delivery"}
                      </button>
                    )}

                    {selectedOrder.status === "delivering" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-bold shadow-xs cursor-pointer text-center"
                      >
                        {isAr ? "تأكيد استلام المريض للأدوية" : "Confirm Delivery Completed"}
                      </button>
                    )}

                    <button
                      onClick={() => handleRejectOrder(selectedOrder.id)}
                      className="w-full bg-red-50 text-red-600 hover:bg-red-100 py-2.5 rounded-lg font-bold cursor-pointer text-center"
                    >
                      {isAr ? "إلغاء الطلبية وتواصل مع الدعم" : "Cancel Order & Contact Support"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 6. DELIVERY MANAGEMENT SYSTEM (Page 21 / 22) */}
          {/* ======================================================= */}
          {currentTab === "deliveries" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentTab("dashboard")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "إدارة وتتبع مناديب التوصيل" : "Micro-Delivery Management"}</h3>
              </div>

              {/* Delivery KPI Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-emerald-600 font-extrabold text-lg font-mono">{deliveringOrders.length}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? "نشط حالياً" : "Active"}</p>
                </div>
                <div>
                  <p className="text-slate-800 font-extrabold text-lg font-mono">{deliveredToday.length}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? "مكتمل اليوم" : "Completed"}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-extrabold text-lg font-mono">{ordersList.length}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? "إجمالي الكلي" : "Total Tasks"}</p>
                </div>
              </div>

              {/* Active deliveries lists */}
              <div className="space-y-3">
                {ordersList.filter(o => ["preparing", "ready", "delivering"].includes(o.status)).map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="font-mono text-slate-700">{order.id}</strong>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{order.statusAr}</span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p><span className="text-slate-400">{isAr ? "العميل:" : "Client:"}</span> <strong className="text-slate-800">{order.customerName}</strong></p>
                      <p className="line-clamp-1"><span className="text-slate-400">{isAr ? "العنوان:" : "Address:"}</span> {order.customerAddress}</p>
                      {order.deliveryPartner && (
                        <p><span className="text-slate-400">{isAr ? "المندوب:" : "Courier:"}</span> <strong className="text-slate-800">{order.deliveryPartner.name}</strong></p>
                      )}
                    </div>

                    {order.deliveryPartner && (
                      <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                        <div className="flex gap-1.5">
                          <a href={`tel:${order.deliveryPartner.phone}`} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all flex items-center justify-center">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <button className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full transition-all flex items-center justify-center">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {order.status === "delivering" && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, "delivered")}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                          >
                            {isAr ? "تأكيد إتمام التوصيل" : "Confirm Completed"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* PHARMACY ANALYTICS & REVENUE TRENDS SCREEN */}
          {/* ======================================================= */}
          {currentTab === "analytics" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setCurrentTab("dashboard")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "التحليلات ومؤشرات الأداء" : "Pharmacy Analytics & KPI"}</h3>
              </div>

              {/* Monthly Revenue summary card */}
              <div className="bg-linear-to-br from-[#00c853]/10 to-white p-4 rounded-xl border border-[#00c853]/20 space-y-3 shadow-3xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{isAr ? "إجمالي إيرادات يوليو" : "July Revenue (Current)"}</span>
                    <h4 className="text-2xl font-black text-slate-800 font-mono mt-0.5">18,200 EGP</h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    {isAr ? "+17.3% مقارنة بيونيو" : "+17.3% vs Jun"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">{isAr ? "الطلبات المكتملة" : "Completed Bids"}</span>
                    <strong className="text-slate-800 font-mono text-xs">265 {isAr ? "طلب" : "orders"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isAr ? "متوسط قيمة الطلب" : "Average Order Value"}</span>
                    <strong className="text-slate-800 font-mono text-xs">68.6 EGP</strong>
                  </div>
                </div>

                {/* Subscriptions ROI Information banner */}
                <div className="bg-emerald-500/5 p-2.5 rounded-lg text-[10px] text-emerald-900 leading-relaxed text-right space-y-1">
                  <p className="font-bold flex items-center gap-1 text-emerald-800">
                    <span>🎯</span>
                    <span>{isAr ? "عائد ممتاز على الاشتراك التسويقي:" : "Marketing Lead Generation ROI:"}</span>
                  </p>
                  <p className="text-slate-600">
                    {isAr
                      ? "بفضل اشتراككم الشريك، قدمتم عروض أسعار جلبت لكم 265 مريضاً هذا الشهر. هذا يعني عائداً استثمارياً يتجاوز 15 ضعف قيمة الاشتراك الشهري، بينما يبقى التطبيق مجانياً بالكامل للمريض!"
                      : "Thanks to your flat partner subscription, you placed bids and connected with 265 patients this month. This yields over 15x ROI compared to your flat monthly fee, keeping patients' service 100% free!"}
                  </p>
                </div>
              </div>

              {/* TOP SELLING MEDICINES CHART */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span>{isAr ? "الأدوية الأكثر طلباً" : "Top Demanded Medicines"}</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">{isAr ? "الوحدات المباعة" : "Units Sold"}</span>
                </div>

                <div className="h-44 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topSellingData}
                      margin={{ top: 5, right: 10, left: -30, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '10px'
                        }}
                        itemStyle={{ color: '#34d399' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Bar dataKey="qty" fill="#10b981" radius={[4, 4, 0, 0]}>
                        {topSellingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#8b5cf6' : '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* MONTHLY REVENUE TRENDS CHART */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span>{isAr ? "نمو الإيرادات الشهرية" : "Monthly Revenue Trends"}</span>
                  </h4>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">EGP</span>
                </div>

                <div className="h-44 w-full text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyRevenueData}
                      margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '10px'
                        }}
                        itemStyle={{ color: '#60a5fa' }}
                        labelStyle={{ fontWeight: 'bold' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5} 
                        dot={{ r: 3.5, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#fff' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 7. PHARMACY PROFILE & HOURS SCREEN (Page 23 / 24) */}
          {/* ======================================================= */}
          {currentTab === "profile" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setCurrentTab("dashboard")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "بيانات الصيدلية ومواعيد العمل" : "Pharmacy Store Profile"}</h3>
              </div>

              {/* Store credentials */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "تفاصيل الصيدلية الرسمية:" : "Official Store Details:"}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "اسم الصيدلية:" : "Pharmacy Name:"}</span>
                    <span className="font-bold text-slate-800">{pharmacyInfo.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "المدير المسؤول:" : "Manager/Owner:"}</span>
                    <span className="font-bold text-slate-800">{pharmacyInfo.owner}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "ترخيص النقابة والوزارة:" : "License ID:"}</span>
                    <span className="font-bold text-slate-800 font-mono">{pharmacyInfo.license}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "الهاتف الأرضي/المحمول:" : "Store Phone:"}</span>
                    <span className="font-bold text-slate-800 font-mono">{pharmacyInfo.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? "موقع الـ GPS الجغرافي:" : "Location Address:"}</span>
                    <span className="font-bold text-slate-800 max-w-[60%] truncate">{pharmacyInfo.address}</span>
                  </div>
                </div>
              </div>

              {/* Business Hours list (Page 23) */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "مواعيد وفترات العمل اليومية:" : "Daily Operating Hours:"}</h4>
                <div className="space-y-2">
                  {businessHours.map((bh, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                      <span className="font-bold text-slate-700">{isAr ? bh.dayAr : bh.dayEn}</span>
                      <span className="font-mono text-slate-500">{bh.hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Settings options */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "إعدادات عامة:" : "General Settings:"}</h4>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span>{isAr ? "إعدادات السداد والعمولات" : "Commission & Payout Accounts"}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 ${isAr ? "rotate-180" : ""}`} />
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span>{isAr ? "المساعدة والدعم الفني القانوني" : "Legal & Regulatory Support Help"}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 ${isAr ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Google Drive Pharmacy Backup Panel */}
              <div className="bg-linear-to-br from-[#4285F4]/10 via-[#34A853]/5 to-white p-4 rounded-xl border border-[#4285F4]/20 space-y-3 shadow-3xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800">
                    <Cloud className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>{isAr ? "النسخ الاحتياطي السحابي (Google Drive)" : "Cloud Backups (Google Drive)"}</span>
                  </div>
                  {googleUser && (
                    <button
                      onClick={handleGoogleLogout}
                      className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{isAr ? "خروج" : "Sign out"}</span>
                    </button>
                  )}
                </div>

                {!googleUser ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 leading-relaxed text-right">
                      {isAr 
                        ? "اربط حساب جوجل الخاص بالصيدلية لتصدير تقارير المبيعات الشهرية وسجلات عروض الأدوية السحابية بضغطة زر." 
                        : "Connect your pharmacy corporate Google account to back up monthly sales reports and active medicine bids."}
                    </p>
                    
                    {/* Google Button */}
                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-lg border border-slate-200 shadow-3xs cursor-pointer transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span>{isAr ? "ربط بـ Google Drive" : "Connect with Google Drive"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-[#4285F4]/10 text-right">
                      <img src={googleUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} className="w-8 h-8 rounded-full border border-blue-200" alt="" />
                      <div className="flex-1 text-right">
                        <h5 className="font-bold text-[10px] text-slate-800">{googleUser.displayName}</h5>
                        <p className="text-[9px] text-slate-400">{googleUser.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleBackupInventoryToDrive}
                      disabled={isBackingUp}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2.5 px-3 rounded-lg shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>{isAr ? "نسخ تقرير المخزون والمبيعات للدرايف" : "Export Sales & Stock Report to Drive"}</span>
                    </button>
                  </div>
                )}

                {googleStatusMsg && (
                  <p className="text-[9px] text-emerald-600 font-bold text-center mt-1">
                    {googleStatusMsg}
                  </p>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  setCurrentTab("login");
                  onBackToHub();
                }}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 py-3 rounded-xl font-bold transition-all text-xs text-center cursor-pointer"
              >
                {isAr ? "تسجيل الخروج من لوحة الصيدلية" : "Log Out Store"}
              </button>
            </div>
          )}

        </div>

        {/* BOTTOM NAV BAR FOR PHARMACY PORTAL */}
        {currentTab !== "login" && currentTab !== "otp" && (
          <div className="bg-white border-t border-slate-100 h-16 shrink-0 flex justify-around items-center text-slate-400">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "dashboard" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الرئيسية" : "Dashboard"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("orders")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "orders" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الطلبيات" : "Orders Queue"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("analytics")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "analytics" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "التحليلات" : "Analytics"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("deliveries")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "deliveries" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <Truck className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "التوصيل" : "Deliveries"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("profile")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "profile" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الإعدادات" : "Store Settings"}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
