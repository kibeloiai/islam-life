'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useQuranProgress } from '@/hooks/use-quran-progress';
import { cn } from '@/lib/utils';

// --- Types ---
interface AyahFromAPI {
  numberInSurah: number;
  text: string;
  juz: number;
}

interface SurahEdition {
  number: number;
  name: string;
  englishName: string; // Used for french name here
  revelationType: string;
  numberOfAyahs: number;
  ayahs: AyahFromAPI[];
}

interface MergedVerse {
  number: number;
  textAr: string;
  juz: number;
}

interface SurahInfo {
  number: number;
  nameFr: string;
  nameAr: string;
  revelation: string;
  versesCount: number;
}

interface VerseTiming {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
}

// --- Constants ---
const VERSES_PER_PAGE = 10;
const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

// --- Main Page Component ---
export default function SurahPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const surahId = parseInt(id, 10);

  // --- State Management ---
  const [allVerses, setAllVerses] = useState<MergedVerse[]>([]);
  const [surahInfo, setSurahInfo] = useState<SurahInfo | null>(null);
  const [verseTimings, setVerseTimings] = useState<VerseTiming[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeVerseNumber, setActiveVerseNumber] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [isUIVisible, setIsUIVisible] = useState(true);
  const uiVisibilityTimer = useRef<NodeJS.Timeout | null>(null);

  const { setProgress } = useQuranProgress();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // --- Scroll Logic ---
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentPage, surahId]);


  // --- Navigation & Audio Chaining ---
  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPage < totalPages) {
      setCurrentPage(c => c + 1);
    } else if (surahId < 114) {
      const isPlaying = audioRef.current && !audioRef.current.paused;
      router.push(`/quran/${surahId + 1}${isPlaying ? '?autoplay=true' : ''}`);
    }
  };

  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPage > 1) {
      setCurrentPage(c => c - 1);
    } else if (surahId > 1) {
      const isPlaying = audioRef.current && !audioRef.current.paused;
      router.push(`/quran/${surahId - 1}${isPlaying ? '?autoplay=true' : ''}`);
    }
  };

  const handleAudioEnded = () => {
    if (surahId < 114) {
      router.push(`/quran/${surahId + 1}?autoplay=true`);
    } else {
      setActiveVerseNumber(null);
    }
  };

  // --- UI Visibility Logic ---
  const hideUI = useCallback(() => {
    setIsUIVisible(false);
  }, []);

  const toggleUIVisibility = useCallback(() => {
      setIsUIVisible(prev => {
          const nextState = !prev;
          if (uiVisibilityTimer.current) {
              clearTimeout(uiVisibilityTimer.current);
          }
          if (nextState) {
              uiVisibilityTimer.current = setTimeout(hideUI, 3000);
          }
          return nextState;
      });
  }, [hideUI]);

  useEffect(() => {
      uiVisibilityTimer.current = setTimeout(hideUI, 3000);
      return () => {
          if (uiVisibilityTimer.current) {
              clearTimeout(uiVisibilityTimer.current);
          }
      };
  }, [hideUI]);

  // --- Data Fetching ---
  useEffect(() => {
    if (isNaN(surahId) || surahId < 1 || surahId > 114) {
      notFound();
      return;
    }
    
    setActiveVerseNumber(null);
    setCurrentPage(1);

    const fetchAndProcessData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const textPromise = fetch(`https://api.alquran.cloud/v1/surah/${surahId}`);
        const timingsPromise = fetch(`https://api.quran.com/api/v4/quran/verses/by_chapter/${surahId}?words=false&recitation=7&timing=true`);
        
        const [textResponse, timingsResponse] = await Promise.all([textPromise, timingsPromise]);

        if (!textResponse.ok) throw new Error(`Erreur de chargement de la sourate (texte).`);
        if (!timingsResponse.ok) console.warn("L'API de synchronisation (timestamps) a échoué, le surlignage sera désactivé.");

        const textApiData = await textResponse.json();
        if (textApiData.code !== 200) throw new Error("Réponse invalide de l'API (texte).");
        
        const surahData = textApiData.data as SurahEdition;

        setSurahInfo({
          number: surahId,
          nameFr: surahData.englishName,
          nameAr: surahData.name,
          revelation: surahData.revelationType,
          versesCount: surahData.numberOfAyahs,
        });
        
        const merged: MergedVerse[] = surahData.ayahs.map((ayah) => {
          return {
            number: ayah.numberInSurah,
            textAr: ayah.text,
            juz: ayah.juz,
          };
        });
        
        setAllVerses(merged);
        setTotalPages(Math.ceil(surahData.numberOfAyahs / VERSES_PER_PAGE));

        if (timingsResponse.ok) {
          const timingsApiData = await timingsResponse.json();
          const timings = timingsApiData.verses.map((v: any) => v.timestamps).flat();
          setVerseTimings(timings);
        } else {
          setVerseTimings([]);
        }

      } catch (e: any) {
        setError(e.message || "Une erreur est survenue.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAndProcessData();
  }, [surahId]);

  // --- Autoplay Effect ---
  useEffect(() => {
    const audioEl = audioRef.current;
    const shouldAutoplay = new URLSearchParams(window.location.search).get('autoplay') === 'true';

    if (shouldAutoplay && audioEl) {
      const handleCanPlay = () => {
        audioEl.play().catch(e => console.error("Autoplay failed", e));
        window.history.replaceState(null, '', `/quran/${surahId}`);
      };

      if (audioEl.readyState >= 3) {
        handleCanPlay();
      } else {
        audioEl.addEventListener('canplay', handleCanPlay, { once: true });
      }

      return () => {
        if (audioEl) {
          audioEl.removeEventListener('canplay', handleCanPlay);
        }
      };
    }
  }, [surahId]);

  // --- Auto-scroll Effect for active verse ---
  useEffect(() => {
    if (activeVerseNumber) {
      const activeElement = document.getElementById(`verse-${activeVerseNumber}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeVerseNumber]);

  // --- Audio Logic & Listeners ---
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleTimeUpdate = () => {
      if (verseTimings.length === 0 || !audioEl) return;
    
      const currentTimeMs = audioEl.currentTime * 1000;
      
      const activeVerse = verseTimings.find(
        (timing) => currentTimeMs >= timing.timestamp_from && currentTimeMs <= timing.timestamp_to
      );

      if (activeVerse) {
        const verseNum = parseInt(activeVerse.verse_key.split(':')[1], 10);
        
        setActiveVerseNumber(currentActive => {
          if (verseNum !== currentActive) {
            if (surahInfo) {
              setProgress(surahInfo.number, verseNum, surahInfo.nameFr, surahInfo.versesCount);
            }
            const targetPage = Math.floor((verseNum - 1) / VERSES_PER_PAGE) + 1;
            if (targetPage !== currentPage) {
              setCurrentPage(targetPage);
            }
            return verseNum;
          }
          return currentActive;
        });
      }
    };

    audioEl.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (audioEl) {
        audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [verseTimings, setProgress, surahInfo, currentPage]);
  
  // --- Memoized Derived State ---
  const displayedVerses = useMemo(() => {
      const startIndex = (currentPage - 1) * VERSES_PER_PAGE;
      const endIndex = startIndex + VERSES_PER_PAGE;
      return allVerses.slice(startIndex, endIndex);
  }, [allVerses, currentPage]);
  
  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-8 bg-[#FCF9F2] dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="mt-4 text-lg text-primary/80">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10 text-center text-destructive bg-[#FCF9F2] dark:bg-gray-950">
        <AlertTriangle className="h-10 w-10 mb-4" />
        <p className="font-semibold text-xl">Erreur de chargement</p>
        <p className="text-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6">
          Réessayer
        </Button>
      </div>
    );
  }
  
  if (!surahInfo) return null;

  const showBasmalaHeader = surahId !== 9 && surahId !== 1 && currentPage === 1;
  
  return (
    <div className="h-full bg-[#FCF9F2] dark:bg-gray-950 text-black" onTouchStart={toggleUIVisibility} onClick={toggleUIVisibility}>
      
      {/* TOP UI CONTAINER (HEADER) */}
      <div className={cn(
          "fixed top-16 left-0 right-0 z-30 bg-background border-b transition-all duration-300 ease-in-out",
          isUIVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      )}>
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3">
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-[#8B7355] dark:text-amber-300/80">
                {displayedVerses[0]?.juz ? `Juz' ${displayedVerses[0].juz}` : ' '}
              </p>
            </div>
            <div className="flex-1 text-center">
                <p className="text-xl font-arabic text-amber-800 dark:text-amber-300">{surahInfo.nameAr}</p>
            </div>
            <div className="flex-1 flex justify-end items-center gap-2 text-sm font-semibold text-[#8B7355] dark:text-amber-300/80">
               <p>{currentPage}/{totalPages}</p>
            </div>
        </div>
      </div>

      {/* BOTTOM UI CONTAINER (AUDIO) */}
      <div className={cn(
          "fixed bottom-16 left-0 right-0 z-30 bg-background border-t transition-all duration-300 ease-in-out",
          isUIVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
      )}>
         {/* AUDIO PLAYER */}
        <div className="px-4 py-2">
            <audio
                ref={audioRef}
                id="main-quran-player"
                controls
                crossOrigin="anonymous"
                src={`https://server8.mp3quran.net/afs/${String(surahId).padStart(3, '0')}.mp3`}
                className="w-full compact-audio-player"
                onEnded={handleAudioEnded}
            />
        </div>
      </div>
      
      {/* MAIN CONTENT AREA (SCROLLABLE VERSES) */}
      <div className="h-full overflow-y-auto" ref={contentRef}>
        <div dir="rtl" className="px-4 pt-8 pb-8">
            
            {/* --- BASMALA HEADER --- */}
            {showBasmalaHeader && (
              <p className="font-arabic text-center text-2xl mb-6 text-amber-800 dark:text-amber-300" style={{ fontFamily: "'Amiri Quran', serif" }}>
                {BASMALA}
              </p>
            )}

            {/* --- VERSES CONTAINER --- */}
            <p
                className="font-arabic text-justify text-black dark:text-gray-200"
                style={{ fontFamily: "'Amiri Quran', serif", fontSize: '1.6rem', lineHeight: 3.2 }}
            >
                {displayedVerses.map((verse) => {
                  let verseText = verse.textAr;
                  
                  // If the Basmala header is shown, we must remove the Basmala prefix from the first verse's text
                  // to avoid duplication. This only applies to the very first verse of the surah.
                  if (showBasmalaHeader && verse.number === 1) {
                      const basmalaPattern = /^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/;
                      verseText = verseText.replace(basmalaPattern, "");
                  }

                  if (verseText === '') return null;
                  
                  const isActive = activeVerseNumber === verse.number;

                  return (
                    <span 
                        key={verse.number} 
                        id={`verse-${verse.number}`}
                        className={cn(
                            "transition-colors duration-500 p-1",
                            isActive && "bg-[#fff7d1] dark:bg-yellow-900/30 rounded-md"
                        )}
                    >
                        <span className={cn(isActive && "font-bold")}>
                           {verseText}
                        </span>
                        <span className="font-sans text-sm text-green-700/80 dark:text-green-400/80 mr-1">
                            ({verse.number})
                        </span>
                    </span>
                  );
                })}
            </p>
        </div>
      </div>

       {/* LATERAL NAVIGATION BUTTONS (RTL book style) */}
       <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextPage} // Left button for NEXT page
            disabled={currentPage === totalPages && surahId === 114}
            className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
        >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8 text-foreground/70" />
            <span className="sr-only">Page suivante</span>
        </Button>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevPage} // Right button for PREVIOUS page
            disabled={currentPage === 1 && surahId === 1}
            className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20"
        >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8 text-foreground/70" />
            <span className="sr-only">Page précédente</span>
        </Button>

    </div>
  );
}
