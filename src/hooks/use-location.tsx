'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';

export interface LocationInfo {
    latitude: number;
    longitude: number;
    altitude: number | null;
    city: string;
    country: string;
    source: 'gps' | 'manual' | 'storage' | 'default';
}

interface LocationContextType {
    location: LocationInfo | null;
    setLocation: (location: LocationInfo) => void;
    resetLocation: () => void;
    isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const LOCATION_STORAGE_KEY = 'user_location';
const HYERES_DEFAULT: LocationInfo = { latitude: 43.1205, longitude: 6.1286, altitude: 0, city: 'Hyères', country: 'France', source: 'default' };

export const LocationProvider = ({ children }: { children: ReactNode }) => {
    const [location, setLocationState] = useState<LocationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const resolveLocation = useCallback(() => {
        setIsLoading(true);
        const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (storedLocation) {
            try {
                const parsed = JSON.parse(storedLocation);
                setLocationState({ ...parsed, source: 'storage', altitude: parsed.altitude ?? null });
                setIsLoading(false);
                return;
            } catch (e) {
                console.error("Failed to parse stored location", e);
            }
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude, altitude } = position.coords;
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`);
                        const data = await response.json();
                        const newLocation: LocationInfo = {
                            latitude,
                            longitude,
                            altitude,
                            city: data.address.city || data.address.town || data.address.village || 'Position actuelle',
                            country: data.address.country,
                            source: 'gps'
                        };
                        setLocationState(newLocation);
                        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
                    } catch (e) {
                        console.error("Reverse geocoding failed, using Hyères", e);
                        setLocationState(HYERES_DEFAULT);
                    } finally {
                        setIsLoading(false);
                    }
                },
                (error) => {
                    console.warn("Geolocation permission denied, using Hyères default.", error);
                    setLocationState(HYERES_DEFAULT);
                    setIsLoading(false);
                },
                { timeout: 5000, enableHighAccuracy: true }
            );
        } else {
            console.warn("Geolocation not supported, using Hyères default.");
            setLocationState(HYERES_DEFAULT);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        resolveLocation();
    }, [resolveLocation]);

    const setLocation = useCallback((newLocation: LocationInfo) => {
        setLocationState(newLocation);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(newLocation));
    }, []);

    const resetLocation = useCallback(() => {
        localStorage.removeItem(LOCATION_STORAGE_KEY);
        resolveLocation(); // Re-run the logic to get GPS or default
    }, [resolveLocation]);

    const value = { location, setLocation, resetLocation, isLoading };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
