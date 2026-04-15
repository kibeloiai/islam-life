
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, HeartPulse, Repeat, Compass, LogOut, Sun, Moon, Settings, Globe, Map, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { getAuth, signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/icons/logo";
import { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from "@/hooks/use-language";
import { LocationProvider } from "@/hooks/use-location";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AudioProvider } from "@/context/audio-provider";
import { GlobalAudioPlayer } from "@/components/global-audio-player";


const navItems = [
  { href: "/dashboard", icon: Home, label: { fr: "Accueil", ar: "الرئيسية", en: "Home" } },
  { href: "/quran", icon: Library, label: { fr: "Coran", ar: "القرآن", en: "Quran" } },
  { href: "/duas", icon: HeartPulse, label: { fr: "Doua", ar: "دعاء", en: "Dua" } },
  { href: "/tasbih", icon: Repeat, label: { fr: "Tasbih", ar: "تسبيح", en: "Tasbih" } },
  { href: "/community", icon: MessageSquare, label: { fr: "Communauté", ar: "مجتمع", en: "Community" } },
  { href: "/map", icon: Map, label: { fr: "Carte", ar: "الخريطة", en: "Map" } },
  { href: "/qibla", icon: Compass, label: { fr: "Qibla", ar: "القبلة", en: "Qibla" } },
];

const translations = {
  fr: {
    myAccount: 'Mon compte',
    settings: 'Réglages',
    signOut: 'Se déconnecter',
    quran: 'Coran',
    map: 'Carte',
    changeTheme: 'Changer de thème',
    changeLanguage: 'Changer de langue',
  },
  ar: {
    myAccount: 'حسابي',
    settings: 'الإعدادات',
    signOut: 'تسجيل الخروج',
    quran: 'القرآن',
    map: 'الخريطة',
    changeTheme: 'تغيير المظهر',
    changeLanguage: 'تغيير اللغة',
  },
  en: {
    myAccount: 'My Account',
    settings: 'Settings',
    signOut: 'Sign Out',
    quran: 'Quran',
    map: 'Map',
    changeTheme: 'Change theme',
    changeLanguage: 'Change language',
  }
};


function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isClient, setIsClient] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  // Get user profile from Firestore
  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'user_profiles', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<{ username?: string; displayName?: string; photoURL?: string }>(userProfileRef);

  // Check if the current page is the Quran reader page.
  const isQuranReader = pathname.startsWith('/quran/') && pathname.split('/').length === 3;


  const visibleNavItems = navItems;


  useEffect(() => {
    setIsClient(true);
    
    // Correct Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('Service Worker registered:', registration);
            }).catch(registrationError => {
                console.error('Service Worker registration failed:', registrationError);
            });
        });
    }

    const hasReloaded = sessionStorage.getItem('hasReloaded');
    if (!hasReloaded && window.innerWidth >= 1024 && !('ontouchstart' in window)) {
        sessionStorage.setItem('hasReloaded', 'true');
        window.location.reload();
        return;
    }

    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        setIsDark(true);
    } else {
        document.documentElement.classList.remove('dark');
        setIsDark(false);
    }
    
    // --- Audio Context Unlock ---
    const unlockAudioContext = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            console.log("Audio Context Unlocked by user gesture.");
            // Remove listener after first interaction
            document.removeEventListener('click', unlockAudioContext);
            document.removeEventListener('touchend', unlockAudioContext);
        } catch (e) {
            console.error("Could not unlock Audio Context:", e);
        }
    };
    document.addEventListener('click', unlockAudioContext);
    document.addEventListener('touchend', unlockAudioContext);

     return () => {
        document.removeEventListener('click', unlockAudioContext);
        document.removeEventListener('touchend', unlockAudioContext);
    };

  }, []);

  const toggleTheme = () => {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      if (newIsDark) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      }
  };
  
  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
      router.push('/login');
    });
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name || name.trim() === '') return null;
    const parts = name.trim().split(' ').filter(p => p);
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0]) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return null;
  }


  return (
    <TooltipProvider>
      <div className={cn("flex flex-col h-screen", language === 'ar' && 'font-arabic')}>
        <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
              <Logo className="h-7 w-7 text-foreground" />
              <span className="font-bold text-xl font-headline text-foreground">IslamLife</span>
          </Link>

          <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground hover:bg-black/5">
                        <Globe className="h-5 w-5" />
                        <span className="sr-only">{t.changeLanguage}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setLanguage('fr')}>Français</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLanguage('ar')}>العربية</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLanguage('en')}>English</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground hover:text-foreground hover:bg-black/5">
                  {isClient && isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span className="sr-only">{t.changeTheme}</span>
              </Button>
              {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile?.photoURL || user.photoURL || ''} alt={userProfile?.username || user.displayName || 'Avatar'} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(() => {
                            const pseudo = userProfile?.username || userProfile?.displayName || user.displayName;
                            const initials = getInitials(pseudo);
                            return initials ? initials : <User className="h-5 w-5" />;
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal rtl:text-right">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.username || userProfile?.displayName || user.displayName || t.myAccount}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push('/settings')} className="rtl:flex-row-reverse">
                    <Settings className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                    <span>{t.settings}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="rtl:flex-row-reverse">
                    <LogOut className="mr-2 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                    <span>{t.signOut}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" asChild variant="outline">
                <Link href="/login">Connexion</Link>
              </Button>
            )}
          </div>
        </header>

        
        <main className={cn("flex-1 overflow-y-auto pt-16", !isQuranReader && "pb-32")}>
          <div className={cn(!isQuranReader && "p-4 sm:p-6")}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>

        <GlobalAudioPlayer />

        <div className="fixed bottom-0 left-0 right-0 z-10 px-2 pb-2 sm:px-4 sm:pb-4">
            <nav className="h-16 max-w-lg mx-auto rounded-2xl border bg-card shadow-lg">
            <div className="grid h-full grid-cols-7">
                {visibleNavItems.map(({ href, icon: Icon, label }) => {
                const isActive = (pathname.startsWith(href) && href !== "/dashboard") || pathname === href;
                return (
                <Link 
                    key={href} 
                    href={href} 
                    className={cn(
                        "flex flex-col items-center justify-center font-medium transition-colors h-full rounded-2xl",
                        "text-muted-foreground hover:text-foreground"
                    )}>
                    <div className={cn(
                        "transition-all duration-300 p-1 rounded-full relative flex items-center justify-center h-8 w-10",
                        isActive ? 'text-primary' : ''
                    )}>
                    <Icon className="h-5 w-5" />
                    {isActive && <div className="absolute bottom-0 h-1 w-5 rounded-full bg-accent" />}
                    </div>
                    <span className={cn("text-[10px] font-medium transition-all duration-300 -mt-1", isActive ? 'text-primary' : 'text-muted-foreground')}>{label[language as keyof typeof label]}</span>
                </Link>
                )})}
            </div>
            </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}


export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LocationProvider>
        <AudioProvider>
          <MainLayoutContent>{children}</MainLayoutContent>
        </AudioProvider>
      </LocationProvider>
    </LanguageProvider>
  )
}

    
