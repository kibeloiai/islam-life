'use client';

import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

interface PlaybackItem {
  id: string;
  audioUrl?: string;
  text: string;
}

interface MiniAudioPlayerProps {
  item: PlaybackItem;
  activeId: string | null;
  isPlaying: boolean;
  toggle: (item: PlaybackItem) => void;
}

export function MiniAudioPlayer({ item, activeId, isPlaying, toggle }: MiniAudioPlayerProps) {
  const isCurrentlyPlaying = isPlaying && activeId === item.id;
  
  // The player is always enabled if there's text to speak
  const isDisabled = !item.audioUrl && !item.text;

  if (isDisabled) {
    return (
        <Button variant="ghost" size="icon" disabled className="rounded-full h-9 w-9 text-muted-foreground/50">
            <Play className="h-5 w-5" />
        </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggle(item)}
      className="rounded-full h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
    >
      {isCurrentlyPlaying ? (
        <Pause className="h-5 w-5 animate-pulse fill-primary" />
      ) : (
        <Play className="h-5 w-5" />
      )}
      <span className="sr-only">Play/Pause</span>
    </Button>
  );
}
