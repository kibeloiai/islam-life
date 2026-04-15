

export interface Prayer {
  name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
  time: string;
}

export interface Dua {
  id: string;
  title: string;
  categoryName: string;
  arabicText: string;
  translation: string;
  phonetic: string;
  likes?: string[];
  commentCount?: number;
  audioUrl?: string;
}

export interface MultilingualText {
  fr: string;
  ar: string;
}

export interface Ayah {
  number: number;
  textAr: string;
  textFr: string;
}

export interface Surah {
  number: number;
  nameAr: string;
  nameFr: string;
  revelation: string;
  versesCount: number;
  verses: Ayah[];
}

export interface PendingPlace {
    id: string;
    name: string;
    category: "Mosquée" | "Restaurant Hallal" | "Commerce";
    description: string;
    latitude: number;
    longitude: number;
    addedByUserId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any; // serverTimestamp
}

export interface Mosque {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type CalculationMethod = 'auto' | 'mwl' | 'isna' | 'uoif' | 'paris' | 'makkah';
export type PrayerKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
export type AlertType = 'full' | 'bip' | 'silent';
export type AdhanVoice = 'mekka' | 'medina' | 'alafasy';


export interface AdhanSettings {
  calculationMethod: CalculationMethod;
  enabledPrayers: Record<PrayerKey, boolean>;
  alertTypes: Record<PrayerKey, AlertType>;
  adhanVoice: AdhanVoice;
  offsets: Record<PrayerKey, number>;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  total_tasbih?: number;
  language?: 'fr' | 'ar' | 'en';
  theme?: 'light' | 'dark' | 'auto';
  hour12?: boolean;
  favoriteReminderIds?: string[];
  favoriteDuaIds?: string[];
}

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  text: string;
  tag: 'Idée' | 'Sentiment' | 'Endroit' | 'Conseil' | 'Rappel';
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: any; // Firestore Timestamp
  likes?: string[];
  commentCount?: number;
}

export interface Reminder {
  id: string;
  day_id: number;
  title: {
    fr: string;
    ar: string;
    en: string;
  };
  content: {
    fr: string;
    ar: string;
    en: string;
  };
  source: string;
  likes?: string[];
  commentCount?: number;
}
