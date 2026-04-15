'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PrayerTimeSettings {
  showImsak: boolean;
  showSunrise: boolean;
}

const STORAGE_KEY = 'prayer-time-settings';

const defaultSettings: PrayerTimeSettings = {
  showImsak: false,
  showSunrise: true,
};

const getInitialSettings = (): PrayerTimeSettings => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error reading prayer time settings from localStorage', error);
  }
  return defaultSettings;
};

export const usePrayerTimeSettings = () => {
  const [settings, setSettings] = useState<PrayerTimeSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(getInitialSettings());
    setIsLoaded(true);
  }, []);

  const saveSettings = useCallback((newSettings: PrayerTimeSettings) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error('Error saving prayer time settings to localStorage', error);
      }
    }
  }, []);

  const toggleImsak = useCallback(() => {
    saveSettings({ ...settings, showImsak: !settings.showImsak });
  }, [settings, saveSettings]);

  const toggleSunrise = useCallback(() => {
    saveSettings({ ...settings, showSunrise: !settings.showSunrise });
  }, [settings, saveSettings]);

  return {
    settings,
    isLoaded,
    toggleImsak,
    toggleSunrise,
  };
};
