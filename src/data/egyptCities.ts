export interface EgyptCity {
  id: string;
  nameAr: string;
  nameEn: string;
  tier: "Class A";
}

export const EGYPT_CLASS_A_CITIES: EgyptCity[] = [
  { id: "new-cairo", nameAr: "القاهرة الجديدة - التجمع الخامس", nameEn: "New Cairo - 5th Settlement", tier: "Class A" },
  { id: "sheikh-zayed", nameAr: "الشيخ زايد", nameEn: "Sheikh Zayed City", tier: "Class A" },
  { id: "october", nameAr: "مدينة 6 أكتوبر", nameEn: "6th of October City", tier: "Class A" },
  { id: "madinaty", nameAr: "مدينة مدينتي", nameEn: "Madinaty City", tier: "Class A" },
  { id: "rehab", nameAr: "مدينة الرحاب", nameEn: "El Rehab City", tier: "Class A" },
  { id: "shorouk", nameAr: "مدينة الشروق", nameEn: "El Shorouk City", tier: "Class A" },
  { id: "maadi", nameAr: "المعادي (ديجلا والجراند مول)", nameEn: "Maadi (Degla & Grand Mall)", tier: "Class A" },
  { id: "heliopolis", nameAr: "مصر الجديدة", nameEn: "Heliopolis", tier: "Class A" },
  { id: "zamalek", nameAr: "الزمالك", nameEn: "Zamalek", tier: "Class A" },
  { id: "garden-city", nameAr: "جاردن سيتي", nameEn: "Garden City", tier: "Class A" },
  { id: "obour", nameAr: "مدينة العبور", nameEn: "El Obour City", tier: "Class A" },
  { id: "new-heliopolis", nameAr: "هليوبوليس الجديدة", nameEn: "New Heliopolis", tier: "Class A" }
];
