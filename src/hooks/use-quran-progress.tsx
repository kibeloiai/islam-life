
'use client';

import { useState, useEffect, useCallback } from 'react';

// Structure of the progress data stored in localStorage
interface QuranProgressData {
  progress: { [surahNumber: string]: number };
  lastRead: {
    surahNumber: number;
    surahName: string;
    verseNumber: number;
    totalVerses: number;
  } | null;
}

const STORAGE_KEY = 'quran-progress';

// Function to safely get data from localStorage
const getInitialData = (): QuranProgressData => {
  if (typeof window === 'undefined') {
    return { progress: {}, lastRead: null };
  }
  try {
    const item = window.localStorage.getItem(STORAGE_KEY);
    if (item) {
      return JSON.parse(item) as QuranProgressData;
    }
  } catch (error) {
    console.error('Error reading from localStorage', error);
  }
  return { progress: {}, lastRead: null };
};

export const useQuranProgress = () => {
  const [data, setData] = useState<QuranProgressData>({ progress: {}, lastRead: null });
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // This effect runs only on the client after hydration
    setData(getInitialData());
    setIsLoaded(true);
  }, []);

  const setProgress = useCallback((
    surahNumber: number,
    verseNumber: number,
    surahName: string,
    totalVerses: number
  ) => {
    if (typeof window === 'undefined') return;

    const newData: QuranProgressData = {
      progress: {
        ...data.progress,
        [surahNumber]: verseNumber,
      },
      lastRead: {
        surahNumber,
        surahName,
        verseNumber,
        totalVerses,
      },
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setData(newData);
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [data.progress]);

  return {
    progressData: data.progress,
    lastRead: data.lastRead,
    setProgress,
    isLoaded, // You can use this to prevent rendering until data is loaded from localStorage
  };
};
