'use client';

import { useAudio } from '@/context/audio-provider';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, X, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function GlobalAudioPlayer() {
  const { isPlaying, currentItem, currentTime, duration, togglePlayPause, seek, stop } = useAudio();

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const canSeek = duration > 0;

  if (!currentItem) {
    return null;
  }
  
  return (
    <div className="fixed bottom-[80px] sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md">
      <div
        className={cn(
          'p-3 sm:p-4 rounded-xl shadow-2xl bg-card/80 border border-border/50 backdrop-blur-lg transition-transform duration-300',
          currentItem ? 'translate-y-0' : 'translate-y-[150%]'
        )}
      >
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-lg flex-shrink-0" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-6 w-6 fill-primary text-primary" /> : <Play className="h-6 w-6" />}
            </Button>

            <div className="flex-1 space-y-1.5 overflow-hidden">
                <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-medium truncate text-foreground">{currentItem.title}</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-10 text-center">{formatTime(currentTime)}</span>
                    <Slider
                        value={[currentTime]}
                        max={duration}
                        step={1}
                        onValueChange={handleSeek}
                        disabled={!canSeek}
                        className={cn(!canSeek && "opacity-50 cursor-not-allowed")}
                    />
                    <span className="text-xs font-mono text-muted-foreground w-10 text-center">{canSeek ? formatTime(duration) : "-:--"}</span>
                </div>
            </div>

            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex-shrink-0" onClick={stop}>
                <X className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Stop</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
