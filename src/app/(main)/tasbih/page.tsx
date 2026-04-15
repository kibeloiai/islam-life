
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const translations = {
  fr: {
    title: 'Tasbih Numérique',
    description: 'Comptez votre Dhikr. Votre progression est automatiquement sauvegardée.',
    description_guest: 'Comptez votre Dhikr. Connectez-vous pour sauvegarder votre progression.',
    reset: 'Réinitialiser',
    resetSuccess: 'Compteur réinitialisé.',
  },
  ar: {
    title: 'التسبيح الرقمي',
    description: 'احسب ذكرك. يتم حفظ تقدمك تلقائيًا.',
    description_guest: 'احسب ذكرك. سجل الدخول لحفظ تقدمك.',
    reset: 'إعادة تعيين',
    resetSuccess: 'تمت إعادة تعيين العداد.',
  },
  en: {
    title: 'Digital Tasbih',
    description: 'Count your Dhikr. Your progress is automatically saved.',
    description_guest: 'Count your Dhikr. Log in to save your progress.',
    reset: 'Reset',
    resetSuccess: 'Counter reset.',
  },
};

export default function TasbihPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = translations[language];

  const [count, setCount] = useState(0);
  
  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'user_profiles', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && user && userProfile) {
      setCount(userProfile.total_tasbih || 0);
    }
  }, [user, userProfile, isUserLoading]);

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (userProfileRef) {
      setDocumentNonBlocking(userProfileRef, { total_tasbih: newCount }, { merge: true });
    }
  };

  const handleReset = () => {
    setCount(0);
    if (userProfileRef) {
      setDocumentNonBlocking(userProfileRef, { total_tasbih: 0 }, { merge: true });
    }
    toast({ title: t.resetSuccess });
  };
  
  const isLoading = isUserLoading || (user && isProfileLoading);

  return (
    <div className={cn("flex justify-center items-center h-full p-4", language === 'ar' && "rtl font-arabic")}>
      <Card className="w-full max-w-md mx-auto shadow-2xl bg-card/90 dark:bg-card/60 backdrop-blur-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">{t.title}</CardTitle>
          <CardDescription>
            {user ? t.description : t.description_guest}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-8 py-12">
          { isLoading ? (
            <div className="h-64 w-64 flex justify-center items-center">
              <Loader2 className="h-24 w-24 animate-spin text-primary" />
            </div>
          ) : (
            <button
              onClick={handleIncrement}
              className="h-64 w-64 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-7xl font-bold font-mono shadow-2xl transition-transform duration-150 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/50"
              aria-label="Increment count"
            >
              {count.toLocaleString()}
            </button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
            <Button variant="ghost" onClick={handleReset} className="gap-2 text-muted-foreground hover:text-destructive">
                <RotateCcw />
                {t.reset}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
