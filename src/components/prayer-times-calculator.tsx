
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Moon, Sunrise, Sun, Sunset, CloudSun, Loader2, LocateFixed, AlertTriangle, Bell, Volume2, BellOff, BellRing } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { useLocation, type LocationInfo } from '@/hooks/use-location';
import { LocationSearchInput } from './location-search-input';
import { useAdhanSettings, calculationMethods } from '@/hooks/use-adhan-settings';
import type { PrayerKey, CalculationMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface PrayerTimesData {
  Imsak: string; Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
}
interface DateInfo {
    hijri: { date: string; day: string; weekday: { ar: string }; month: { en: string; ar: string }; year: string; };
    gregorian: { date: string; format: string; day: string; weekday: { en: string }; month: { en: string }; year: string; }
}

// Constants
const MAIN_PRAYERS: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const prayerIcons: Record<string, React.ElementType> = { Fajr: Sunrise, Dhuhr: Sun, Asr: CloudSun, Maghrib: Sunset, Isha: Moon };

const headerStyle = {
    textShadow: '1px 1px 0px #d1d1d1, 2px 2px 0px #bcbcbc, 3px 3px 0px #a8a8a8, 4px 4px 10px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.3)'
};

// Translations
const translations = {
    fr: {
        loading: 'Récupération des horaires...',
        verifying: 'Vérification en cours...',
        countdownPrefix: 'Prochaine prière',
        in: 'dans',
        myPosition: 'Ma position actuelle',
        searchCity: 'Rechercher une ville...',
        search: 'Rechercher',
        cityNotFound: 'Ville non trouvée',
        prayerNames: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Chourouk', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
        prayerTimesFor: 'Horaires pour',
        updateFor: 'Mise à jour :',
        toastSuccess: (cityName: string) => `✅ Horaires actualisés pour ${cityName}`,
        calculationMethod: 'Méthode de calcul',
        permissionDefault: "Activer les alertes",
        permissionGranted: "Alertes activées",
        permissionDenied: "Alertes bloquées",
        testSound: "Tester le son",
        audioError: "Audio en attente de clic.",
        notificationsScheduled: "Notifications de prière programmées.",
        notificationsFailed: "Impossible de programmer les notifications."
    },
    ar: {
        loading: 'جاري تحميل أوقات الصلاة...',
        verifying: 'جاري التحقق...',
        countdownPrefix: 'الصلاة القادمة',
        in: 'خلال',
        myPosition: 'موقعي الحالي',
        searchCity: 'ابحث عن مدينة...',
        search: 'بحث',
        cityNotFound: 'لم يتم العثور على المدينة',
        prayerNames: { Imsak: 'الإمساك', Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
        prayerTimesFor: 'أوقات الصلاة في',
        updateFor: 'تحديث لـ :',
        toastSuccess: (cityName: string) => `✅ تم تحديث الأوقات لـ ${cityName}`,
        calculationMethod: 'طريقة الحساب',
        permissionDefault: "🔔 تفعيل التنبيهات",
        permissionGranted: "✅ الأذان جاهز",
        permissionDenied: "⚠️ الأذان محظور",
        testSound: "Tester le son",
        audioError: "الصوت في انتظار النقر.",
        notificationsScheduled: "تم جدولة إشعارات الصلاة.",
        notificationsFailed: "لم نتمكن من جدولة الإشعارات."
    },
    en: {
        loading: 'Retrieving times...',
        verifying: 'Verifying...',
        countdownPrefix: 'Next prayer',
        in: 'in',
        myPosition: 'My current location',
        searchCity: 'Search for a city...',
        search: 'Search',
        cityNotFound: 'City not found',
        prayerNames: { Imsak: 'Imsak', Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
        prayerTimesFor: 'Prayer times for',
        updateFor: 'Update for:',
        toastSuccess: (cityName: string) => `✅ Times updated for ${cityName}`,
        calculationMethod: 'Calculation Method',
        permissionDefault: "Enable alerts",
        permissionGranted: "Alerts enabled",
        permissionDenied: "Alerts blocked",
        testSound: "Test Sound",
        audioError: "Audio waiting for click.",
        notificationsScheduled: "Prayer notifications scheduled.",
        notificationsFailed: "Could not schedule notifications."
    }
};

const hijriMonthsFr: { [key: string]: string } = {
    "Muḥarram": "Mouharram", "Ṣafar": "Safar", "Rabīʿ al-awwal": "Rabi' al-awwal", "Rabīʿ al-thānī": "Rabi' al-thani",
    "Jumādā al-awwal": "Joumada al-oula", "Jumādā al-thānī": "Joumada al-thani", "Rajab": "Rajab", "Shaʿbān": "Chaabane",
    "Ramaḍān": "Ramadan", "Shawwāl": "Chawwal", "Dhū al-Qaʿdah": "Dhou al-qi'da", "Dhū al-Ḥijjah": "Dhou al-hijja",
};

function applyOffset(timeStr: string, offset: number): string {
    if (!timeStr || offset === 0) return timeStr;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeStr;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + offset);
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMinutes = String(date.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMinutes}`;
}

export default function PrayerTimesCalculator() {
    const { location, resetLocation, isLoading: isLocationLoading } = useLocation();
    const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
    const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
    const [nextPrayerName, setNextPrayerName] = useState('');
    const [nextPrayerCountdown, setNextPrayerCountdown] = useState('');
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [currentPrayer, setCurrentPrayer] = useState<PrayerKey | null>(null);
    const [resolvedMethodName, setResolvedMethodName] = useState('');
    const [audioError, setAudioError] = useState('');
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [hour12, setHour12] = useState(false);

    const { settings: adhanSettings } = useAdhanSettings();
    const { toast } = useToast();
    
    const { language } = useLanguage();
    const t = useMemo(() => translations[language], [language]);

    useEffect(() => {
        const stored = localStorage.getItem('hour12');
        if (stored) {
            setHour12(JSON.parse(stored));
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const schedulePrayers = useCallback(() => {
        if (prayerTimes && location && adhanSettings && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_PRAYERS',
                payload: { prayerTimes, settings: adhanSettings, location, prayerNames: t.prayerNames }
            });
            console.log('Horaires des prières envoyés au Service Worker.');
            toast({ title: t.notificationsScheduled });
        } else {
            console.warn("Conditions non remplies pour la programmation des prières", { prayerTimes, location, adhanSettings, sw: navigator.serviceWorker.controller });
            toast({ variant: "destructive", title: t.notificationsFailed });
        }
    }, [prayerTimes, location, adhanSettings, t.prayerNames, t.notificationsScheduled, t.notificationsFailed, toast]);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        if (result === 'granted') {
            schedulePrayers();
        }
    };
    
    const fetchPrayerTimes = useCallback(async (loc: LocationInfo) => {
        setPrayerTimes(null);
        try {
            const date = new Date();
            const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
            const selectedMethodKey = adhanSettings.calculationMethod as CalculationMethod;
            let methodId = calculationMethods[selectedMethodKey]?.methodId;
            let methodName = calculationMethods[selectedMethodKey]?.name;

            if (selectedMethodKey === 'auto') {
                const country = loc.country.toLowerCase();
                if (country.includes('france')) { methodId = 12; methodName = `Auto: ${calculationMethods['uoif'].name}`; } 
                else if (country.includes('united states') || country.includes('canada')) { methodId = 2; methodName = `Auto: ${calculationMethods['isna'].name}`; } 
                else { methodId = 3; methodName = `Auto: ${calculationMethods['mwl'].name}`; }
            }
            
            setResolvedMethodName(methodName || '');
            const elevation = loc.altitude !== null ? `&elevation=${Math.round(loc.altitude)}` : '';
            const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${loc.latitude}&longitude=${loc.longitude}&method=${methodId}${elevation}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Aladhan API failed`);
            const data = await response.json();
            if (data.code !== 200) throw new Error(`Aladhan API Error`);

            const times = data.data.timings;
            setPrayerTimes(times);
            setDateInfo(data.data.date);
        } catch (error) {
            console.error("Failed to fetch prayer times:", error);
            setPrayerTimes(null);
        }
    }, [adhanSettings.calculationMethod]);
    
    useEffect(() => {
        if (location) { fetchPrayerTimes(location); }
    }, [location, fetchPrayerTimes]);

    useEffect(() => {
        if (notificationPermission === 'granted') { schedulePrayers(); }
    }, [prayerTimes, schedulePrayers, notificationPermission]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedGregorianDate = useMemo(() => {
        if (!currentTime) return null;
        let hijriString = '';
        if (dateInfo) {
            const hijriMonthEn = dateInfo.hijri.month.en;
            const hijriMonthFr = hijriMonthsFr[hijriMonthEn] || hijriMonthEn;
            hijriString = language === 'ar' ? ` • ${dateInfo.hijri.day} ${dateInfo.hijri.month.ar} ${dateInfo.hijri.year} هـ`
                                             : ` • ${dateInfo.hijri.day} ${hijriMonthFr} ${dateInfo.hijri.year} AH`;
        }
        const gregorianStr = currentTime.toLocaleDateString(language === 'ar' ? 'ar-TN-u-ca-gregory' : 'fr-FR', 
            { weekday: 'long', day: 'numeric', month: 'long' });
        
        return `${gregorianStr}${hijriString}`;
    }, [currentTime, dateInfo, language]);

    useEffect(() => {
        if (isLocationLoading || !prayerTimes || !currentTime) {
            setNextPrayerName('');
            setNextPrayerCountdown(t.loading);
            return;
        }

        let nextPrayer: { name: PrayerKey; time: Date } | null = null;
        for (const name of MAIN_PRAYERS) {
            const finalTime = applyOffset(prayerTimes[name], adhanSettings.offsets[name] || 0);
            const prayerTime = new Date(`${currentTime.toISOString().split('T')[0]}T${finalTime}:00`);
            if (prayerTime > currentTime) {
                nextPrayer = { name, time: prayerTime };
                break;
            }
        }
        if (!nextPrayer) {
            const tomorrow = new Date(currentTime);
            tomorrow.setDate(currentTime.getDate() + 1);
            const finalTime = applyOffset(prayerTimes.Fajr, adhanSettings.offsets.Fajr || 0);
            nextPrayer = { name: "Fajr", time: new Date(`${tomorrow.toISOString().split('T')[0]}T${finalTime}:00`) };
        }
        
        setNextPrayerName(t.prayerNames[nextPrayer.name]);
        const diff = nextPrayer.time.getTime() - currentTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setNextPrayerCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

        let foundCurrentPrayer: PrayerKey | null = null;
        for (let i = MAIN_PRAYERS.length - 1; i >= 0; i--) {
            const name = MAIN_PRAYERS[i];
            const prayerTime = new Date(`${currentTime.toISOString().split('T')[0]}T${applyOffset(prayerTimes[name], adhanSettings.offsets[name] || 0)}:00`);
            if (prayerTime <= currentTime) {
                foundCurrentPrayer = name; break;
            }
        }
        setCurrentPrayer(foundCurrentPrayer || 'Isha');
    }, [currentTime, prayerTimes, t, isLocationLoading, adhanSettings.offsets]);

    const formatPrayerTime = useCallback((timeStr: string) => {
        if (!timeStr) return '--:--';
        const [hours, minutes] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10));

        const locale = hour12 ? 'en-US' : 'fr-FR';
        
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12 });
    }, [hour12]);

    const handleTestSound = () => {
        setAudioError('');
        const audio = new Audio('https://www.islamcan.com/audio/adhan/azan2.mp3');
        audio.play().catch(e => {
            console.error("La lecture du son de test a échoué:", e);
            setAudioError(t.audioError);
        });
    };
    
    const renderHeader = () => (
        <div className="relative flex flex-col justify-start px-4" style={{ minHeight: '230px' }}>
            <div className={cn("pt-4 pb-12", language === 'ar' ? 'text-right' : 'text-left')}>
                <p className="font-light text-sm bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
                    {prayerTimes && currentTime ? formattedGregorianDate : <>&nbsp;</>}
                </p>
            </div>
            
            <div className="flex-grow flex flex-col justify-center items-center text-center -mt-8">
                <div>
                    <p className="text-lg bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
                        {t.countdownPrefix}
                    </p>
                    <h2
                        className="text-3xl font-bold tracking-tight my-1 font-headline text-white"
                        style={headerStyle}
                    >
                        {nextPrayerName || <>&nbsp;</>}
                    </h2>
                    <p 
                        className="font-mono text-4xl font-bold tracking-[-2px] text-white"
                        style={headerStyle}
                    >
                        {nextPrayerCountdown || '--:--:--'}
                    </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                    <span className="text-9xl text-white opacity-10 rotate-12">🌙</span>
                </div>
            </div>
        </div>
    );
    
    const renderCardContent = () => {
        if (isLocationLoading && !prayerTimes) {
            return <CardContent className="h-60 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></CardContent>;
        }

        if (!prayerTimes) {
             return (
                <CardContent className="h-60 flex justify-center items-center">
                    <p>{t.verifying}</p>
                </CardContent>
             );
        }
        return (
            <>
            <CardContent className="space-y-4 p-2 sm:p-4">
                <div className="grid grid-cols-5 gap-2 md:gap-4 text-center">
                {MAIN_PRAYERS.map(key => {
                    const Icon = prayerIcons[key];
                    const finalTime = applyOffset(prayerTimes[key], adhanSettings.offsets[key] || 0);
                    const isCurrent = key === currentPrayer;
                    return (
                        <div key={key} className={cn('p-1 sm:p-2 rounded-2xl flex flex-col items-center justify-center space-y-1 transition-all duration-500', isCurrent && 'bg-primary/10')}>
                            {Icon && <Icon className={cn("h-6 w-6", isCurrent ? "text-primary" : "text-muted-foreground")} />}
                            <p className={cn("font-bold text-lg", isCurrent ? "text-primary" : "text-foreground")}>{t.prayerNames[key]}</p>
                            <p className={cn("font-mono text-base", isCurrent ? "font-bold text-primary" : "font-medium text-foreground")}>{formatPrayerTime(finalTime)}</p>
                        </div>
                    );
                })}
                </div>
            </CardContent>
            <Separator/>
            <CardFooter className="pt-4 flex flex-wrap items-center justify-center gap-4">
                {notificationPermission === 'default' && (
                    <Button onClick={requestNotificationPermission} variant="default" className="rounded-full">
                        <Bell className="mr-2 h-4 w-4" />{t.permissionDefault}
                    </Button>
                )}
                {notificationPermission === 'granted' && (
                    <p className="font-semibold text-sm text-green-600 flex items-center gap-2"><BellRing className="h-4 w-4"/> {t.permissionGranted}</p>
                )}
                {notificationPermission === 'denied' && (
                    <p className="font-semibold text-sm text-destructive flex items-center gap-2"><BellOff className="h-4 w-4"/> {t.permissionDenied}</p>
                )}
                <Button onClick={handleTestSound} variant="outline" className="rounded-full bg-background/50 h-auto px-4 py-1.5 text-sm">
                    <Volume2 className="mr-2 h-4 w-4" />{t.testSound}
                </Button>
                {audioError && <p className="text-xs text-muted-foreground w-full text-center">{audioError}</p>}
            </CardFooter>
            </>
        );
    }
    

    return (
        <>
            {renderHeader()}
            <Card className={cn("transition-all duration-300 ease-in-out overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-xl border border-white/20", language === 'ar' && 'font-arabic')}>
                <CardHeader className="flex-wrap flex-row items-center justify-between rtl:flex-row-reverse gap-y-2">
                     <div className="text-left rtl:text-right flex-1">
                        <CardDescription className="text-zinc-700 dark:text-zinc-400">{t.prayerTimesFor}</CardDescription>
                        {isLocationLoading ? <div className="h-8 w-40 bg-muted/50 animate-pulse rounded-md mt-1" /> : <LocationSearchInput variant="minimal" />}
                    </div>
                </CardHeader>
                 {location && !isLocationLoading && (
                    <div className="text-center -mt-4 mb-4 flex flex-wrap gap-2 justify-center items-center">
                         <Button size="sm" onClick={resetLocation} variant="outline" className="rounded-full px-3 py-1 h-auto text-xs text-foreground border-foreground/30 hover:bg-muted">
                            <LocateFixed className="mr-2 h-3 w-3" />
                            {t.myPosition}
                        </Button>
                    </div>
                )}
                {renderCardContent()}
            </Card>
             {prayerTimes && resolvedMethodName && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                    {t.calculationMethod} : {resolvedMethodName}
                </p>
            )}
        </>
    );
}

    