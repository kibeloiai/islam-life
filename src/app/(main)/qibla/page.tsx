
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';
import { useLocation } from '@/hooks/use-location';

// Translations
const translations = {
    fr: {
        title: "Direction de la Qibla",
        calibrate_button: "🔘 ACTIVER LA BOUSSOLE",
        status_pending: "Demande d'accès aux capteurs...",
        status_active: "Boussole Active ✅",
        status_error: "⚠️ Accès bloqué par votre système. Allez dans Paramètres > Confidentialité > Mouvement sur votre téléphone.",
        status_unsupported: "Capteurs non supportés sur cet appareil.",
        qibla_direction: "Qibla",
        distance_to_kaaba: "Distance à la Kaaba",
        debug_heading: "Direction appareil",
        debug_angle: "Angle Qibla",
    },
    ar: {
        title: "اتجاه القبلة",
        calibrate_button: "🔘 تفعيل البوصلة",
        status_pending: "جاري طلب الوصول إلى المستشعرات...",
        status_active: "البوصلة نشطة ✅",
        status_error: "⚠️ الوصول محظور من قبل نظامك. اذهب إلى الإعدادات> الخصوصية> الحركة على هاتفك.",
        status_unsupported: "المستشعرات غير مدعومة على هذا الجهاز.",
        qibla_direction: "القبلة",
        distance_to_kaaba: "المسافة إلى الكعبة",
        debug_heading: "اتجاه الجهاز",
        debug_angle: "زاوية القبلة",
    },
    en: {
        title: "Qibla Direction",
        calibrate_button: "🔘 ACTIVATE COMPASS",
        status_pending: "Requesting sensor access...",
        status_active: "Compass Active ✅",
        status_error: "⚠️ Access blocked by your system. Go to Settings > Privacy > Motion on your phone.",
        status_unsupported: "Sensors not supported on this device.",
        qibla_direction: "Qibla",
        distance_to_kaaba: "Distance to Kaaba",
        debug_heading: "Device Heading",
        debug_angle: "Qibla Angle",
    }
};

const KAABA_LAT = 21.42247;
const KAABA_LON = 39.82620;

// Haversine formula for distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Great-circle bearing formula
function calculateQiblaAngle(lat: number, lon: number): number {
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    const kaabaLatRad = KAABA_LAT * Math.PI / 180;
    const kaabaLonRad = KAABA_LON * Math.PI / 180;
    const y = Math.sin(kaabaLonRad - lonRad);
    const x = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(kaabaLonRad - lonRad);
    const angle = Math.atan2(y, x);
    return (angle * 180 / Math.PI + 360) % 360;
}

