
'use client';

import { QuranListComponent } from '@/components/quran-list';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Surah } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Page principale de la section Coran.
 * Cette page est un composant client qui récupère les données des sourates depuis Firestore.
 */
export default function QuranPage() {
  const firestore = useFirestore();
  
  const surahsQuery = useMemoFirebase(
    () => collection(firestore, 'quran'),
    [firestore]
  );
  const { data: surahs, isLoading } = useCollection<Surah>(surahsQuery);

  // Trier les sourates par leur numéro
  const sortedSurahs = useMemo(() => {
    return surahs ? [...surahs].sort((a, b) => a.number - b.number) : [];
  }, [surahs]);

  const SurahSkeleton = () => (
    <Card className="h-full flex flex-col">
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className='space-y-2'>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 pt-0 flex-1">
        <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">
          Le Saint Coran
        </h1>
      </div>

      {isLoading && !surahs ? (
        <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <SurahSkeleton key={i} />)}
            </div>
        </div>
      ) : (
        <QuranListComponent surahs={sortedSurahs} />
      )}
    </>
  );
}
