import React, { useState, useEffect } from "react";
import { 
  Truck, ArrowLeft, Check, X, Phone, MessageSquare, Star, 
  Settings, Clock, Activity, Users, DollarSign, ShieldCheck, 
  MapPin, ClipboardList, TrendingUp, Navigation, AlertCircle, ChevronRight
} from "lucide-react";
import { Order } from "../types";
import { EGYPT_CLASS_A_CITIES } from "../data/egyptCities";

interface DeliveryAppProps {
  lang: "ar" | "en";
  setLang: (l: "ar" | "en") => void;
  onBackToHub: () => void;
}

export default function DeliveryApp({ lang, setLang, onBackToHub }: DeliveryAppProps) {
  const isAr = lang === "ar";

  // Navigation State: "login" | "otp" | "dashboard" | "tasks" | "my-runs" | "earnings" | "settings"
  const [currentTab, setCurrentTab] = useState<"login" | "otp" | "dashboard" | "tasks" | "my-runs" | "earnings" | "settings">("login");

  // Driver Credentials State
  const [driverInfo, setDriverInfo] = useState({
    name: "كابتن سيف الدين",
    phone: "01158889900",
    vehicle: "سكوتر بينيلي - ج هـ د 4321",
    email: "cap.seif@farmaconnect.com",
    rating: 4.9,
    isOnline: true,
    walletBalance: 420.00
  });

  // Interactive Courier Registration States
  const [regMode, setRegMode] = useState<"login" | "register">("login");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regVehicle, setRegVehicle] = useState("Scooter / موتوسيكل");
  const [regError, setRegError] = useState("");
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch orders from backend to keep synchronicity
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
      console.error("Error fetching courier orders:", err);
    }
  };

  useEffect(() => {
    if (currentTab !== "login" && currentTab !== "otp") {
      fetchOrders();
      const interval = setInterval(fetchOrders, 2500);
      return () => clearInterval(interval);
    }
  }, [currentTab, selectedOrder?.id]);

  // Poll to check if courier was activated by admin
  const checkApprovalStatus = async () => {
    if (driverInfo.phone || regPhone) {
      const activePhone = regPhone || driverInfo.phone;
      try {
        const res = await fetch("/api/couriers");
        const list = await res.json();
        // find courier by phone
        const found = list.find((c: any) => c.phone === activePhone);
        if (found) {
          if (found.status === "Online") {
            setIsPendingApproval(false);
            setDriverInfo(prev => ({
              ...prev,
              name: found.name,
              phone: found.phone,
              vehicle: found.vehicle,
              rating: found.rating
            }));
            setCurrentTab("dashboard");
          } else if (found.status === "Suspended") {
            setRegError(isAr ? "تم تعليق ترخيص هذا المندوب من قبل الإدارة العامة!" : "This courier has been suspended by the general administration!");
          }
        }
      } catch (err) {
        console.error("Error checking courier approval:", err);
      }
    }
  };

  useEffect(() => {
    if (isPendingApproval) {
      const interval = setInterval(checkApprovalStatus, 2500);
      return () => clearInterval(interval);
    }
  }, [isPendingApproval, driverInfo.phone, regPhone]);

  // Login simulations
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTab("otp");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim() || !regPhone.trim()) {
      setRegError(isAr ? "الرجاء كتابة كافة التفاصيل" : "Please enter all required details");
      return;
    }

    try {
      const res = await fetch("/api/couriers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim(),
          vehicle: regVehicle
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setRegError(errData.error || (isAr ? "فشل التسجيل" : "Registration failed"));
        return;
      }

      const registeredCourier = await res.json();
      setDriverInfo(prev => ({
        ...prev,
        name: registeredCourier.name,
        phone: registeredCourier.phone,
        vehicle: registeredCourier.vehicle,
        rating: registeredCourier.rating
      }));

      // Await online status (Admin sets Offline -> Online)
      setIsPendingApproval(true);
    } catch (err) {
      console.error("Failed to register courier:", err);
      setRegError(isAr ? "عذراً، تعذر الاتصال بالخادم الرئيسي" : "Failed to connect to the main server");
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentTab("dashboard");
  };

  // Claim Order (Assign this driver and set status to delivering)
  const handleClaimOrder = async (orderId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: driverInfo.name,
          phone: driverInfo.phone,
          vehicle: driverInfo.vehicle,
          rating: driverInfo.rating
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedOrder(updated);
        fetchOrders();
        setCurrentTab("my-runs");
      }
    } catch (err) {
      console.error("Error claiming order:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mark Delivery Complete
  const handleMarkDelivered = async (orderId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedOrder(null);
        fetchOrders();
        // Add delivery commission to driver wallet
        setDriverInfo(prev => ({
          ...prev,
          walletBalance: prev.walletBalance + 25.00 // 25 EGP delivery fee earned
        }));
        setCurrentTab("dashboard");
      }
    } catch (err) {
      console.error("Error updating order status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter calculations
  const readyOrders = ordersList.filter(o => o.status === "ready");
  const myActiveDeliveries = ordersList.filter(o => 
    o.status === "delivering" && 
    (o.deliveryPartner?.name === driverInfo.name || o.deliveryPartner?.phone === driverInfo.phone)
  );
  const myCompletedDeliveries = ordersList.filter(o => 
    o.status === "delivered" && 
    (o.deliveryPartner?.name === driverInfo.name || o.deliveryPartner?.phone === driverInfo.phone)
  );

  // Earnings calculations
  const totalEarnedToday = myCompletedDeliveries.length * 25.00; // 25 EGP per trip

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-4 font-sans text-right" dir={isAr ? "rtl" : "ltr"}>
      {/* Simulation Device Frame Wrapper */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative h-[860px]">
        
        {/* TOP STATUS BAR WITH COURIER DARK BLUE / BLUE GRADIENT */}
        <div className="bg-linear-to-tr from-[#0288d1] to-[#3f51b5] text-white p-5 pb-8 relative shrink-0">
          <div className="flex justify-between items-center mb-3">
            <button 
              onClick={onBackToHub}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center cursor-pointer"
              title={isAr ? "العودة للقائمة الرئيسية" : "Back to main Gateway Hub"}
            >
              <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            </button>
            
            {/* FC Monogram Logo Header */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
              <span className="font-extrabold text-xs tracking-wider bg-gradient-to-tr from-sky-300 to-emerald-300 bg-clip-text text-transparent">SWNW</span>
              <span className="text-[10px] font-medium opacity-90">{isAr ? "شريك التوصيل" : "Courier Partner"}</span>
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
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0288d1] to-[#3f51b5] text-white flex items-center justify-center shadow-md shrink-0 border border-white/10">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/80">{isAr ? "مرحباً بالكابتن المحترم شريك النجاح،" : "Welcome, Respected Captain & Partner,"}</p>
                <h2 className="font-bold text-base line-clamp-1">{driverInfo.name}</h2>
              </div>
            </div>
          )}

          {currentTab === "login" && (
            <div className="text-center py-2">
              <div className="inline-flex w-16 h-16 bg-gradient-to-tr from-[#0288d1] to-[#3f51b5] text-white rounded-2xl items-center justify-center shadow-lg border border-white/15 mb-2">
                <Truck className="w-9 h-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
              </div>
              <h1 className="text-xl font-extrabold">{isAr ? "بوابة الكابتن المحترم - SWNW" : "SWNW Respected Captain Portal"}</h1>
              <p className="text-xs opacity-90 mt-1">{isAr ? "شريكنا الموقر، نسعد بمرافقتكم لتوصيل الأدوية بأعلى مستويات الأمان والرقي" : "Our dear partner, we are honored to accompany you in delivering healthcare with safety and care"}</p>
            </div>
          )}
        </div>

        {/* MAIN BODY AREA WITH OVERFLOW */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative bg-slate-50">
          
          {/* ======================================================= */}
          {/* 1. LOGIN SCREEN */}
          {/* ======================================================= */}
          {currentTab === "login" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-[-20px] relative z-10 space-y-4">
              
              {isPendingApproval ? (
                /* PENDING APPROVAL VIEW */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 border border-blue-100">
                    <Clock className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-sm text-slate-800">{isAr ? "بانتظار موافقة وتنشيط الإدارة" : "Awaiting Courier Activation"}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed px-2">
                      {isAr 
                        ? "جاري مراجعة رخصة قيادتك وهوية مركبتك من قبل الإدارة العامة لـ SWNW بالقاهرة والمدن الجديدة."
                        : "Our driver operations team is reviewing your vehicle plate and driver license registration."}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-right space-y-1 text-[11px] font-medium text-slate-600">
                    <p>🏍️ <strong>{isAr ? "الاسم:" : "Name:"}</strong> {driverInfo.name}</p>
                    <p>📞 <strong>{isAr ? "رقم الهاتف:" : "Phone:"}</strong> {driverInfo.phone}</p>
                    <p>🛴 <strong>{isAr ? "المركبة:" : "Vehicle:"}</strong> {driverInfo.vehicle}</p>
                  </div>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block font-bold">
                    ● {isAr ? "سيتم تنشيط اللوحة تلقائياً فور موافقة المدير..." : "System will log you in automatically upon admin approval..."}
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
                      {isAr ? "تسجيل دخول" : "Login"}
                    </button>
                    <button 
                      onClick={() => { setRegMode("register"); setRegError(""); }}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                        regMode === "register" ? "bg-white text-gray-800 shadow-3xs" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {isAr ? "تسجيل كابتن جديد" : "Apply to Deliver"}
                    </button>
                  </div>

                  {regError && (
                    <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-100 text-right font-medium">
                      ⚠️ {regError}
                    </div>
                  )}

                  {regMode === "login" ? (
                    /* LOGIN FORM */
                    <form key="delivery-login-form" onSubmit={handleLogin} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? "رقم الهاتف المسجل بمصر" : "Registered Phone Number"}</label>
                        <input
                          key="login-phone-input"
                          type="tel"
                          required
                          defaultValue={driverInfo.phone}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 text-xs focus:outline-blue-500 bg-slate-50 font-mono"
                          placeholder="01158889900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">{isAr ? "رقم لوحة المركبة / رخصة القيادة" : "Vehicle Plate / Driver License"}</label>
                        <input
                          key="login-plate-input"
                          type="text"
                          required
                          defaultValue="ج هـ د 4321"
                          className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-blue-500 bg-slate-50"
                          placeholder="رقم اللوحة المرورية"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:opacity-95 transition-all cursor-pointer mt-2 text-xs text-center"
                      >
                        {isAr ? "أرسل كود التحقق OTP" : "Send Verification OTP"}
                      </button>
                    </form>
                  ) : (
                    /* REGISTER FORM */
                    <form key="delivery-register-form" onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "الاسم بالكامل للكابتن" : "Full Captain Name"}</label>
                        <input
                          key="register-name-input"
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-blue-500 bg-slate-50 font-semibold"
                          placeholder={isAr ? "سيف الدين أحمد" : "e.g. Seif Eldin Ahmed"}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "رقم الهاتف المصري للتواصل" : "Egypt Contact Mobile"}</label>
                        <input
                          key="register-phone-input"
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-blue-500 bg-slate-50 font-mono font-bold"
                          placeholder="01122233445"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-0.5 uppercase">{isAr ? "المركبة وتفاصيل لوحة المرور" : "Vehicle Model & Plate Number"}</label>
                        <input
                          key="register-vehicle-input"
                          type="text"
                          required
                          value={regVehicle}
                          onChange={(e) => setRegVehicle(e.target.value)}
                          className="w-full text-right p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-blue-500 bg-slate-50"
                          placeholder={isAr ? "سكوتر دايو - أ ب ج 987" : "e.g. Dayun Scooter - Plate ABC 987"}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#0288d1] text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-600 transition-all cursor-pointer mt-2 text-xs"
                      >
                        {isAr ? "تقديم طلب الكابتن ومراجعة الأوراق" : "Submit Driver Application"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 2. OTP VERIFICATION */}
          {/* ======================================================= */}
          {currentTab === "otp" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-[-20px] relative z-10 text-center space-y-5">
              <div>
                <h4 className="font-bold text-sm text-slate-800">{isAr ? "رمز التحقق من هوية السائق" : "Verify Driver Identity"}</h4>
                <p className="text-xs text-slate-400 mt-1">{isAr ? "تم إرسال الرمز برسالة SMS لهاتفك لتسجيل الدخول بأمان" : "Verification SMS code sent to your phone"}</p>
                <p className="text-xs text-slate-700 font-bold font-mono mt-0.5">{driverInfo.phone}</p>
              </div>

              {/* Mock OTP inputs */}
              <div className="flex justify-center gap-1.5" dir="ltr">
                {[5, 4, 3, 2, 1, 0].map((v, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    defaultValue={v}
                    className="w-9 h-11 rounded-lg border border-slate-200 text-center font-extrabold text-sm focus:outline-blue-500 bg-slate-50"
                  />
                ))}
              </div>

              <div className="text-xs text-slate-400">
                <span>{isAr ? "لم تستلم الرمز؟" : "Didn't receive SMS?"} </span>
                <button className="text-blue-600 font-bold hover:underline">{isAr ? "إعادة الإرسال" : "Resend"}</button>
              </div>

              <button
                onClick={handleVerifyOtp}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md transition-all cursor-pointer text-xs"
              >
                {isAr ? "تأكيد الدخول لبدء العمل" : "Verify & Start Working"}
              </button>
            </div>
          )}

          {/* ======================================================= */}
          {/* 3. COURIER DASHBOARD */}
          {/* ======================================================= */}
          {currentTab === "dashboard" && (
            <div className="space-y-4 mt-[-30px]">
              {/* Online / Offline Switch */}
              <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-3xs relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${driverInfo.isOnline ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`}></div>
                  <span className="text-xs font-bold text-slate-700">
                    {driverInfo.isOnline ? (isAr ? "الحالة: متصل وتستقبل طلبات" : "Status: Active & Online") : (isAr ? "الحالة: غير متصل" : "Status: Offline")}
                  </span>
                </div>
                <button
                  onClick={() => setDriverInfo({ ...driverInfo, isOnline: !driverInfo.isOnline })}
                  className={`text-xs px-3.5 py-1 rounded-full font-bold transition-all ${
                    driverInfo.isOnline ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  }`}
                >
                  {driverInfo.isOnline ? (isAr ? "إيقاف مؤقت" : "Go Offline") : (isAr ? "تشغيل الاستقبال" : "Go Online")}
                </button>
              </div>

              {/* Courier KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-linear-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200/50">
                  <p className="text-[10px] text-indigo-800 font-bold">{isAr ? "شحنات جاهزة للاستلام" : "Available Tasks"}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1 font-mono">{readyOrders.length}</p>
                  <p className="text-[9px] text-indigo-700/80 mt-1 font-semibold">{isAr ? "اضغط لاستلام وتوصيل شحنة" : "Tap to review & claim"}</p>
                </div>

                <div className="bg-linear-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200/50">
                  <p className="text-[10px] text-emerald-800 font-bold">{isAr ? "أرباحك المحققة اليوم" : "Today's Earnings"}</p>
                  <p className="text-2xl font-black text-slate-800 mt-1 font-mono">{totalEarnedToday.toFixed(2)} EGP</p>
                  <p className="text-[9px] text-emerald-700/80 mt-1 font-mono">{myCompletedDeliveries.length} {isAr ? "رحلات توصيل ناجحة" : "completed deliveries"}</p>
                </div>
              </div>

              {/* Active Delivery Notification (if any) */}
              {myActiveDeliveries.length > 0 ? (
                <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase">
                        {isAr ? "شحنة جارية" : "In Progress"}
                      </span>
                      <h4 className="font-extrabold text-sm mt-1">{isAr ? "لديك شحنة قيد التوصيل" : "Active Delivery Task"}</h4>
                    </div>
                    <Truck className="w-8 h-8 text-white/80" />
                  </div>
                  <p className="text-xs text-white/90">
                    {isAr ? "العميل:" : "Client:"} <strong className="underline">{myActiveDeliveries[0].customerName}</strong>
                  </p>
                  <p className="text-xs text-white/95 line-clamp-1">
                    {isAr ? "العنوان:" : "Address:"} {myActiveDeliveries[0].customerAddress}
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setSelectedOrder(myActiveDeliveries[0]);
                        setCurrentTab("my-runs");
                      }}
                      className="bg-white text-blue-600 px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      {isAr ? "افتح خريطة التوصيل والتأكيد" : "Open Delivery Guide"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/80 p-4 rounded-xl text-center text-xs text-slate-500 border border-slate-200/50">
                  {isAr ? "لا توجد شحنات جارية معك حالياً. تصفح التبويبات بالأسفل للبحث عن طلبات!" : "No active deliveries with you. Browse available tasks below to accept work!"}
                </div>
              )}

              {/* Driver Stats/Metrics Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>{isAr ? "مؤشرات تقييم الكابتن" : "Courier Stats & Performance"}</span>
                </h5>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-400">{isAr ? "التقييم" : "Rating"}</span>
                    <p className="text-sm font-black text-slate-800 mt-0.5 flex items-center justify-center gap-0.5 font-mono">
                      <span>4.9</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-400">{isAr ? "الرحلات" : "Trips"}</span>
                    <p className="text-sm font-black text-slate-800 mt-0.5 font-mono">{150 + myCompletedDeliveries.length}</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-400">{isAr ? "المحفظة" : "Wallet"}</span>
                    <p className="text-xs font-black text-emerald-600 mt-0.5 font-mono">{driverInfo.walletBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 4. AVAILABLE MEDICINE SHIPMENTS (Tasks) */}
          {/* ======================================================= */}
          {currentTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-blue-500" />
                  <span>{isAr ? "شحنات أدوية جاهزة للتوصيل" : "Available Shipments"}</span>
                </h3>
                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-mono">
                  {readyOrders.length} {isAr ? "متاحة" : "ready"}
                </span>
              </div>

              {readyOrders.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-150 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 text-lg">
                    📦
                  </div>
                  <p className="text-xs text-slate-500">{isAr ? "جميع الشحنات تم استلامها وجاري توصيلها!" : "No shipments awaiting pickup right now."}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? "الصيدليات تقوم بتحضير الروشتات حالياً، ستظهر الطلبات تلقائياً فور جاهزيتها." : "Pharmacies are preparing other orders. They will pop up live once ready!"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold font-mono text-slate-500">{order.id}</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px]">
                          {isAr ? "جاهز للتسلم بالصيدلية" : "Ready at Pharmacy"}
                        </span>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-600">
                        <p className="font-semibold text-slate-800">
                          📍 {isAr ? "الجهة الصيدلية:" : "Pharmacy Source:"}{" "}
                          <span className="text-emerald-600 font-bold">
                            {order.bids.find(b => b.id === order.acceptedBidId)?.pharmacyName || "صيدلية هيلث بلس"}
                          </span>
                        </p>
                        <p className="line-clamp-1">
                          🏁 {isAr ? "عنوان تسليم المريض:" : "Patient Drop-off:"} {order.customerAddress}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ⏰ {isAr ? "الزمن الأقصى المتوقع:" : "Expected ETA:"} {order.bids.find(b => b.id === order.acceptedBidId)?.deliveryTime || 25} {isAr ? "دقيقة" : "mins"}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-50 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-slate-400">{isAr ? "عمولة السائق" : "Delivery Fee"}</p>
                          <strong className="text-emerald-600 text-xs font-mono">25.00 EGP</strong>
                        </div>

                        <button
                          onClick={() => handleClaimOrder(order.id)}
                          disabled={isUpdating}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>{isAr ? "قبول وتوصيل الشحنة" : "Claim & Route"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 5. MY ACTIVE RUNS & ROUTE PROGRESS */}
          {/* ======================================================= */}
          {currentTab === "my-runs" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-500" />
                <span>{isAr ? "الرحلات النشطة وتفاصيل الطريق" : "My Active Runs"}</span>
              </h3>

              {myActiveDeliveries.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-150 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 text-lg">
                    🗺️
                  </div>
                  <p className="text-xs text-slate-500">{isAr ? "ليس لديك أي طلبات توصيل جارية الآن." : "No active runs on your route."}</p>
                  <button
                    onClick={() => setCurrentTab("tasks")}
                    className="mt-2 text-xs text-blue-600 font-bold hover:underline"
                  >
                    {isAr ? "تصفح الشحنات المتاحة" : "Browse available shipments"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myActiveDeliveries.map((order) => (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-150 shadow-3xs space-y-4">
                      {/* Order Code */}
                      <div className="flex justify-between items-center text-xs">
                        <strong className="font-mono text-slate-700">{order.id}</strong>
                        <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[10px]">
                          {isAr ? "قيد التوصيل" : "Out for Delivery"}
                        </span>
                      </div>

                      {/* Map Location Simulation widget */}
                      <div className="bg-slate-900 text-white rounded-xl h-44 relative overflow-hidden flex flex-col justify-between p-3.5 font-mono">
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        
                        {/* Simulated Map Pins */}
                        <div className="absolute top-8 right-12 text-center animate-bounce">
                          <span className="text-xl">🏥</span>
                          <p className="text-[8px] bg-slate-800 px-1 py-0.5 rounded">{isAr ? "الصيدلية" : "Pharmacy"}</p>
                        </div>
                        <div className="absolute bottom-6 left-16 text-center animate-pulse">
                          <span className="text-xl">🏠</span>
                          <p className="text-[8px] bg-slate-800 px-1 py-0.5 rounded">{isAr ? "المريض" : "Patient"}</p>
                        </div>

                        {/* Interactive HUD HUD */}
                        <div className="z-10 bg-black/60 p-2 rounded-lg text-[9px] border border-white/10 flex justify-between">
                          <div>
                            <span className="text-emerald-400">● GPS LIVE</span>
                            <p className="text-white/80 mt-0.5">{isAr ? "كاب. سيف الدين في الطريق" : "Driver en route"}</p>
                          </div>
                          <div className="text-left font-bold text-emerald-400">
                            1.2 km • 12 mins
                          </div>
                        </div>

                        <div className="z-10 flex justify-between items-end text-[10px]">
                          <span className="text-white/70">SWNW GPS Companion</span>
                          <span className="bg-emerald-500 text-black px-2 py-0.5 rounded-sm font-bold">100% SECURE</span>
                        </div>
                      </div>

                      {/* Customer Details Box */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-2 text-slate-600">
                        <p className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                          <span>👤 {isAr ? "بيانات المريض والعميل:" : "Client Details:"}</span>
                          <span className="text-blue-600 font-normal font-mono text-[10px]">{order.customerPhone}</span>
                        </p>
                        <p><strong className="text-slate-800">{order.customerName}</strong></p>
                        <p>📍 <span className="font-semibold text-slate-700">{order.customerAddress}</span></p>
                        {order.notes && (
                          <p className="bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-100 text-[11px]">
                            ⚠️ {isAr ? "ملاحظة التوصيل:" : "Notes:"} {order.notes}
                          </p>
                        )}
                      </div>

                      {/* Cash to Collect Widget */}
                      <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 flex justify-between items-center text-xs">
                        <div>
                          <p className="text-emerald-800 font-bold">{isAr ? "المبلغ المطلوب تحصيله (كاش):" : "Cash Amount to Collect (COD):"}</p>
                          <p className="text-[10px] text-slate-400">{isAr ? "شامل قيمة الدواء + التوصيل" : "Includes medication + delivery"}</p>
                        </div>
                        <div className="text-left font-mono">
                          <strong className="text-lg font-black text-emerald-800">
                            {(order.bids.find(b => b.id === order.acceptedBidId)?.price || 75.00) + 15} EGP
                          </strong>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <a 
                          href={`tel:${order.customerPhone}`}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Phone className="w-4 h-4" />
                          <span>{isAr ? "اتصال بالعميل" : "Call Customer"}</span>
                        </a>

                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          disabled={isUpdating}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isAr ? "تم إتمام التوصيل وتحصيل الكاش" : "Confirm Delivered & Collected"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 6. EARNINGS & COMPLETED TASKS HISTORY */}
          {/* ======================================================= */}
          {currentTab === "earnings" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? "تفاصيل الأرباح والمحفظة اليومية" : "Earnings & Wallet"}</span>
              </h3>

              {/* Total Wallet Card */}
              <div className="bg-linear-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-md space-y-2">
                <p className="text-xs opacity-90">{isAr ? "رصيد المحفظة القابل للسحب" : "Withdrawal Balance"}</p>
                <h2 className="text-3xl font-black font-mono">{driverInfo.walletBalance.toFixed(2)} EGP</h2>
                <div className="flex justify-between items-center pt-2 text-[10px] opacity-90 border-t border-white/10">
                  <span>{isAr ? "أرباح توصيل اليوم:" : "Today's Delivery Profit:"}</span>
                  <span className="font-bold">{totalEarnedToday.toFixed(2)} EGP</span>
                </div>
              </div>

              {/* Withdraw Options */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "وسائل سحب الأرباح الفورية:" : "Payout Options:"}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center font-bold border border-slate-200/50 cursor-pointer">
                    💸 {isAr ? "فودافون كاش" : "Vodafone Cash"}
                  </button>
                  <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-center font-bold border border-slate-200/50 cursor-pointer">
                    🏦 {isAr ? "تحويل بنكي فوري" : "Instapay Egypt"}
                  </button>
                </div>
              </div>

              {/* Delivery History list */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "سجل الرحلات اليوم:" : "Today's Trip Logs:"}</h4>
                
                {myCompletedDeliveries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{isAr ? "لا توجد رحلات مكتملة بعد اليوم." : "No completed runs logged today."}</p>
                ) : (
                  <div className="space-y-2">
                    {myCompletedDeliveries.map((order, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                        <div>
                          <p className="font-bold text-slate-800">{order.customerName}</p>
                          <span className="text-[9px] text-slate-400 font-mono">{order.id}</span>
                        </div>
                        <div className="text-left">
                          <strong className="text-emerald-600 font-mono">+25.00 EGP</strong>
                          <p className="text-[9px] text-slate-400">{isAr ? "توصيل ناجح" : "Success"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 7. SETTINGS */}
          {/* ======================================================= */}
          {currentTab === "settings" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>{isAr ? "إعدادات حساب السائق" : "Courier Settings"}</span>
              </h3>

              {/* Official info card */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3 text-xs">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "المستندات والمعلومات الشخصية:" : "Driver Verification Files:"}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "الاسم الرباعي المعتمد:" : "Full Name:"}</span>
                    <strong className="text-slate-800">{driverInfo.name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "رقم الهاتف المحمول:" : "Phone:"}</span>
                    <strong className="text-slate-800 font-mono">{driverInfo.phone}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "المركبة ولوحة الترخيص:" : "Vehicle details:"}</span>
                    <strong className="text-slate-800">{driverInfo.vehicle}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? "رقم الرخصة التجارية:" : "Driver License Code:"}</span>
                    <strong className="text-slate-800 font-mono">DL-49281-CAI</strong>
                  </div>
                </div>
              </div>

              {/* Legal verification badge */}
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 text-xs flex gap-3 items-center">
                <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h5 className="font-bold">{isAr ? "الهوية موثقة رسمياً (FC Secure)" : "Profile Verified (FC Secure)"}</h5>
                  <p className="text-[10px] text-emerald-700/85 mt-0.5">{isAr ? "تم التحقق من رخصة القيادة وصحيفة الحالة الجنائية بشكل سليم للعمل الآمن." : "All background checks and vehicle licenses are verified and compliant."}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  setCurrentTab("login");
                  onBackToHub();
                }}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 py-3 rounded-xl font-bold transition-all text-xs text-center cursor-pointer"
              >
                {isAr ? "تسجيل الخروج وإغلاق الوردية" : "Log Out & End Shift"}
              </button>
            </div>
          )}

        </div>

        {/* BOTTOM NAV BAR FOR COURIER PORTAL */}
        {currentTab !== "login" && currentTab !== "otp" && (
          <div className="bg-white border-t border-slate-100 h-16 shrink-0 flex justify-around items-center text-slate-400">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "dashboard" ? "text-blue-600 font-bold" : "hover:text-slate-600"}`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الرئيسية" : "Dashboard"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("tasks")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "tasks" ? "text-blue-600 font-bold" : "hover:text-slate-600"}`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الطلبات" : "Shipments"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("my-runs")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "my-runs" ? "text-blue-600 font-bold" : "hover:text-slate-600"}`}
            >
              <Navigation className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الطريق" : "My Route"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("earnings")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "earnings" ? "text-blue-600 font-bold" : "hover:text-slate-600"}`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "أرباحي" : "Earnings"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("settings")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "settings" ? "text-blue-600 font-bold" : "hover:text-slate-600"}`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الإعدادات" : "Settings"}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
