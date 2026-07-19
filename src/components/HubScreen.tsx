import React from "react";
import { Shield, User, Activity, Truck, Pill } from "lucide-react";

interface HubScreenProps {
  onSelectRole: (role: "client" | "pharmacy" | "delivery" | "admin") => void;
  lang: "ar" | "en";
  setLang: (l: "ar" | "en") => void;
}

export default function HubScreen({ onSelectRole, lang, setLang }: HubScreenProps) {
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-linear-to-b from-[#e0f7f6] via-[#f4fafb] to-[#edf7fc] flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Language Toggle in Top Corner */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setLang(isAr ? "en" : "ar")}
          className="bg-white/75 hover:bg-white text-gray-700 font-medium text-sm px-4 py-2 rounded-full shadow-xs border border-gray-100 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>🌐</span>
          <span>{isAr ? "English" : "العربية"}</span>
        </button>
      </div>

      {/* Main Branding Section */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full my-8">
        {/* SWNW Capsule Logo */}
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0288d1]/30 to-[#00c853]/30 rounded-[2rem] blur-2xl animate-pulse"></div>
          <div className="relative w-20 h-20 bg-gradient-to-tr from-[#0288d1] to-[#00c853] rounded-[1.75rem] shadow-lg flex items-center justify-center transition-all hover:scale-105 duration-300 border border-white/20">
            {/* Glossy overlay */}
            <div className="absolute inset-1 bg-white/5 rounded-[1.5rem]"></div>
            <Pill className="w-10 h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] -rotate-45" />
          </div>
        </div>

        {/* Title & Slogan */}
        <h1 className="text-xl font-bold text-gray-900 tracking-wider text-center mt-2 mb-1">
          SWNW
        </h1>
        <p className="text-sm font-medium text-gray-500 text-center mb-10 max-w-xs">
          {isAr 
            ? "منظومة الربط والتسويق الذكي بين الصيدليات والمرضى" 
            : "Smart Linking & Marketing Platform Between Pharmacies and Patients"}
        </p>

        {/* Action Roles Panel */}
        <div className="w-full space-y-4">
          {/* Client Card */}
          <button
            onClick={() => onSelectRole("client")}
            className="w-full text-right bg-white hover:scale-[1.02] active:scale-[0.99] p-5 rounded-2xl shadow-md border border-gray-50 transition-all flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className={`flex-1 ${isAr ? "text-right" : "text-left"}`}>
              <h3 className="font-bold text-lg text-gray-800">
                {isAr ? "👤 تطبيق العميل والمريض" : "👤 Client & Patient App"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAr 
                  ? "ارفع الروشتة، قارن عروض الأسعار، وتتبع توصيلك حياً" 
                  : "Upload prescription, compare bids, track live delivery"}
              </p>
            </div>
          </button>

          {/* Pharmacy Card */}
          <button
            onClick={() => onSelectRole("pharmacy")}
            className="w-full text-right bg-white hover:scale-[1.02] active:scale-[0.99] p-5 rounded-2xl shadow-md border border-gray-50 transition-all flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div className={`flex-1 ${isAr ? "text-right" : "text-left"}`}>
              <h3 className="font-bold text-lg text-gray-800">
                {isAr ? "🏥 بوابة الصيدلية التسويقية" : "🏥 Pharmacy Marketing Portal"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAr 
                  ? "اشترك معنا كبوابة تسويقية لجلب العملاء، استقبال الطلبات وتقديم العروض الذكية" 
                  : "Subscribe as a marketing partner to attract clients, receive prescription requests, and place smart bids"}
              </p>
            </div>
          </button>

          {/* Courier Card */}
          <button
            onClick={() => onSelectRole("delivery")}
            className="w-full text-right bg-white hover:scale-[1.02] active:scale-[0.99] p-5 rounded-2xl shadow-md border border-gray-50 transition-all flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div className={`flex-1 ${isAr ? "text-right" : "text-left"}`}>
              <h3 className="font-bold text-lg text-gray-800">
                {isAr ? "🏍️ تطبيق مندوب التوصيل" : "🏍️ Courier Companion App"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAr 
                  ? "استلم شحنات الأدوية الجاهزة، وجه طريقك بالـ GPS، وحصل أرباحك" 
                  : "Claim ready medicine boxes, map client route, track cash & payout"}
              </p>
            </div>
          </button>

          {/* Admin Panel & Downloads Card */}
          <button
            onClick={() => onSelectRole("admin")}
            className="w-full text-right bg-white hover:scale-[1.02] active:scale-[0.99] p-5 rounded-2xl shadow-md border border-gray-50 transition-all flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className={`flex-1 ${isAr ? "text-right" : "text-left"}`}>
              <h3 className="font-bold text-lg text-gray-800">
                {isAr ? "⚙️ لوحة الإدارة ومركز التنزيلات" : "⚙️ Admin Hub & Download Center"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isAr 
                  ? "أدوات الإشراف، تفعيل الصيدليات، وتنزيل حزم المصادر والتطبيقات" 
                  : "Verify pharmacies, inspect logs, download all application bundles"}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-4 border-t border-gray-100/50 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Shield className="w-3.5 h-3.5" />
          <span>{isAr ? "أمن وصحي بالكامل • ممتثل للمعايير الطبية" : "100% Secure & Compliant with Medical Standards"}</span>
        </div>
      </div>
    </div>
  );
}
