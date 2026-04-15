
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AdhanSettings, CalculationMethod, PrayerKey, AlertType, AdhanVoice } from '@/lib/types';

const STORAGE_KEY = 'adhan-settings';

const defaultSettings: AdhanSettings = {
  calculationMethod: 'auto',
  enabledPrayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  alertTypes: { Fajr: 'full', Dhuhr: 'full', Asr: 'full', Maghrib: 'full', Isha: 'full' },
  adhanVoice: 'mekka',
  offsets: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
};

const getInitialSettings = (): AdhanSettings => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      const settings = { 
        ...defaultSettings, 
        ...parsed, 
        enabledPrayers: {...defaultSettings.enabledPrayers, ...parsed.enabledPrayers},
        alertTypes: {...defaultSettings.alertTypes, ...parsed.alertTypes},
        offsets: {...defaultSettings.offsets, ...parsed.offsets},
      };
      delete (settings as any).sound; // Clean up old property
      delete (settings as any).version;
      return settings;
    }
  } catch (error) {
    console.error('Error reading Adhan settings from localStorage', error);
  }
  return defaultSettings;
};

export const useAdhanSettings = () => {
  const [settings, setSettings] = useState<AdhanSettings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<AdhanSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initial = getInitialSettings();
    setSettings(initial);
    setDraftSettings(initial);
    setIsLoaded(true);
  }, []);

  const saveDraftSettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftSettings));
        setSettings(draftSettings);
      } catch (error) {
        console.error('Error saving Adhan settings to localStorage', error);
      }
    }
  }, [draftSettings]);

  const resetDraftSettings = useCallback(() => {
    setDraftSettings(settings);
  }, [settings]);

  const updateCalculationMethod = useCallback((method: CalculationMethod) => {
    setDraftSettings(current => ({ ...current, calculationMethod: method }));
  }, []);

  const togglePrayer = useCallback((prayer: PrayerKey) => {
    setDraftSettings(current => ({
      ...current,
      enabledPrayers: {
        ...current.enabledPrayers,
        [prayer]: !current.enabledPrayers[prayer],
      },
    }));
  }, []);

  const updateAlertType = useCallback((prayer: PrayerKey, type: AlertType) => {
    setDraftSettings(current => ({
      ...current,
      alertTypes: {
        ...current.alertTypes,
        [prayer]: type,
      },
    }));
  }, []);

  const updateAdhanVoice = useCallback((voice: AdhanVoice) => {
    setDraftSettings(current => ({ ...current, adhanVoice: voice }));
  }, []);

  const updatePrayerOffset = useCallback((prayer: PrayerKey, offset: number) => {
    // a reasonable limit
    const newOffset = Math.max(-30, Math.min(30, offset));
    setDraftSettings(current => ({
      ...current,
      offsets: {
        ...current.offsets,
        [prayer]: newOffset,
      },
    }));
  }, []);

  return {
    settings,
    draftSettings,
    isLoaded,
    togglePrayer,
    updateCalculationMethod,
    updatePrayerOffset,
    updateAlertType,
    updateAdhanVoice,
    saveDraftSettings,
    resetDraftSettings,
  };
};

export const calculationMethods: Record<CalculationMethod, { name: string; methodId?: number }> = {
    'auto': { name: 'Détection automatique par pays' },
    'mwl': { name: 'Ligue Islamique Mondiale (18°)', methodId: 3 },
    'isna': { name: 'Standard (ISNA 15°)', methodId: 2 },
    'uoif': { name: 'France (UOIF 12°)', methodId: 12 },
    'paris': { name: 'Grande Mosquée de Paris (18°)', methodId: 13 },
    'makkah': { name: 'Umm Al-Qura, Makkah', methodId: 4 },
};

export const adhanVoices: Record<AdhanVoice, { name: string }> = {
    'mekka': { name: 'Mekka' },
    'medina': { name: 'Médine' },
    'alafasy': { name: 'Alafasy' },
};

export const alertTypes: Record<AlertType, { name: string }> = {
    'full': { name: 'Adhan complet' },
    'bip': { name: 'Bip court' },
    'silent': { name: 'Notification seule' },
};
