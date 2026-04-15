
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

type Language = 'fr' | 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage && ['fr', 'ar', 'en'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
    } else {
        document.documentElement.lang = 'fr';
        document.documentElement.dir = 'ltr';
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    if (['fr', 'ar', 'en'].includes(lang)) {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const languages: Language[] = ['fr', 'ar', 'en'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  }, [language, setLanguage]);

  const value = {
    language,
    toggleLanguage,
    setLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
