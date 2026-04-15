
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Check, MapPin } from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import type { LocationInfo } from '@/hooks/use-location';
import { useToast } from '@/hooks/use-toast';
import useDebounce from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface Suggestion {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export function LocationSearchInput({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const { location, setLocation } = useLocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFocused && location) {
        setSearchQuery(`${location.city}, ${location.country}`);
    } else if (!location) {
        setSearchQuery('');
    }
  }, [location, isFocused]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedSearchQuery.length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSuggesting(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearchQuery)}&limit=5&featuretype=city&accept-language=fr`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setSuggestions(data || []);
      } catch (error) {
        console.error("Suggestion fetch error:", error);
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    };

    if (isFocused) {
        fetchSuggestions();
    }
  }, [debouncedSearchQuery, isFocused]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const parts = suggestion.display_name.split(', ');
    const newLocation: LocationInfo = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      altitude: null, // Nominatim doesn't give altitude
      city: parts[0],
      country: parts[parts.length - 1],
      source: 'manual',
    };
    setLocation(newLocation);
    setSearchQuery(`${newLocation.city}, ${newLocation.country}`);
    setSuggestions([]);
    setIsFocused(false);
  };
  
  const handleSubmit = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!searchQuery) return;
      
      if (suggestions.length > 0) {
          handleSelectSuggestion(suggestions[0]);
          return;
      }

      setIsSuggesting(true);
      try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&featuretype=city&accept-language=fr`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (!data || data.length === 0) throw new Error("City not found");
            handleSelectSuggestion(data[0]);

      } catch (error) {
            console.error("Manual city search error:", error);
            toast({ variant: 'destructive', title: 'Ville non trouvée', description: 'Veuillez vérifier l\'orthographe et réessayer.' });
      } finally {
        setIsSuggesting(false);
      }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSubmit(e as any);
    }
  };

  const inputStyle = variant === 'minimal' 
    ? "text-zinc-700 dark:text-zinc-400 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 text-2xl font-bold tracking-tight bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
    : "w-full h-12 text-base pl-10 pr-10";

  return (
    <div className="relative w-full max-w-lg" ref={containerRef}>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="relative flex-1">
            {variant === 'default' && <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
            <Input
                type="text"
                placeholder="Rechercher une ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                className={inputStyle}
            />
            {isSuggesting && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
        </div>
        {variant === 'default' && (
            <Button type="submit" size="icon" className="h-12 w-12 flex-shrink-0" disabled={isSuggesting || !searchQuery}>
                <Check className="h-6 w-6" />
            </Button>
        )}
      </form>

      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border rounded-lg shadow-lg z-50">
            <ul>
                {suggestions.map((s) => (
                    <li key={s.place_id}>
                        <button
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-4 py-3 hover:bg-muted flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
                        >
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{s.display_name}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
}

    

    

    