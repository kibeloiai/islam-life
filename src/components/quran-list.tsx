
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Surah } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuranProgress } from '@/hooks/use-quran-progress';
import { Progress } from '@/components/ui/progress';

interface QuranListComponentProps {
  surahs: Surah[];
}

/**
 * Affiche une liste de sourates avec une fonctionnalité de recherche.
 * @param surahs - Un tableau d'objets Surah.
 */
export function QuranListComponent({ surahs }: QuranListComponentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { progressData } = useQuranProgress();

  // Filtre les sourates en fonction du terme de recherche.
  // La recherche s'effectue sur le nom français, le nom arabe ou le numéro de la sourate.
  const filteredSurahs = surahs.filter(
    (surah) =>
      surah.nameFr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      surah.nameAr.includes(searchTerm) ||
      surah.number.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher une sourate (ex: Fatiha, 1, الفاتحة)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 w-full h-12 text-base"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSurahs.map((surah) => {
           const lastReadVerse = progressData[surah.number] || 0;
           const progressPercentage = (lastReadVerse / surah.versesCount) * 100;
          
          return (
            <Link
              href={`/quran/${surah.number}`}
              key={surah.number}
              className="group block"
            >
              <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary/10 text-primary font-bold rounded-lg group-hover:scale-110 transition-transform">
                        {surah.number}
                      </div>
                      <div>
                        <CardTitle className="font-headline text-lg">
                          {surah.nameFr}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {surah.nameAr}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                   <div className="flex items-center gap-2">
                    <Badge variant="secondary">{surah.revelation}</Badge>
                    <Badge variant="outline">{surah.versesCount} versets</Badge>
                  </div>
                   {progressPercentage > 0 && (
                    <div className='mt-4'>
                       <Progress value={progressPercentage} className="h-2 [&>div]:bg-accent" />
                        <span className="text-xs text-muted-foreground mt-1">
                        {Math.round(progressPercentage)}% complété
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {filteredSurahs.length === 0 && (
        <div className="text-center py-10 col-span-full">
          <p className="text-muted-foreground">
            Aucune sourate ne correspond à votre recherche.
          </p>
        </div>
      )}
    </div>
  );
}
