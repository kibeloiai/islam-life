'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/hooks/use-location';
import { Loader2 } from 'lucide-react';
import { LocationSearchInput } from '@/components/location-search-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const GoogleMapsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
);

export default function MapPage() {
    const { location, isLoading: isLocationLoading } = useLocation();
    
    const googleMapsUrl = useMemo(() => {
        if (location?.city) {
            return `https://www.google.com/maps/search/mosquée+à+${encodeURIComponent(location.city)}`;
        }
        if (location) {
            return `https://www.google.com/maps/search/mosquée/@${location.latitude},${location.longitude},14z`;
        }
        return 'https://www.google.com/maps/search/mosquée';
    }, [location]);

    if (isLocationLoading && !location) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-4">
                <LocationSearchInput />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Trouver une mosquée</span>
                    </CardTitle>
                    <CardDescription>
                        Utilisez Google Maps pour trouver les mosquées près de votre emplacement actuel ou de la ville recherchée.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild variant="outline" className="w-full max-w-lg mx-auto h-12 text-base flex">
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                            <GoogleMapsIcon />
                            Ouvrir dans Google Maps
                        </a>
                    </Button>
                </CardContent>
            </Card>

        </div>
    );
}