export default function QiblaPage() {
    const { location, isLoading: isLocationLoading } = useLocation();
    const [qiblaAngle, setQiblaAngle] = useState<number>(0);
    const [deviceAngle, setDeviceAngle] = useState<number>(0);
    const [distance, setDistance] = useState<number>(0);
    const [sensorStatus, setSensorStatus] = useState<'idle' | 'pending' | 'active' | 'error' | 'unsupported'>('idle');
    const [showCompass, setShowCompass] = useState(false);

    const needleRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const { language } = useLanguage();
    const t = translations[language];

    useEffect(() => {
        if (location) {
            setQiblaAngle(calculateQiblaAngle(location.latitude, location.longitude));
            setDistance(calculateDistance(location.latitude, location.longitude, KAABA_LAT, KAABA_LON));
        }
    }, [location]);
    
    // Manual DOM update for smooth animation
    useEffect(() => {
        if (needleRef.current) {
            const needleRotation = qiblaAngle - deviceAngle;
            needleRef.current.style.transform = `rotate(${needleRotation}deg)`;
        }
    }, [deviceAngle, qiblaAngle]);


    const handleOrientation = (event: DeviceOrientationEvent) => {
        if (sensorStatus !== 'active') {
            setSensorStatus('active');
            setShowCompass(true);
        }

        const heading = (event as any).webkitCompassHeading;
        const alpha = event.alpha;

        let newAngle = 0;
        if (typeof heading !== 'undefined' && heading !== null) { // iOS
            newAngle = heading;
        } else if (typeof alpha !== 'undefined' && alpha !== null) { // Android & others
            newAngle = 360 - alpha;
        }
        
        setDeviceAngle(newAngle);
    };

    const requestPermissions = async () => {
        setSensorStatus('pending');

        // silent click sound to "wake up" browser
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const context = audioContextRef.current;
            const oscillator = context.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1, context.currentTime); 
            const gain = context.createGain();
            gain.gain.setValueAtTime(0.0001, context.currentTime);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.01);
        } catch (e) {
            console.warn("Could not play silent audio.", e);
        }
       
        // iOS 13+ permission request
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceOrientationEvent as any).requestPermission();
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation, true);
                    setSensorStatus('active');
                    setShowCompass(true);
                } else {
                    setSensorStatus('error');
                }
            } catch (err) {
                console.error(err);
                setSensorStatus('error');
            }
        } else { // Android & other browsers
            if ('DeviceOrientationEvent' in window) {
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                // Assume active, will switch to error if no events are received
                setTimeout(() => {
                    if (sensorStatus === 'pending') {
                        setSensorStatus('error');
                    }
                }, 3000);
            } else {
                setSensorStatus('unsupported');
            }
        }
    };
    
    return (
        <div className={cn("flex flex-col items-center justify-center min-h-full py-6 px-4 space-y-4 text-center", language === 'ar' && "font-arabic rtl")}>
            <h1 className="text-3xl font-bold font-headline">{t.title}</h1>

            {isLocationLoading ? (
                 <Loader2 className="h-8 w-8 animate-spin" />
            ): sensorStatus === 'idle' ? (
                <Button 
                    onClick={requestPermissions}
                    className="w-full max-w-sm h-20 text-xl font-bold animate-pulse"
                >
                    {t.calibrate_button}
                </Button>
            ) : null}

            {sensorStatus === 'pending' && (
                <div className="flex items-center space-x-2 text-lg">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>{t.status_pending}</span>
                </div>
            )}
            
            {(sensorStatus === 'error' || sensorStatus === 'unsupported') && (
                <div className="text-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg max-w-sm">
                    <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="font-semibold">{sensorStatus === 'error' ? t.status_error : t.status_unsupported}</p>
                </div>
            )}

            <div className={cn(
                "transition-opacity duration-500 flex flex-col items-center", 
                showCompass ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
                 {sensorStatus === 'active' && <p className="font-semibold text-lg text-green-500">{t.status_active}</p>}
                <div 
                    className="relative w-64 h-64 md:w-80 md:h-80 my-4"
                    style={{
                        transform: showCompass ? 'scale(1)' : 'scale(0.5)',
                        transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    {/* Compass background */}
                    <div className="w-full h-full rounded-full border-4 border-muted flex items-center justify-center bg-card shadow-inner">
                        <div className="absolute top-0 -mt-3 text-center font-bold text-lg">N</div>
                         {[...Array(12)].map((_, i) => (
                           <div key={i} className="absolute w-px h-full" style={{ transform: `rotate(${i * 30}deg)`}}>
                               <div className="w-px h-4 bg-muted-foreground/50 mx-auto"></div>
                           </div>
                        ))}
                    </div>

                    {/* Qibla Direction Needle */}
                    <div 
                        ref={needleRef}
                        className="absolute inset-0 flex justify-center" 
                        style={{ 
                            transformOrigin: 'center',
                            transition: 'transform 0.1s linear',
                        }}
                    >
                        <svg viewBox="0 0 24 24" className="w-16 h-full text-primary drop-shadow-lg" fill="currentColor">
                           <path d="M12 2L4.5 20.25h15L12 2z" />
                        </svg>
                         <div className="absolute top-6 text-3xl">🕋</div>
                    </div>
                </div>
                
                <div className="p-4 bg-card border rounded-2xl shadow w-full max-w-sm">
                    <p className="font-semibold">{t.qibla_direction}: <span className="font-mono text-primary text-xl">{qiblaAngle.toFixed(1)}°</span></p>
                    <p className="text-sm text-muted-foreground">{t.distance_to_kaaba}: {distance.toFixed(0)} km</p>
                </div>

                 <div className="text-xs text-muted-foreground font-mono mt-4 space-y-1 bg-card/50 p-2 rounded-md">
                    <p>{t.debug_heading}: {deviceAngle.toFixed(2)}°</p>
                    <p>{t.debug_angle}: {qiblaAngle.toFixed(2)}°</p>
                </div>
            </div>
        </div>
    );
}
