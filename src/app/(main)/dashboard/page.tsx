
'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  ArrowRight,
  BookMarked,
  Share2,
  Sunrise,
} from 'lucide-react';
import PrayerTimesCalculator from '@/components/prayer-times-calculator';
import { useQuranProgress } from '@/hooks/use-quran-progress';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { adhanVoices, useAdhanSettings } from '@/hooks/use-adhan-settings';


// --- Page Level Constants & Helpers ---

const translations = {
    fr: {
        resumeReading: 'Reprendre la lecture',
        lastRead: 'Dernière lecture',
        surah: 'Sourate',
        reprendre: 'Reprendre',
        verse: 'Verset',
    },
    ar: {
        resumeReading: 'استئناف القراءة',
        lastRead: 'آخر قراءة',
        surah: 'سورة',
        reprendre: 'استئناف',
        verse: 'آية',
    },
    en: {
        resumeReading: 'Resume Reading',
        lastRead: 'Last read',
        surah: 'Surah',
        reprendre: 'Resume',
        verse: 'Verse',
    }
};

const adhanUrls: Record<keyof typeof adhanVoices, string> = {
    'mekka': 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    'medina': 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    'alafasy': 'https://www.islamcan.com/audio/adhan/azan20.mp3',
}


// --- Components ---

function RemindersFeed() {
    const { language } = useLanguage();
    const { toast } = useToast();

    const quotes = {
        fr: {
            title: "Rappel du Jour",
            content: "L'invocation est l'essence même de l'adoration.",
            source: "Tirmidhi",
            share: "Partager"
        },
        ar: {
            title: "تذكير اليوم",
            content: "الدعاء هو العبادة",
            source: "الترمذي",
            share: "مشاركة"
        },
        en: {
            title: "Reminder of the Day",
            content: "Supplication is the essence of worship.",
            source: "Tirmidhi",
            share: "Share"
        }
    };

    const quote = quotes[language] || quotes['fr'];

    const handleShare = () => {
        const textToShare = `${quote.content}\n(${quote.source})`;
        if (navigator.share) {
            navigator.share({
                title: quote.title,
                text: `${textToShare} - via IslamLife`,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(textToShare);
            toast({
                title: 'Copié !',
                description: 'Le rappel a été copié dans le presse-papiers.',
            });
        }
    };
    
    return (
        <Card 
            className="shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[1.01] bg-gradient-to-br from-[#F0F9F4] to-card dark:from-card dark:to-background"
        >
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                         <Sunrise className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg font-headline">{quote.title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="relative space-y-4 text-center p-6 pt-2">
                 <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <span className="text-[10rem] font-serif text-muted-foreground select-none -translate-y-4">“</span>
                </div>
                <div className="relative">
                    <p className="font-['Amiri_Quran',_serif] text-xl text-foreground/90 leading-loose">{quote.content}</p>
                    <p className="text-xs italic text-muted-foreground text-right w-full pt-4 mt-4 border-t border-border/50">{quote.source}</p>
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end p-4 pt-0">
                 <Button variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    {quote.share}
                </Button>
            </CardFooter>
        </Card>
    );
}


function ResumeReadingWidget() {
    const { lastRead } = useQuranProgress();
    const { language } = useLanguage();
    const t = translations[language];
  
    if (!lastRead) {
      return null;
    }
  
    return (
      <div className="order-first md:order-none">
         <h2 className="text-xl font-bold font-headline px-2 mb-4 rtl:text-right">
            {t.resumeReading}
          </h2>
        <Card className="p-0">
            <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <BookMarked className="h-6 w-6 text-primary flex-shrink-0" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{t.lastRead}: {lastRead.surahName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.verse} {lastRead.verseNumber}
                        </p>
                    </div>
                </div>
                
                <Button asChild size="sm" className="rounded-full flex-shrink-0 ml-2">
                  <Link href={`/quran/${lastRead.surahNumber}#verse-${lastRead.verseNumber}`}>
                    {t.reprendre}
                    <ArrowRight className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0 rtl:rotate-180" />
                  </Link>
                </Button>
            </div>
        </Card>
      </div>
    );
}

export default function DashboardPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const { settings } = useAdhanSettings();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('playAdhan') === 'true') {
        const adhanType = params.get('type') || 'full';
        const voice = params.get('voice') as keyof typeof adhanUrls || settings.adhanVoice;
        
        let audioUrl = adhanUrls[voice] || adhanUrls.mekka;
        let shouldPlay = true;

        if (adhanType === 'bip') {
             audioUrl = 'https://www.soundjay.com/buttons/sounds/button-16.mp3'; // simple bip sound
        } else if (adhanType === 'silent') {
            shouldPlay = false;
        }

        if (shouldPlay) {
            const audio = new Audio(audioUrl);
            audio.play().catch(e => {
                console.error("La lecture de l'Adhan a échoué:", e);
                toast({
                    title: "Action requise",
                    description: "Veuillez cliquer n'importe où sur la page pour activer le son.",
                    duration: 5000,
                });
            });
        }
        
        router.replace('/dashboard', undefined, { shallow: true });
    }
  }, [router, toast, settings.adhanVoice]);
  
  return (
    <div className={cn("space-y-8", language === 'ar' && 'font-arabic')}>
      <Button onClick={() => alert('Connexion rétablie')}>TEST</Button>
      <div className="relative -m-4 sm:-m-6 mb-8 p-6 pt-20 rounded-b-[40px] flex justify-center" style={{background: 'linear-gradient(to bottom, #064e3b, #10b981)'}}>
        <div className="w-full max-w-2xl">
            <PrayerTimesCalculator />
        </div>
      </div>
      
      <ResumeReadingWidget />
      
      <div>
        <RemindersFeed />
      </div>

    </div>
  );
}
