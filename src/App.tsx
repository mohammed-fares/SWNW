import React, { useState } from "react";
import HubScreen from "./components/HubScreen";
import ClientApp from "./components/ClientApp";
import PharmacyApp from "./components/PharmacyApp";
import DeliveryApp from "./components/DeliveryApp";
import AdminApp from "./components/AdminApp";

export default function App() {
  // Global State for role selection: "hub" | "client" | "pharmacy" | "delivery" | "admin"
  const [role, setRole] = useState<"hub" | "client" | "pharmacy" | "delivery" | "admin">("hub");
  // Language setting: "ar" (Arabic) by default, or "en" (English)
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Floating Interactive Simulation Guideline Panel */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white text-center py-2.5 px-4 text-xs font-medium flex justify-between items-center gap-3 shadow-md shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[11px] opacity-90">
            {isAr 
              ? "💡 بيئة محاكاة حية ذكية: تنقل بين العميل، الصيدلية، المندوب، والتحكم لتحميل التطبيقات وإجراء فحص الروشتات والعمولات!" 
              : "💡 Multi-role live simulator: toggle between Client, Pharmacy, Courier, and Admin Hub to download files & check live tenders!"}
          </span>
        </div>
        
        {/* Quick Role Toggle Bar */}
        <div className="flex items-center gap-1.5 bg-white/10 p-0.5 rounded-lg border border-white/15">
          <button
            onClick={() => setRole("hub")}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${role === "hub" ? "bg-white text-slate-900 shadow-xs" : "hover:bg-white/5 text-white/80"}`}
          >
            {isAr ? "الرئيسية" : "Gateway Hub"}
          </button>
          <button
            onClick={() => setRole("client")}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${role === "client" ? "bg-blue-600 text-white shadow-xs" : "hover:bg-white/5 text-white/80"}`}
          >
            {isAr ? "👤 العميل" : "👤 Client"}
          </button>
          <button
            onClick={() => setRole("pharmacy")}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${role === "pharmacy" ? "bg-emerald-600 text-white shadow-xs" : "hover:bg-white/5 text-white/80"}`}
          >
            {isAr ? "🏥 الصيدلية" : "🏥 Pharmacy"}
          </button>
          <button
            onClick={() => setRole("delivery")}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${role === "delivery" ? "bg-indigo-600 text-white shadow-xs" : "hover:bg-white/5 text-white/80"}`}
          >
            {isAr ? "🏍️ المندوب" : "🏍️ Courier"}
          </button>
          <button
            onClick={() => setRole("admin")}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${role === "admin" ? "bg-slate-800 text-emerald-400 border border-slate-700 shadow-xs" : "hover:bg-white/5 text-white/80"}`}
          >
            {isAr ? "⚙️ لوحة الإدارة" : "⚙️ Admin"}
          </button>
        </div>
      </div>

      {/* Main Orchestrated Frame Render */}
      <div className="flex-1">
        {role === "hub" && (
          <HubScreen 
            onSelectRole={(r) => setRole(r)} 
            lang={lang} 
            setLang={setLang} 
          />
        )}

        {role === "client" && (
          <ClientApp 
            lang={lang} 
            setLang={setLang} 
            onBackToHub={() => setRole("hub")} 
          />
        )}

        {role === "pharmacy" && (
          <PharmacyApp 
            lang={lang} 
            setLang={setLang} 
            onBackToHub={() => setRole("hub")} 
          />
        )}

        {role === "delivery" && (
          <DeliveryApp 
            lang={lang} 
            setLang={setLang} 
            onBackToHub={() => setRole("hub")} 
          />
        )}

        {role === "admin" && (
          <AdminApp 
            lang={lang} 
            setLang={setLang} 
            onBackToHub={() => setRole("hub")} 
          />
        )}
      </div>

    </div>
  );
}
