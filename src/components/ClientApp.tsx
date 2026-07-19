import React, { useState, useEffect, useRef } from "react";
import { 
  Pill, Upload, History, Compass, User, MapPin, Bell, 
  ChevronRight, ArrowLeft, Trash2, Send, Phone, MessageSquare, 
  Star, ShieldAlert, BadgeCheck, RefreshCw, Layers, CheckCircle2, AlertTriangle, Info,
  Cloud, FolderOpen, LogOut, FileText, Camera, Sparkles
} from "lucide-react";
import { Order, Bid, ChatMessage, MedicineItem } from "../types";
import { EGYPT_CLASS_A_CITIES } from "../data/egyptCities";
import {
  initAuth,
  googleSignIn,
  logout as googleLogout,
  listDriveFiles,
  uploadFileToDrive,
  downloadFileBlob,
  deleteFileFromDrive,
  DriveFile
} from "../lib/googleDrive";

interface ClientAppProps {
  lang: "ar" | "en";
  setLang: (l: "ar" | "en") => void;
  onBackToHub: () => void;
}

// Preset High-Fidelity Prescriptions for easy testing/demo
const PRESCRIPTION_PRESETS = [
  {
    titleAr: "روشتة باطنة ومسكنات (د. مجدي)",
    titleEn: "Internal Medicine & Pain Presc. (Dr. Magdy)",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
    notesAr: "علاج مؤقت لآلام الظهر والتهاب المعدة",
    notesEn: "Temporary treatment for back pain & stomach inflammation",
    items: [
      { name: "Cataflam 50mg (كتافلام مسكن ومضاد للالتهاب)", qty: 1, price: 35.00 },
      { name: "Antodine 20mg (أنتودين للمعدة)", qty: 1, price: 25.00 }
    ],
    ocrDemo: {
      medicines: [
        {
          name: "Cataflam 50mg (كتافلام مسكن)",
          dosage: "50mg ديكلوفيناك البوتاسيوم",
          frequency: "قرص مرتين يومياً بعد الأكل",
          substitutes: [
            { name: "Declophen 50mg (ديكلوفين)", priceDiff: "-50%", reason: "بديل محلي مكافئ تماماً ويحتوي على نفس المادة الفعالة بسعر أوفر" },
            { name: "Adolor 50mg (أدولور)", priceDiff: "-30%", reason: "بديل مصري معتمد ذو كفاءة مماثلة وموفر للميزانية" }
          ]
        },
        {
          name: "Antodine 20mg (أنتودين للمعدة)",
          dosage: "20mg فاموتيدين",
          frequency: "قرص قبل النوم لحماية جدار المعدة",
          substitutes: [
            { name: "Famotidine 20mg (فاموتيدين)", priceDiff: "-65%", reason: "البديل الاقتصادي الخام وبنفس الفعالية العلاجية" }
          ]
        }
      ],
      hasInteractions: true,
      interactionsWarning: "تنبيه طبي: كتافلام (مسكن NSAID) قد يزيد من حساسية المعدة، ولذلك تم إدراج أنتودين كحماية. تجنب استخدامهما على معدة فارغة تماماً."
    }
  },
  {
    titleAr: "روشتة التهاب لوز وحرارة (د. سارة)",
    titleEn: "Tonsillitis & Fever Presc. (Dr. Sara)",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600",
    notesAr: "مضاد حيوي وخافض حرارة للأعراض الحادة",
    notesEn: "Antibiotic & antipyretic for acute throat symptoms",
    items: [
      { name: "Augmentin 1g (أوجمنتين مضاد حيوي)", qty: 1, price: 65.00 },
      { name: "Paracetamol 500mg (باراسيتامول خافض للحرارة)", qty: 1, price: 20.00 }
    ],
    ocrDemo: {
      medicines: [
        {
          name: "Augmentin 1g (أوجمنتين)",
          dosage: "1g أموكسيسيلين / كلافولانيك أسيد",
          frequency: "قرص كل 12 ساعة بعد الطعام لمدة 7 أيام",
          substitutes: [
            { name: "Curam 1g (كيورام مضاد حيوي)", priceDiff: "-20%", reason: "بديل ممتاز معتمد طبيعياً بنفس التركيز والدقة الفعالة" },
            { name: "Megamox 1g (ميجاموكس)", priceDiff: "-35%", reason: "خيار بديل متوفر بكثرة في الصيدليات بسعر اقتصادي" }
          ]
        },
        {
          name: "Paracetamol 500mg (باراسيتامول)",
          dosage: "500mg باراسيتامول نقي",
          frequency: "قرص عند اللزوم بحد أقصى 4 مرات يومياً",
          substitutes: [
            { name: "Abimol 500mg (أبيمول)", priceDiff: "-45%", reason: "بديل مصري نقي عالي الجودة وموفر للغاية" }
          ]
        }
      ],
      hasInteractions: false,
      interactionsWarning: "لا توجد تفاعلات عكسية مسجلة بين الباراسيتامول وأوجمنتين. احرص على شرب كميات كافية من الماء طوال اليوم."
    }
  }
];

export default function ClientApp({ lang, setLang, onBackToHub }: ClientAppProps) {
  const isAr = lang === "ar";

  // Navigation State: "login" | "home" | "upload" | "bids" | "history" | "tracking" | "chat" | "profile"
  const [currentTab, setCurrentTab] = useState<"login" | "home" | "upload" | "bids" | "history" | "tracking" | "chat" | "profile">("login");

  // Authentication State
  const [user, setUser] = useState({
    name: "أحمد محمد",
    email: "ahmed.doe@email.com",
    phone: "01023456789",
    address: "التجمع الخامس، القاهرة الجديدة"
  });

  // Egypt-optimized authentication
  const [loginPhone, setLoginPhone] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpName, setSignUpName] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpCity, setSignUpCity] = useState(EGYPT_CLASS_A_CITIES[0].id);
  const [signUpAddress, setSignUpAddress] = useState("");
  const [authError, setAuthError] = useState("");

  // Main Orders & Bidding State
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Google Drive Cloud States
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [googleStatusMsg, setGoogleStatusMsg] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Google Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        fetchDriveFiles(token);
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
        fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error("Google login failed:", err);
      setGoogleStatusMsg(isAr ? "فشل تسجيل الدخول بـ Google" : "Google login failed");
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
      setDriveFiles([]);
      setGoogleStatusMsg("");
    } catch (err) {
      console.error("Google logout failed:", err);
    }
  };

  const fetchDriveFiles = async (token: string) => {
    try {
      setIsFetchingDrive(true);
      const files = await listDriveFiles(token);
      setDriveFiles(files);
    } catch (err) {
      console.error("Error loading drive files:", err);
    } finally {
      setIsFetchingDrive(false);
    }
  };

  // Import a file from Google Drive and simulate OCR extraction
  const handleImportDriveFile = async (file: DriveFile) => {
    if (!googleToken) return;
    
    const confirmed = window.confirm(
      isAr 
        ? `هل تريد استيراد الروشتة من الملف: "${file.name}"؟` 
        : `Do you want to import prescription items from file: "${file.name}"?`
    );
    if (!confirmed) return;

    try {
      setIsUploading(true);
      setShowDrivePicker(false);
      
      // Simulate file download
      await downloadFileBlob(googleToken, file.id);

      // Simulate parsing of medicines based on file name or length
      setTimeout(() => {
        const presetIndex = file.name.length % PRESCRIPTION_PRESETS.length;
        const preset = PRESCRIPTION_PRESETS[presetIndex];
        
        setOcrResult(preset.ocrDemo);
        setManualItems(preset.items);
        setIsUploading(false);
        setGoogleStatusMsg(
          isAr 
            ? `تم استيراد وقراءة الروشتة من Google Drive: "${file.name}"` 
            : `Prescription successfully imported from Google Drive: "${file.name}"`
        );
      }, 1500);

    } catch (err) {
      console.error("Failed to import Google Drive file:", err);
      alert(isAr ? "فشل استيراد الملف من جوجل درايف" : "Failed to import file from Google Drive");
      setIsUploading(false);
    }
  };

  // Back up any custom or preset order receipt/history to Google Drive
  const handleBackupReceiptToDrive = async (order: Order) => {
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
          fetchDriveFiles(result.accessToken);
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
        ? `هل تريد نسخ الفاتورة للطلب رقم ${order.id} إلى حساب Google Drive الخاص بك؟` 
        : `Do you want to save a backup of Invoice #${order.id} to your Google Drive?`
    );
    if (!confirmed) return;

    try {
      setIsBackingUp(true);
      
      const totalVal = (order.items.reduce((sum, item) => sum + item.price * item.qty, 0) + (order.acceptedBidId ? 15 : 0)).toFixed(2);
      
      const content = `=== SWNW HEALTHCARE DIGITAL INVOICE ===
Order Receipt ID: ${order.id}
Date: ${new Date(order.timestamp).toLocaleString()}
Client: ${user.name}
Phone: ${user.phone}
Address: ${user.address}

Items Dispensed:
${order.items.map((it, i) => `- ${it.name} [${it.qty} Qty] @ ${it.price} EGP`).join("\n")}

Delivery Charge: ${order.acceptedBidId ? "15.00 EGP" : "0.00 EGP"}
--------------------------------------
TOTAL PAID: ${totalVal} EGP

Status: DELIVERED (SUCCESS)
Saved via SWNW Medicine Delivery Platform Cloud System.
Thank you for using our services!`;

      const blob = new Blob([content], { type: "text/plain" });
      const fileName = `swnw-invoice-${order.id}.txt`;

      await uploadFileToDrive(activeToken, fileName, "text/plain", blob);
      
      alert(isAr ? "تم نسخ وحفظ الفاتورة بنجاح في Google Drive!" : "Invoice backup copy successfully saved to Google Drive!");
      fetchDriveFiles(activeToken);
    } catch (err) {
      console.error("Failed to backup invoice:", err);
      alert(isAr ? "فشل حفظ الملف على Google Drive" : "Failed to save file to Google Drive");
    } finally {
      setIsBackingUp(false);
    }
  };
  
  // OCR Scan State
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [manualNote, setManualNote] = useState("");
  const [customMedName, setCustomMedName] = useState("");
  const [manualItems, setManualItems] = useState<{name: string, qty: number, price: number}[]>([]);

  // Interactive prescription upload modes
  const [uploadMode, setUploadMode] = useState<"select" | "camera" | "file" | "scan">("select");
  const [shareChronicConditions, setShareChronicConditions] = useState<boolean>(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Scan progress animation
  useEffect(() => {
    let interval: any;
    if (uploadMode === "scan") {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              const randomPreset = PRESCRIPTION_PRESETS[Math.floor(Math.random() * PRESCRIPTION_PRESETS.length)];
              setOcrResult(randomPreset.ocrDemo);
              setManualItems(randomPreset.items);
              setUploadMode("select");
            }, 600);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [uploadMode]);

  // Simulated Camera Capture trigger
  const handleCameraCapture = () => {
    setIsUploading(true);
    setTimeout(() => {
      const randomPreset = PRESCRIPTION_PRESETS[Math.floor(Math.random() * PRESCRIPTION_PRESETS.length)];
      setOcrResult(randomPreset.ocrDemo);
      setManualItems(randomPreset.items);
      setIsUploading(false);
      setUploadMode("select");
    }, 1500);
  };

  // Simulated Device file selection
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadProgress(0);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setUploadProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const randomPreset = PRESCRIPTION_PRESETS[Math.floor(Math.random() * PRESCRIPTION_PRESETS.length)];
          setOcrResult(randomPreset.ocrDemo);
          setManualItems(randomPreset.items);
          setUploadMode("select");
          setUploadedFileName(null);
          setUploadProgress(0);
        }, 500);
      }
    }, 150);
  };

  // Chronic Conditions (Page 10 mockup requirement)
  const [chronicConditions, setChronicConditions] = useState([
    { id: 1, nameAr: "السكري من النوع الثاني", nameEn: "Diabetes Type 2", since: "2020" },
    { id: 2, nameAr: "ارتفاع ضغط الدم المستمر", nameEn: "Hypertension", since: "2018" }
  ]);
  const [newConditionName, setNewConditionName] = useState("");
  const [newConditionSince, setNewConditionSince] = useState("2026");

  // Load and sync database from Express Server API
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrdersList(data);

      // Keep tracking order updated in realtime if selected
      if (selectedOrder) {
        const updated = data.find((o: Order) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      const data = await res.json();
      setChatMessages(data);
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  // Poll database every 2.5 seconds to feel live synchronized (especially helpful when pharmacy actions happen!)
  useEffect(() => {
    if (currentTab !== "login") {
      fetchOrders();
      fetchChats();
      const interval = setInterval(() => {
        fetchOrders();
        fetchChats();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [currentTab, selectedOrder?.id]);

  // Handle Login & Signup with Egyptian phone validation
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    // Clean space and validate
    const cleanPhone = loginPhone.replace(/\s+/g, "");
    const phonePattern = /^0?1[0125]\d{8}$/;
    if (!phonePattern.test(cleanPhone)) {
      setAuthError(isAr 
        ? "رقم هاتف مصري غير صحيح! يجب أن يتكون من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015" 
        : "Invalid Egyptian phone number! Must be 11 digits and start with 010, 011, 012, or 015");
      return;
    }

    setUser(prev => ({
      ...prev,
      phone: cleanPhone.startsWith("0") ? cleanPhone : "0" + cleanPhone
    }));
    setCurrentTab("home");
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!signUpName.trim()) {
      setAuthError(isAr ? "الرجاء إدخال الاسم بالكامل" : "Please enter your full name");
      return;
    }

    const cleanPhone = signUpPhone.replace(/\s+/g, "");
    const phonePattern = /^0?1[0125]\d{8}$/;
    if (!phonePattern.test(cleanPhone)) {
      setAuthError(isAr 
        ? "رقم هاتف مصري غير صحيح! يجب أن يتكون من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015" 
        : "Invalid Egyptian phone number! Must be 11 digits and start with 010, 011, 012, or 015");
      return;
    }

    const cityObj = EGYPT_CLASS_A_CITIES.find(c => c.id === signUpCity);
    const fullAddress = `${signUpAddress.trim() || "التجمع الخامس"}، ${cityObj ? (isAr ? cityObj.nameAr : cityObj.nameEn) : signUpCity}`;

    // Save and sign up user
    setUser({
      name: signUpName.trim(),
      email: `${cleanPhone}@farmaconnect.com`,
      phone: cleanPhone.startsWith("0") ? cleanPhone : "0" + cleanPhone,
      address: fullAddress
    });

    setCurrentTab("home");
  };

  // Create Order from Preset or OCR
  const handleSelectPreset = (preset: typeof PRESCRIPTION_PRESETS[0]) => {
    setIsUploading(true);
    setTimeout(() => {
      setOcrResult(preset.ocrDemo);
      setManualItems(preset.items);
      setIsUploading(false);
    }, 1500);
  };

  // Submit OCR Prescription Order to Server
  const handleSubmitTender = async () => {
    const finalItems = ocrResult?.medicines?.map((m: any) => ({
      name: m.name,
      qty: 1,
      price: m.name.toLowerCase().includes("panadol") ? 22 : 45
    })) || manualItems;

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: user.name,
          customerPhone: user.phone,
          customerAddress: user.address,
          prescriptionImage: ocrResult ? "image_captured_sample" : null,
          notes: manualNote,
          items: finalItems,
          chronicConditions: shareChronicConditions ? chronicConditions.map(c => isAr ? c.nameAr : c.nameEn) : []
        })
      });

      const newOrder = await res.json();
      setSelectedOrder(newOrder);
      
      // Clean OCR states
      setOcrResult(null);
      setManualNote("");
      setManualItems([]);
      
      // Shift tab to bidding view
      setCurrentTab("bids");
    } catch (err) {
      console.error("Failed to submit tender:", err);
    }
  };

  // Manual Medicine Name Add
  const handleAddManualMed = () => {
    if (!customMedName.trim()) return;
    setManualItems([
      ...manualItems,
      { name: customMedName.trim(), qty: 1, price: 30.00 }
    ]);
    setCustomMedName("");
  };

  const handleRemoveManualItem = (idx: number) => {
    setManualItems(manualItems.filter((_, i) => i !== idx));
  };

  // Accept a Specific Pharmacy Bid
  const handleAcceptBid = async (orderId: string, bidId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId })
      });
      const updatedOrder = await res.json();
      setSelectedOrder(updatedOrder);
      setCurrentTab("tracking");
    } catch (err) {
      console.error("Error accepting bid:", err);
    }
  };

  // Reorder a past transaction
  const handleReorder = async (pastOrder: Order) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: user.name,
          customerPhone: user.phone,
          customerAddress: user.address,
          notes: `إعادة طلب مكرر لـ: ${pastOrder.id}`,
          items: pastOrder.items
        })
      });
      const newOrder = await res.json();
      setSelectedOrder(newOrder);
      setCurrentTab("bids");
    } catch (err) {
      console.error("Error trigger reorder:", err);
    }
  };

  // Add Chronic Condition (Page 10)
  const handleAddCondition = () => {
    if (!newConditionName.trim()) return;
    setChronicConditions([
      ...chronicConditions,
      {
        id: Date.now(),
        nameAr: newConditionName,
        nameEn: newConditionName,
        since: newConditionSince
      }
    ]);
    setNewConditionName("");
  };

  const handleDeleteCondition = (id: number) => {
    setChronicConditions(chronicConditions.filter(c => c.id !== id));
  };

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    try {
      await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "customer",
          text: typedMessage.trim()
        })
      });
      setTypedMessage("");
      fetchChats();
    } catch (err) {
      console.error("Failed to send chat msg:", err);
    }
  };

  // Find active orders for quick status cards
  const activeOrder = ordersList.find(o => ["pending", "bidding", "preparing", "ready", "delivering"].includes(o.status));

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-4 font-sans text-right" dir={isAr ? "rtl" : "ltr"}>
      {/* Simulation Device Frame Wrapper */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative h-[860px]">
        
        {/* TOP STATUS BAR WITH HERO GRADIENT */}
        <div className="bg-linear-to-tr from-[#0288d1] to-[#00c853] text-white p-5 pb-8 relative shrink-0">
          <div className="flex justify-between items-center mb-3">
            <button 
              onClick={onBackToHub}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center cursor-pointer"
              title="العودة للقائمة الرئيسية"
            >
              <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            </button>
            <div className="text-xs font-mono opacity-80 flex items-center gap-1">
              <span>SWNW Client Link</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-all"
            >
              {isAr ? "English" : "العربية"}
            </button>
          </div>

          {currentTab !== "login" && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0288d1] to-[#00c853] text-white flex items-center justify-center shadow-md shrink-0 border border-white/10">
                <Pill className="w-6 h-6 -rotate-45" />
              </div>
              <div>
                <p className="text-xs text-white/80">{isAr ? "أهلاً بك يا فندم، نسعد بخدمتك ورعايتك" : "Welcome, we are honored to serve and care for you,"}</p>
                <h2 className="font-bold text-lg">{user.name}</h2>
              </div>
            </div>
          )}

          {currentTab === "login" && (
            <div className="text-center py-2">
              <div className="inline-flex w-16 h-16 bg-gradient-to-tr from-[#0288d1] to-[#00c853] text-white rounded-2xl items-center justify-center shadow-lg border border-white/15 mb-2">
                <Pill className="w-9 h-9 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] -rotate-45" />
              </div>
              <h1 className="text-xl font-bold">{isAr ? "منصة SWNW لربط المرضى بالصيدليات" : "SWNW Patient-Pharmacy Connection Portal"}</h1>
              <p className="text-xs opacity-90 mt-1">{isAr ? "ارفع طلبك مجاناً للحصول على أفضل الأسعار والعروض التنافسية" : "Submit requests for free to compare competitive pharmacy bids"}</p>
            </div>
          )}
        </div>

        {/* MAIN BODY AREA WITH OVERFLOW */}
        <div className="flex-1 overflow-y-auto px-4 py-4 relative bg-slate-50">
          
          {/* ======================================================= */}
          {/* 1. LOGIN / SIGNUP SCREEN */}
          {/* ======================================================= */}
          {currentTab === "login" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mt-[-20px] relative z-10 space-y-4">
              
              {/* Patient Free Service Info Banner */}
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-right space-y-1 text-[11px] text-emerald-900 leading-relaxed">
                <p className="font-bold">
                  {isAr ? "🎁 الخدمة مجانية بالكامل للمريض:" : "🎁 100% Free Service for Patients:"}
                </p>
                <p>
                  {isAr 
                    ? "منصة SWNW ليست صيدلية وإنما هي منظومة تكنولوجية مستقلة لربط المرضى بالصيدليات مجاناً. نحن لا نفرض أي رسوم على العميل، بل نوفر له أفضل العروض والأسعار من الصيدليات المعتمدة مجاناً!"
                    : "SWNW is an independent technology platform linking you to verified pharmacies for free. We never charge you any fees; instead, pharmacies subscribe to our platform to provide you with competitive, money-saving bids!"}
                </p>
              </div>

              {/* Tab selector */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button 
                  onClick={() => { setIsSignUpMode(false); setAuthError(""); }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                    !isSignUpMode ? "bg-white text-gray-800 shadow-3xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {isAr ? "تسجيل دخول" : "Login"}
                </button>
                <button 
                  onClick={() => { setIsSignUpMode(true); setAuthError(""); }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
                    isSignUpMode ? "bg-white text-gray-800 shadow-3xs" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {isAr ? "إنشاء حساب جديد" : "Sign Up"}
                </button>
              </div>

              {authError && (
                <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-100 text-right font-medium">
                  ⚠️ {authError}
                </div>
              )}

              {!isSignUpMode ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1.5 uppercase">
                      {isAr ? "رقم الهاتف المحمول بمصر" : "Egypt Mobile Phone"}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full text-right p-3 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-emerald-500 bg-slate-50 font-semibold"
                        placeholder="01012345678"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-4" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {isAr 
                        ? "أدخل رقمك المسجل للمتابعة الفورية" 
                        : "Enter your registered 11-digit mobile number"}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#00c853] to-[#0288d1] text-white py-3.5 rounded-xl font-bold shadow-md hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer mt-2"
                  >
                    {isAr ? "تسجيل الدخول والتفعيل" : "Login & Authorize"}
                  </button>
                </form>
              ) : (
                /* SIGNUP FORM */
                <form onSubmit={handleSignUp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase">
                      {isAr ? "الاسم الكامل للمريض/العميل" : "Patient's Full Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-medium"
                      placeholder={isAr ? "أحمد مصطفى كامل" : "e.g. Ahmed Mostafa"}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase">
                      {isAr ? "رقم الهاتف المصري (تفعيل فوري)" : "Egy Phone (Instant OTP)"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-mono font-bold"
                      placeholder="01009998877"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase">
                      {isAr ? "المنطقة / المدينة السكنية المغطاة" : "Covered Area / Residential District"}
                    </label>
                    <select
                      value={signUpCity}
                      onChange={(e) => setSignUpCity(e.target.value)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-semibold"
                    >
                      {EGYPT_CLASS_A_CITIES.map(city => (
                        <option key={city.id} value={city.id}>
                          {isAr ? city.nameAr : city.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 mb-1 uppercase">
                      {isAr ? "العنوان بالتفصيل ورقم المبنى" : "Street Address & Building No."}
                    </label>
                    <input
                      type="text"
                      required
                      value={signUpAddress}
                      onChange={(e) => setSignUpAddress(e.target.value)}
                      className="w-full text-right p-3 rounded-xl border border-slate-200 text-xs focus:outline-emerald-500 bg-slate-50 font-medium"
                      placeholder={isAr ? "مثال: فيلا 14، الياسمين 3، أمام المدرسة" : "e.g. Villa 14, Al-Yasmin 3"}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#00c853] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-all cursor-pointer mt-3"
                  >
                    {isAr ? "إنشاء حساب وبدء التنافس" : "Register & Start Bidding"}
                  </button>
                </form>
              )}

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400">
                  {isAr 
                    ? "بالمتابعة، أنت توافق على شروط الاستخدام وقوانين وزارة الصحة المصرية." 
                    : "By joining, you agree to SWNW terms & Egyptian MoH regulations."}
                </p>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 2. HOME SCREEN (Page 5) */}
          {/* ======================================================= */}
          {currentTab === "home" && (
            <div className="space-y-4 mt-[-30px]">
              {/* Delivery Location Card */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-semibold">{isAr ? "التوصيل إلى:" : "Delivery to:"}</p>
                    <p className="text-xs font-bold text-gray-700 line-clamp-1">{user.address}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentTab("profile")}
                  className="text-xs text-blue-600 font-bold hover:underline shrink-0"
                >
                  {isAr ? "تغيير" : "Change"}
                </button>
              </div>

              {/* Upload Prescription Call To Action */}
              <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-emerald-500" />
                  {isAr ? "طلب سريع بـ الروشتة أو أسماء الأدوية" : "Quick Medicine Order / Prescription"}
                </h3>

                <button
                  onClick={() => setCurrentTab("upload")}
                  className="w-full bg-[#00c853] hover:bg-[#00b0ff] text-white py-3.5 px-4 rounded-xl font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 animate-bounce" />
                  <span>{isAr ? "رفع روشتة طبية أو كتابة أسماء" : "Upload Prescription or Write Names"}</span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  {isAr 
                    ? "سيقوم الذكي OCR بقراءة الروشتة واقتراح البدائل وفحص تفاعلات الأدوية فوراً!" 
                    : "Smart OCR automatically reads drug names, flags interaction risks & suggests substitutes!"}
                </p>
              </div>

              {/* Active Tracking Status Container */}
              {activeOrder ? (
                <div className="bg-linear-to-r from-blue-50 to-emerald-50 border border-blue-100 p-4 rounded-xl shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="bg-emerald-500 text-white text-[10px] px-2.5 py-1 rounded-full font-bold animate-pulse">
                      {isAr ? "طلب نشط حالياً" : "Active Order"}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-600">{activeOrder.id}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <p className="text-slate-500">{isAr ? "الحالة الحالية:" : "Status:"}</p>
                    <p className="font-bold text-emerald-700">{activeOrder.statusAr}</p>
                  </div>

                  {activeOrder.deliveryPartner && (
                    <div className="bg-white/80 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                          {activeOrder.deliveryPartner.avatar}
                        </div>
                        <div>
                          <p className="font-bold">{activeOrder.deliveryPartner.name}</p>
                          <p className="text-[10px] text-slate-400">★ {activeOrder.deliveryPartner.rating} ({activeOrder.deliveryPartner.deliveries} توصيلة)</p>
                        </div>
                      </div>
                      <span className="text-emerald-600 font-bold">{activeOrder.deliveryPartner.eta}</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedOrder(activeOrder);
                      setCurrentTab(activeOrder.status === "bidding" ? "bids" : "tracking");
                    }}
                    className="w-full bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    {isAr ? "تتبع طلبي وتفاصيل العروض" : "Track Order & View Bids"}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100/50 rounded-xl p-4 text-center border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">{isAr ? "لا توجد طلبيات جارية حالياً." : "No active orders running right now."}</p>
                </div>
              )}

              {/* Action grid (Page 5 shortcuts) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCurrentTab("history")}
                  className="bg-white p-4 rounded-xl border border-slate-100 text-right shadow-2xs hover:border-emerald-200 transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{isAr ? "سجل الروشتات" : "Prescription History"}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{isAr ? "الطلبات السابقة والفواتير" : "Past orders & invoices"}</p>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentTab("chat")}
                  className="bg-white p-4 rounded-xl border border-slate-100 text-right shadow-2xs hover:border-emerald-200 transition-all cursor-pointer flex flex-col justify-between h-24"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{isAr ? "استشارة صيدلي" : "Consult a Pharmacist"}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{isAr ? "دردشة آمنة مع صيدلي" : "Safe chat with pharmacist"}</p>
                  </div>
                </button>
              </div>

              {/* Quick Health Tip / Regulatory info */}
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/80 text-right flex gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-700 leading-relaxed">
                  {isAr 
                    ? "قانون مهنة الصيدلة المصري: لا يتم تداول الأدوية الخاضعة للرقابة أو الجدول إلا بتقديم الروشتة الورقية الأصلية للصيدلي عند الاستلام والتحقق منها."
                    : "Egyptian Pharmacy Law: Controlled substances are only dispensed upon presenting the physical prescription hardcopy to the pharmacist on delivery."}
                </p>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 3. UPLOAD PRESCRIPTION & SMART OCR SCREEN (Page 5 / OCR Flow) */}
          {/* ======================================================= */}
          {currentTab === "upload" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setCurrentTab("home")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "تقديم طلب دواء ذكي" : "Submit Smart Medicine Order"}</h3>
              </div>

              {/* Google Drive Integration Panel */}
              <div className="bg-linear-to-br from-[#4285F4]/10 via-[#34A853]/5 to-white p-4 rounded-xl border border-[#4285F4]/20 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800">
                    <Cloud className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>{isAr ? "سحابة جوجل درايف" : "Google Drive Cloud Integration"}</span>
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
                        ? "قم بتوصيل حساب جوجل الخاص بك للوصول المباشر إلى الروشتات، صور الأدوية، وحفظ فواتيرك الطبية بأمان سحابي." 
                        : "Connect your Google account to access prescriptions, medicine scans, and securely back up your medical invoices."}
                    </p>
                    
                    {/* Google Brand Button */}
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
                      <span>{isAr ? "ربط الحساب بـ Google" : "Connect with Google"}</span>
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

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setShowDrivePicker(true);
                          if (googleToken) fetchDriveFiles(googleToken);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-3xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{isAr ? "استيراد من Drive" : "Import from Drive"}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (manualItems.length === 0) {
                            alert(isAr ? "يرجى إضافة دواء أو اختيار روشتة أولاً لحفظ نسختها الاحتياطية!" : "Please add a drug or select a preset first to backup!");
                            return;
                          }
                          handleBackupReceiptToDrive({
                            id: `T-${Math.floor(100000 + Math.random() * 900000)}`,
                            customerName: user.name,
                            customerPhone: user.phone,
                            customerAddress: user.address,
                            items: manualItems,
                            status: "bidding",
                            statusAr: "بانتظار العروض",
                            timestamp: new Date().toISOString()
                          } as any);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-3xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>{isAr ? "نسخة بالدرايف" : "Backup current"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {googleStatusMsg && (
                  <p className="text-[9px] text-emerald-600 font-bold text-center mt-1">
                    {googleStatusMsg}
                  </p>
                )}
              </div>

              {/* Google Drive File Picker Modal */}
              {showDrivePicker && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-slate-100 shadow-xl space-y-4 text-right">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <button 
                        onClick={() => setShowDrivePicker(false)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-blue-600" />
                        <span>{isAr ? "اختر روشتة من Google Drive" : "Select Prescription from Google Drive"}</span>
                      </h4>
                    </div>

                    {isFetchingDrive ? (
                      <div className="py-8 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                        <p className="text-[10px] text-slate-400">{isAr ? "جاري تحميل الملفات..." : "Loading files from Drive..."}</p>
                      </div>
                    ) : driveFiles.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-xs text-slate-400">{isAr ? "لم نجد أي صور أو ملفات PDF في الـ Drive الخاص بك." : "No prescription images or PDFs found in your Drive."}</p>
                        
                        {/* Option to create a trial preset file on Drive for testing */}
                        <button
                          onClick={async () => {
                            const confirmed = window.confirm(
                              isAr 
                                ? "هل تريد إنشاء ملف روشتة تجريبي في حساب جوجل درايف الخاص بك لاختبار خاصية الاستيراد؟" 
                                : "Do you want to create a demo prescription text file on your Google Drive to test importing?"
                            );
                            if (!confirmed) return;
                            try {
                              setIsFetchingDrive(true);
                              const content = "AUGMENTIN 1G - 1 Qty\nPARACETAMOL 500MG - 2 Qty\n";
                              const blob = new Blob([content], { type: "text/plain" });
                              await uploadFileToDrive(googleToken!, "demo-swnw-prescription.txt", "text/plain", blob);
                              alert(isAr ? "تم إنشاء الملف التجريبي! جاري إعادة التحميل..." : "Demo file created! Reloading...");
                              if (googleToken) fetchDriveFiles(googleToken);
                            } catch (e) {
                              console.error(e);
                              alert("Failed to create trial file");
                            } finally {
                              setIsFetchingDrive(false);
                            }
                          }}
                          className="mx-auto bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-blue-200 cursor-pointer block"
                        >
                          {isAr ? "➕ إنشاء روشتة تجريبية بالـ Drive للتجربة" : "➕ Create Demo prescription in Drive"}
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {driveFiles.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => handleImportDriveFile(file)}
                            className="w-full text-right bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all flex items-center gap-2.5 cursor-pointer"
                          >
                            {file.thumbnailLink ? (
                              <img src={file.thumbnailLink} className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 text-right">
                              <h5 className="font-bold text-[10px] text-slate-800 truncate">{file.name}</h5>
                              <p className="text-[8px] text-slate-400 mt-0.5">{file.mimeType.split("/")[1]?.toUpperCase() || "FILE"}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!ocrResult && (
                <>
                  {/* Smart Prescription Capture Panel */}
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-4 text-right">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span>{isAr ? "📸 خيارات رفع الروشتة الذكية" : "📸 Smart Prescription Options"}</span>
                      <span className="text-[9px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full uppercase">{isAr ? "فوري" : "Instant"}</span>
                    </h4>

                    {uploadMode === "select" && (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => setUploadMode("camera")}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all cursor-pointer space-y-1.5"
                        >
                          <Camera className="w-5 h-5 text-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-700">{isAr ? "تصوير الروشتة" : "Take Photo"}</span>
                        </button>
                        <button
                          onClick={() => setUploadMode("file")}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 transition-all cursor-pointer space-y-1.5"
                        >
                          <Upload className="w-5 h-5 text-blue-500" />
                          <span className="text-[10px] font-bold text-slate-700">{isAr ? "استيراد ملف" : "Import File"}</span>
                        </button>
                        <button
                          onClick={() => setUploadMode("scan")}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-violet-300 hover:bg-violet-50/20 transition-all cursor-pointer space-y-1.5"
                        >
                          <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-slate-700">{isAr ? "عمل سكان" : "Laser Scan"}</span>
                        </button>
                      </div>
                    )}

                    {/* Camera Mode View */}
                    {uploadMode === "camera" && (
                      <div className="space-y-3">
                        <div className="bg-slate-900 rounded-xl aspect-4/3 relative overflow-hidden flex flex-col justify-between p-3 border border-slate-800">
                          <div className="flex justify-between items-center z-10">
                            <span className="text-[9px] text-white/80 bg-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              {isAr ? "مباشر" : "LIVE"}
                            </span>
                            <span className="text-[9px] text-white/60 font-mono">1080p 60fps</span>
                          </div>
                          
                          {/* Crosshair Viewfinder */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-45">
                            <div className="w-48 h-48 border-2 border-dashed border-white rounded-lg flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                          </div>

                          <div className="text-center text-[10px] text-white/90 bg-slate-950/70 p-2 rounded-lg mx-auto z-10 w-fit backdrop-blur-xs">
                            {isAr ? "ضع الروشتة في الإطار لقرائتها بالذكاء الاصطناعي" : "Align prescription in frame for AI OCR read"}
                          </div>

                          {/* Shutter button controls */}
                          <div className="flex justify-between items-center px-4 z-10">
                            <button 
                              onClick={() => setUploadMode("select")} 
                              className="bg-white/25 hover:bg-white/40 text-white rounded-full p-2 text-xs font-bold transition-all"
                            >
                              {isAr ? "إلغاء" : "Back"}
                            </button>
                            <button
                              onClick={handleCameraCapture}
                              className="w-14 h-14 rounded-full bg-white border-4 border-slate-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#00c853]"></div>
                            </button>
                            <div className="w-8"></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Local File Upload Mode */}
                    {uploadMode === "file" && (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 rounded-xl p-6 text-center transition-all relative">
                          <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={handleLocalFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                          <h5 className="text-xs font-bold text-slate-800">{isAr ? "اسحب الملف هنا أو انقر للاختيار" : "Drag and drop file here or click to browse"}</h5>
                          <p className="text-[10px] text-slate-400 mt-1">{isAr ? "يدعم صور الروشتات أو مستندات PDF" : "Supports prescription images or PDF docs"}</p>
                        </div>

                        {uploadedFileName && (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-slate-800 truncate flex-1 text-right">{uploadedFileName}</span>
                              <span className="text-blue-600 font-bold ml-2 shrink-0">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => setUploadMode("select")} 
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs py-2 rounded-lg font-bold transition-all text-center"
                        >
                          {isAr ? "رجوع" : "Back"}
                        </button>
                      </div>
                    )}

                    {/* Document Laser Scanner Mode */}
                    {uploadMode === "scan" && (
                      <div className="space-y-3">
                        <div className="bg-slate-900 rounded-xl aspect-4/3 relative overflow-hidden flex flex-col justify-between p-3 border border-slate-800">
                          {/* Faux medical prescription background document image */}
                          <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center"></div>
                          
                          {/* Laser Green Beam Animation */}
                          <div 
                            className="absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] z-10"
                            style={{
                              animation: "scanBeam 2s infinite ease-in-out"
                            }}
                          ></div>
                          <style>{`
                            @keyframes scanBeam {
                              0% { top: 0%; }
                              50% { top: 100%; }
                              100% { top: 0%; }
                            }
                          `}</style>

                          <div className="flex justify-between items-center z-10 text-white">
                            <span className="text-[10px] font-bold text-emerald-400">{isAr ? "جاري المسح الضوئي بالليزر..." : "Laser Document Scanning..."}</span>
                            <span className="text-[10px] font-mono text-emerald-400">{scanProgress}%</span>
                          </div>

                          <div className="z-10 bg-slate-950/80 p-3 rounded-lg text-center text-xs text-white max-w-xs mx-auto">
                            {isAr ? "يقوم الذكي باستخراج الأدوية وفحص التداخلات الطبية وتحديد الكلمات..." : "Smart AI is reading medications, checking interactions & mapping content..."}
                          </div>

                          <button 
                            onClick={() => setUploadMode("select")} 
                            className="w-fit bg-white/20 hover:bg-white/40 text-white text-[10px] py-1 px-3 rounded-md font-bold transition-all z-10 self-center"
                          >
                            {isAr ? "إيقاف مؤقت" : "Stop"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-linear-to-br from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-100 text-right space-y-2">
                    <h4 className="font-bold text-xs text-emerald-800">{isAr ? "💡 جرب قوة الـ OCR والذكاء الاصطناعي" : "💡 Try AI-powered OCR Analysis"}</h4>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                      {isAr 
                        ? "اختر إحدى الروشتات التجريبية الجاهزة أدناه لمحاكاة عملية مسح الروشتة بالذكاء الاصطناعي (Gemini 3.5 Flash)، وسيقوم فوراً باستخراج الأدوية وفحص التفاعلات واقتراح البدائل الأرخص!" 
                        : "Select one of the sample prescription presets below to simulate high-tech AI image reading. It extracts items, warns of interactions, and suggests cheaper Egyptian alternatives!"}
                    </p>
                  </div>

                  {/* Prescription Presets Selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 px-1">{isAr ? "روشتات جاهزة للاختبار السريع:" : "Preset samples for quick testing:"}</p>
                    {PRESCRIPTION_PRESETS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectPreset(p)}
                        className="w-full text-right bg-white p-3 rounded-xl border border-slate-100 hover:border-emerald-300 transition-all shadow-2xs flex items-center gap-3 cursor-pointer"
                      >
                        <img src={p.image} className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0" alt="" />
                        <div className="flex-1 text-right">
                          <h5 className="font-bold text-xs text-slate-800">{isAr ? p.titleAr : p.titleEn}</h5>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{isAr ? p.notesAr : p.notesEn}</p>
                        </div>
                        <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Manual Medicine Names Writing Container */}
                  <div className="bg-white p-4 rounded-xl shadow-2xs border border-slate-100 space-y-3">
                    <label className="block text-xs font-bold text-slate-600">{isAr ? "أو اكتب أسماء الأدوية يدوياً:" : "Or type medicine names manually:"}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customMedName}
                        onChange={(e) => setCustomMedName(e.target.value)}
                        className="flex-1 text-right p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-emerald-500 bg-slate-50"
                        placeholder="مثال: Panadol Extra"
                      />
                      <button
                        onClick={handleAddManualMed}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                      >
                        {isAr ? "إضافة" : "Add"}
                      </button>
                    </div>

                    {/* Manual List */}
                    {manualItems.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        {manualItems.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="font-semibold">{it.name}</span>
                            <button onClick={() => handleRemoveManualItem(idx)} className="text-red-500 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Chronic Conditions Safety Toggle Panel */}
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-3 text-right">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] font-bold uppercase">{isAr ? "الأمان والسلامة الدوائية" : "Health & Safety Check"}</span>
                      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-black">
                        <span>🛡️</span>
                        <span>{isAr ? "ذكي" : "Smart Safety"}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                      <input 
                        type="checkbox" 
                        id="share-chronic"
                        checked={shareChronicConditions}
                        onChange={(e) => setShareChronicConditions(e.target.checked)}
                        className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="share-chronic" className="text-xs font-bold text-slate-700 leading-normal cursor-pointer flex-1">
                        {isAr 
                          ? "مشاركة أمراضي المزمنة مع الصيدليات تلقائياً" 
                          : "Automatically share my chronic conditions with pharmacies"}
                        <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
                          {isAr 
                            ? "تنبيه الصيدليات بوجود (سكري، ضغط دم) لضمان عدم حدوث تعارضات دوائية مميتة أو آثار جانبية خطيرة للروشتة."
                            : "Alerts pharmacists about your (Diabetes, Hypertension) to ensure zero toxic interactions or side effects."}
                        </span>
                      </label>
                    </div>

                    {shareChronicConditions && (
                      <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-600 space-y-1.5 border border-slate-100">
                        <p className="font-bold text-slate-700">{isAr ? "الأمراض المزمنة التي سيتم مشاركتها:" : "Chronic conditions to be shared:"}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {chronicConditions.map((c) => (
                            <span key={c.id} className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md">
                              ● {isAr ? c.nameAr : c.nameEn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                    <label className="block text-xs font-bold text-slate-600">{isAr ? "ملاحظات إضافية للصيدلي:" : "Additional Notes for Pharmacy:"}</label>
                    <textarea
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      rows={2}
                      className="w-full text-right p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-emerald-500 bg-slate-50"
                      placeholder={isAr ? "مثال: يرجى كتابة الأسعار بدقة، أحتاج بدائل مصرية متوفرة" : "e.g., please offer alternatives if brand is out"}
                    ></textarea>
                  </div>

                  <button
                    onClick={handleSubmitTender}
                    disabled={manualItems.length === 0}
                    className="w-full bg-[#00c853] hover:bg-[#00c853]/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-md cursor-pointer text-center"
                  >
                    {isAr ? "إرسال المناقصة للصيدليات" : "Publish Tender to Pharmacies"}
                  </button>
                </>
              )}

              {/* OCR Scanning Loader */}
              {isUploading && (
                <div className="bg-white p-12 rounded-2xl text-center space-y-4 border border-slate-100 shadow-xs">
                  <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                  <h4 className="font-bold text-slate-800 text-sm">{isAr ? "جاري قراءة الروشتة بالذكاء الاصطناعي..." : "AI Reading Prescription..."}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr ? "يقوم نموذج Gemini 3.5 Flash بمسح الصورة واستخراج الأدوية وفحص التداخلات الطبية حالياً." : "Gemini 3.5 Flash is extracting chemical names, checking warnings & searching alternatives."}
                  </p>
                </div>
              )}

              {/* OCR Results & Safety Check Visualizer */}
              {ocrResult && !isUploading && (
                <div className="space-y-4">
                  {/* Interaction Alerts Box */}
                  <div className={`p-4 rounded-xl border ${ocrResult.hasInteractions ? "bg-red-50 border-red-100 text-red-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"} text-right space-y-1.5`}>
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {ocrResult.hasInteractions ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <BadgeCheck className="w-4 h-4 text-emerald-500" />}
                      <span>{ocrResult.hasInteractions ? (isAr ? "تحذير من تداخل دوائي خطير!" : "Drug Interaction Warning!") : (isAr ? "مراجعة سلامة الأدوية آمنة" : "Drug Interaction Check Clean")}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{ocrResult.interactionsWarning}</p>
                  </div>

                  {/* Extracted medicines and substitutes suggestions */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 px-1">{isAr ? "الأدوية المستخرجة وبدائلها المقترحة:" : "Extracted Drugs & Suggested Substitutes:"}</p>
                    {ocrResult.medicines.map((m: any, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                        <div className="border-r-4 border-emerald-500 pr-2">
                          <h4 className="font-bold text-xs text-slate-800">{m.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{m.dosage} • {m.frequency}</p>
                        </div>

                        {/* Substitutes panel */}
                        {m.substitutes && m.substitutes.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded-lg space-y-2 border border-slate-100">
                            <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>{isAr ? "بدائل مصرية متوفرة توفر في الميزانية:" : "Lower Cost Egyptian Substitutes:"}</span>
                            </p>
                            {m.substitutes.map((sub: any, sIdx: number) => (
                              <div key={sIdx} className="text-[10px] text-slate-700 flex justify-between gap-2 border-b border-slate-200/50 pb-1.5 last:border-0 last:pb-0">
                                <div className="text-right flex-1">
                                  <span className="font-bold text-emerald-700">{sub.name}</span>
                                  <span className="text-slate-400 block mt-0.5 leading-normal">{sub.reason}</span>
                                </div>
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md h-fit text-[9px]">{sub.priceDiff}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-600">{isAr ? "ملاحظة للصيدلي:" : "Pharmacist notes:"}</p>
                    <textarea
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      rows={2}
                      className="w-full text-right p-2.5 text-xs rounded-lg border border-slate-100 focus:outline-emerald-500 bg-slate-50"
                      placeholder={isAr ? "مثال: يرجى تزويدي بالبدائل الأرخص المقترحة عند إرسال العرض" : "e.g., provide Abimol substitute instead of Panadol"}
                    ></textarea>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setOcrResult(null)}
                      className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all hover:bg-slate-300 cursor-pointer text-center"
                    >
                      {isAr ? "مسح وإعادة" : "Reset & Clear"}
                    </button>
                    <button
                      onClick={handleSubmitTender}
                      className="flex-1 bg-[#00c853] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md hover:bg-emerald-600 cursor-pointer text-center"
                    >
                      {isAr ? "إرسال المناقصة الآن" : "Publish Tender"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 4. BIDS & PROPOSAL COMPARISON SCREEN (Bids Portal) */}
          {/* ======================================================= */}
          {currentTab === "bids" && selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentTab("home")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <div className="text-right">
                  <h3 className="font-bold text-sm text-slate-800">{isAr ? "مناقصات الصيدليات المنافسة" : "Competitive Pharmacy Bids"}</h3>
                  <p className="text-[10px] text-slate-400">طلب رقم: {selectedOrder.id}</p>
                </div>
              </div>

              {/* Bidding pending loader */}
              {selectedOrder.status === "pending" && (
                <div className="bg-white p-8 rounded-2xl text-center space-y-4 border border-slate-100 shadow-2xs">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      ⏱️
                    </div>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">{isAr ? "بانتظار عروض الصيدليات المحيطة..." : "Studying prescription items..."}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr 
                      ? "تم إرسال روشتتك إلى أقرب 10 صيدليات في نطاق 5 كم. تدرس الصيدليات الروشتة حالياً لتقديم عروض الأسعار التنافسية وبدائل الدواء المتوفرة." 
                      : "Sent to nearest 10 licensed pharmacies within 5 km. They are reviewing inventory to quote prices & substitutes."}
                  </p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full animate-[progress_4s_ease-in-out_infinite]" style={{ width: "60%" }}></div>
                  </div>
                </div>
              )}

              {/* Displaying Tenders and Smart Sorting */}
              {selectedOrder.status !== "pending" && (
                <div className="space-y-3">
                  <div className="bg-slate-100 p-3 rounded-lg text-right text-[10px] text-slate-500 leading-relaxed flex gap-1.5 items-center">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>
                      {isAr 
                        ? "خوارزمية الفرز الذكي: نرتب العروض حسب السعر الأوفر (40%) + تقييم الصيدلية (30%) + قرب المسافة (20%) + سرعة التوصيل المتوقعة (10%)."
                        : "Smart Rank algorithm calculates: Price (40%) + Rating (30%) + Proximity (20%) + Speed (10%) to find the best match."}
                    </span>
                  </div>

                  {selectedOrder.bids.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl text-center border text-slate-400 text-xs">
                      {isAr ? "لا توجد عروض أسعار مقدمة حالياً." : "No quotes submitted yet."}
                    </div>
                  ) : (
                    selectedOrder.bids.map((b, bIdx) => (
                      <div key={b.id} className="bg-white rounded-xl shadow-3xs border border-slate-100 overflow-hidden relative">
                        {/* Smart Score Stamp badge */}
                        <div className="absolute left-0 top-0 bg-linear-to-r from-emerald-500 to-blue-500 text-white font-bold text-[10px] px-3 py-1 rounded-br-xl shadow-xs">
                          {isAr ? `تطابق ذكي: ${b.score}%` : `Smart Score: ${b.score}%`}
                        </div>

                        <div className="p-4 pt-7 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="text-right">
                              <h4 className="font-bold text-xs text-slate-800">{b.pharmacyName}</h4>
                              <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-0.5">
                                <Star className="w-3 h-3 fill-current" />
                                <span>{b.pharmacyRating}</span>
                                <span className="text-slate-400">• {b.pharmacyDistance} كم • {b.deliveryTime} دقيقة توصيل</span>
                              </div>
                            </div>
                          </div>

                          {/* Bid Substitutes Offered if any */}
                          {b.substitutesOffered.length > 0 && (
                            <div className="bg-emerald-50 text-emerald-800 text-[10px] p-2 rounded-md font-semibold">
                              💡 {isAr ? "بدائل معروضة توفر ميزانية:" : "Lower-price substitutes offered:"} {b.substitutesOffered.join(", ")}
                            </div>
                          )}

                          {/* Dynamic visual score breakdown */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-[9px] text-slate-400 text-center">
                            <div>
                              <p className="font-bold text-slate-600">{b.scoreBreakdown.priceScore}/40</p>
                              <p>{isAr ? "السعر" : "Price"}</p>
                            </div>
                            <div>
                              <p className="font-bold text-slate-600">{b.scoreBreakdown.ratingScore}/30</p>
                              <p>{isAr ? "التقييم" : "Rating"}</p>
                            </div>
                            <div>
                              <p className="font-bold text-slate-600">{b.scoreBreakdown.distanceScore}/20</p>
                              <p>{isAr ? "المسافة" : "Distance"}</p>
                            </div>
                            <div>
                              <p className="font-bold text-slate-600">{b.scoreBreakdown.speedScore}/10</p>
                              <p>{isAr ? "السرعة" : "Speed"}</p>
                            </div>
                          </div>

                          {/* Price and Choose CTA */}
                          <div className="flex justify-between items-center pt-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block">{isAr ? "القيمة الإجمالية:" : "Total Price:"}</span>
                              <span className="font-extrabold text-sm text-slate-800">{b.price.toFixed(2)} EGP</span>
                            </div>
                            <button
                              onClick={() => handleAcceptBid(selectedOrder.id, b.id)}
                              className="bg-[#00c853] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
                            >
                              {isAr ? "قبول وتأكيد العرض" : "Accept & Confirm"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* 5. TRACK ACTIVE ORDER & LIVE TIMELINE (Page 8 / 9) */}
          {/* ======================================================= */}
          {currentTab === "tracking" && selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentTab("home")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <div className="text-right">
                  <h3 className="font-bold text-sm text-slate-800">{isAr ? "تتبع طلبيتك حياً" : "Live Tracking Dashboard"}</h3>
                  <p className="text-[10px] text-slate-400">كود الطلبية: {selectedOrder.id}</p>
                </div>
              </div>

              {/* Status Header card */}
              <div className="bg-linear-to-r from-blue-600 to-emerald-500 p-4 rounded-xl text-white space-y-2 text-right">
                <p className="text-xs opacity-90">{isAr ? "الحالة الحالية للشحنة:" : "Current Shipment Status:"}</p>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-bounce" />
                  <span>{selectedOrder.statusAr}</span>
                </h4>
                <div className="pt-2 border-t border-white/20 text-xs flex justify-between">
                  <span>{isAr ? "وقت الوصول المقدر:" : "Estimated Arrival:"}</span>
                  <span className="font-bold">{selectedOrder.deliveryPartner?.eta || "15-20 دقيقة"}</span>
                </div>
              </div>

              {/* Interactive Timeline progress */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-4">
                <h5 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">{isAr ? "سير العمل والمراحل الزمنية:" : "Workflow & Delivery Milestones:"}</h5>
                <div className="relative border-r-2 border-slate-200 mr-3 pr-4 space-y-5 py-1">
                  {selectedOrder.timeline.map((item, idx) => (
                    <div key={idx} className="relative flex justify-between items-start text-xs gap-3">
                      {/* Active green dot or grey dot */}
                      <div className={`absolute -right-[23px] top-1 w-3 h-3 rounded-full border-2 bg-white ${item.completed ? "border-emerald-500 bg-emerald-500 scale-125" : "border-slate-300"}`}></div>
                      
                      <div className="text-right">
                        <p className={`font-bold ${item.completed ? "text-slate-800" : "text-slate-400"}`}>{item.statusAr}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{item.completed ? `${isAr ? "مكتملة" : "Completed"}` : `${isAr ? "قريباً" : "Pending"}`}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Driver Section */}
              {selectedOrder.deliveryPartner && (
                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                  <h5 className="font-bold text-slate-800 text-xs">{isAr ? "شريك التوصيل:" : "Delivery Partner:"}</h5>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {selectedOrder.deliveryPartner.avatar}
                      </div>
                      <div className="text-right">
                        <h4 className="font-bold text-xs text-slate-800">{selectedOrder.deliveryPartner.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{selectedOrder.deliveryPartner.rating} ({selectedOrder.deliveryPartner.deliveries} توصيلة)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <a
                        href={`tel:${selectedOrder.deliveryPartner.phone}`}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition-all"
                        title="اتصال هاتفي"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setCurrentTab("chat")}
                        className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all"
                        title="إرسال رسالة"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                <h5 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-2">{isAr ? "تفاصيل الحساب والفاتورة:" : "Payment Summary:"}</h5>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>{isAr ? "تكلفة الأدوية:" : "Medicines Cost:"}</span>
                    <span className="font-mono text-slate-700">{selectedOrder.items.reduce((sum, i) => sum + i.price * i.qty, 0).toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? "رسوم التوصيل:" : "Delivery Fee:"}</span>
                    <span className="font-mono text-slate-700">{selectedOrder.deliveryFee.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-800 text-sm">
                    <span>{isAr ? "المبلغ الإجمالي الكلي:" : "Total Amount:"}</span>
                    <span className="font-mono text-emerald-600">{(selectedOrder.items.reduce((sum, i) => sum + i.price * i.qty, 0) + selectedOrder.deliveryFee).toFixed(2)} EGP</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-400 mt-2 flex justify-between items-center">
                  <span>{isAr ? "طريقة الدفع المختارة:" : "Payment Method:"}</span>
                  <span className="font-bold text-slate-700">{isAr ? "💳 الدفع نقداً عند الاستلام" : "💳 Cash on Delivery"}</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 6. ORDER HISTORY (Page 6 / 7) */}
          {/* ======================================================= */}
          {currentTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setCurrentTab("home")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "سجل الروشتات والطلبيات السابقة" : "Prescription & Order History"}</h3>
              </div>

              {/* List of past transactions */}
              <div className="space-y-3">
                {ordersList.map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold font-mono text-slate-600">{order.id}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        order.status === "delivered" ? "bg-emerald-100 text-emerald-800" :
                        order.status === "cancelled" ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {order.statusAr}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600">
                      <p className="font-bold text-slate-800">
                        {order.items.map(it => `${it.name} (${it.qty} علبة)`).join(" + ") || `${isAr ? "روشتة مصورة" : "Scanned prescription"}`}
                      </p>
                      <p className="text-[10px] text-slate-400">{new Date(order.timestamp).toLocaleString("ar-EG")}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{isAr ? "القيمة الكلية المكتملة:" : "Total Price:"}</span>
                        <span className="font-mono font-bold text-slate-800">
                          {(order.items.reduce((sum, item) => sum + item.price * item.qty, 0) + (order.acceptedBidId ? 15 : 0)).toFixed(2)} EGP
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBackupReceiptToDrive(order)}
                          disabled={isBackingUp}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer flex items-center gap-1.5"
                          title={isAr ? "حفظ الفاتورة بالدرايف" : "Backup Invoice to Google Drive"}
                        >
                          <Cloud className="w-3.5 h-3.5 font-bold" />
                          <span>{isAr ? "حفظ بالدرايف" : "Backup to Drive"}</span>
                        </button>
                        <button
                          onClick={() => handleReorder(order)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-xs px-3.5 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                        >
                          {isAr ? "إعادة الطلب" : "Reorder"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 7. PHARMACY CONSULTATION CHATS (Live support) */}
          {/* ======================================================= */}
          {currentTab === "chat" && (
            <div className="space-y-3 flex flex-col h-full mt-[-10px]">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
                <button onClick={() => setCurrentTab("home")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <div className="text-right">
                  <h3 className="font-bold text-sm text-slate-800">{isAr ? "الدردشة الدوائية الفورية" : "Live Pharmacy Chat"}</h3>
                  <p className="text-[10px] text-slate-400">{isAr ? "صيادلة مرخصون لخدمتك في مصر" : "Licensed Egyptian Pharmacists on hand"}</p>
                </div>
              </div>

              {/* Chat timeline messages */}
              <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-50/50 rounded-xl max-h-[460px] min-h-[380px]">
                {chatMessages.map((msg) => {
                  const isMe = msg.sender === "customer";
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
                      {!isMe && msg.pharmacyName && (
                        <span className="text-[9px] text-slate-400 mb-0.5 px-1 font-bold">{msg.pharmacyName}</span>
                      )}
                      <div className={`p-3 rounded-2xl text-xs max-w-[80%] shadow-3xs leading-relaxed ${
                        isMe ? "bg-emerald-500 text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                      }`}>
                        <p>{msg.text}</p>
                        <span className="text-[8px] opacity-75 block text-left mt-1 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input trigger form */}
              <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 text-right p-3 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 bg-white"
                  placeholder={isAr ? "اكتب رسالتك أو سؤالك الدوائي..." : "Ask your pharmacist..."}
                />
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white w-11 h-11 rounded-xl flex items-center justify-center shadow-md shrink-0 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
              </form>
            </div>
          )}

          {/* ======================================================= */}
          {/* 8. PROFILE & CHRONIC CONDITIONS SCREEN (Page 10) */}
          {/* ======================================================= */}
          {currentTab === "profile" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setCurrentTab("home")} className="p-1 rounded-full bg-slate-200 hover:bg-slate-300">
                  <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
                <h3 className="font-bold text-sm text-slate-800">{isAr ? "الملف الطبي والشخصي" : "E-Health Profile"}</h3>
              </div>

              {/* Personal Info Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "البيانات الشخصية:" : "Personal Information:"}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "الاسم الكامل:" : "Full Name:"}</span>
                    <span className="font-bold text-slate-800">{user.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "رقم الهاتف المحلي:" : "Phone Number:"}</span>
                    <span className="font-bold text-slate-800 font-mono">{user.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400">{isAr ? "البريد الإلكتروني:" : "Email:"}</span>
                    <span className="font-bold text-slate-800 font-mono">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isAr ? "العنوان الافتراضي للـ GPS:" : "GPS Address:"}</span>
                    <span className="font-bold text-slate-800 text-left shrink-0 max-w-[60%] truncate">{user.address}</span>
                  </div>
                </div>
              </div>

              {/* Chronic Conditions Manager (Page 10 requirement) */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "الأمراض المزمنة المسجلة:" : "Chronic Conditions:"}</h4>
                  <span className="text-[10px] text-slate-400">{isAr ? "تستخدم لفحص التفاعلات" : "Used to screen interactions"}</span>
                </div>

                {/* Add dynamic condition */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newConditionName}
                      onChange={(e) => setNewConditionName(e.target.value)}
                      className="flex-1 text-right p-2 text-xs rounded-lg border border-slate-200 bg-slate-50"
                      placeholder={isAr ? "أضف حالة مثل: ضغط، حساسية بنسلين" : "e.g., Penicillin Allergy"}
                    />
                    <select
                      value={newConditionSince}
                      onChange={(e) => setNewConditionSince(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 text-center"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2020">2020</option>
                      <option value="2018">2018</option>
                    </select>
                    <button
                      onClick={handleAddCondition}
                      className="bg-[#00c853] hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shrink-0 cursor-pointer"
                    >
                      {isAr ? "أضف" : "Add"}
                    </button>
                  </div>
                </div>

                {/* Conditions list */}
                <div className="space-y-2 mt-2">
                  {chronicConditions.map((cond) => (
                    <div key={cond.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{isAr ? cond.nameAr : cond.nameEn}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{isAr ? `منذ عام ${cond.since}` : `Since ${cond.since}`}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCondition(cond.id)}
                        className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-md"
                        title="حذف الحالة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Language and App Settings */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">{isAr ? "إعدادات التطبيق:" : "App Settings:"}</h4>
                
                {/* Language selection card */}
                <div className="flex justify-between items-center text-xs">
                  <span>{isAr ? "لغة عرض واجهة المستخدم:" : "UI Language Preference:"}</span>
                  <div className="flex rounded-lg bg-slate-100 p-0.5">
                    <button
                      onClick={() => setLang("ar")}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md ${isAr ? "bg-white text-gray-800 shadow-3xs" : "text-gray-400"}`}
                    >
                      العربية
                    </button>
                    <button
                      onClick={() => setLang("en")}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md ${!isAr ? "bg-white text-gray-800 shadow-3xs" : "text-gray-400"}`}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  setCurrentTab("login");
                  onBackToHub();
                }}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 py-3 rounded-xl font-bold transition-all text-xs text-center cursor-pointer"
              >
                {isAr ? "تسجيل الخروج من الحساب" : "Log Out"}
              </button>
            </div>
          )}

        </div>

        {/* BOTTOM TAB NAVIGATION BAR (Visible when logged in) */}
        {currentTab !== "login" && (
          <div className="bg-white border-t border-slate-100 h-16 shrink-0 flex justify-around items-center text-slate-400">
            <button
              onClick={() => setCurrentTab("home")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "home" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الرئيسية" : "Home"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("history")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "history" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الطلبات" : "Orders"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("chat")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "chat" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الدردشة" : "Chat"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("profile")}
              className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${currentTab === "profile" ? "text-emerald-500 font-bold" : "hover:text-slate-600"}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] mt-1">{isAr ? "الملف" : "Profile"}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
