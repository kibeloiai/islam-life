
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Edit, User, Palette, Languages, MapPin, Calculator, Bell, Sliders, Minus, Plus, DatabaseZap } from 'lucide-react';
import type { UserProfile, CalculationMethod, PrayerKey, AlertType, AdhanVoice } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { LocationSearchInput } from '@/components/location-search-input';
import { calculationMethods, useAdhanSettings, adhanVoices, alertTypes } from '@/hooks/use-adhan-settings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { initializeDatabase } from '@/lib/setup';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const PRAYERS: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];


// Main component
export default function SettingsPage() {
    // Hooks
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { setLanguage } = useLanguage();
    const { 
        draftSettings, 
        updateCalculationMethod, 
        updatePrayerOffset,
        togglePrayer,
        updateAlertType,
        updateAdhanVoice,
        saveDraftSettings,
    } = useAdhanSettings();

    // State
    const [isSaving, setIsSaving] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [draftProfile, setDraftProfile] = useState<Partial<UserProfile>>({});
    const [draftDisplayName, setDraftDisplayName] = useState('');
    const [draftPhotoURL, setDraftPhotoURL] = useState('');

    // Firebase Doc
    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'user_profiles', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
    
    // Effects
    useEffect(() => {
        if (userProfile) {
            setDraftProfile(userProfile);
            setDraftDisplayName(userProfile.displayName || '');
            setDraftPhotoURL(userProfile.photoURL || '');
        }
    }, [userProfile]);

    const handleProfileFieldChange = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
        setDraftProfile(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSaveSettings = async () => {
        if (!user || !userProfileRef) return;
        setIsSaving(true);
        try {
            // Persist prayer calculation and notification settings
            saveDraftSettings(); 
            
            // Persist other settings to Firestore
            await updateDoc(userProfileRef, {
                language: draftProfile.language,
                theme: draftProfile.theme,
                hour12: draftProfile.hour12,
            });

            // Persist to localStorage for immediate effect
            if (draftProfile.language) {
                localStorage.setItem('language', draftProfile.language);
                setLanguage(draftProfile.language); // Update context
            }
            if (draftProfile.theme) {
                localStorage.setItem('theme', draftProfile.theme);
                // Force a reload to apply theme, simple but effective
                 window.location.reload();
            }
             if (draftProfile.hour12 !== undefined) {
                localStorage.setItem('hour12', JSON.stringify(draftProfile.hour12));
            }

            toast({ title: '✅ Réglages sauvegardés' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur lors de la sauvegarde' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveProfile = async () => {
        if (!user || !userProfileRef) return;
        setIsSaving(true);
        const auth = getAuth();
        try {
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName: draftDisplayName,
                    photoURL: draftPhotoURL,
                });
            }
            await updateDoc(userProfileRef, {
                displayName: draftDisplayName,
                photoURL: draftPhotoURL,
            });
             toast({ title: '✅ Profil mis à jour' });
             // The onAuthStateChanged listener will handle the UI update
        } catch(error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur de mise à jour du profil' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInitializeDb = async () => {
        if (!firestore) return;
        setIsInitializing(true);
        try {
            await initializeDatabase(firestore);
            toast({ title: '✅ Base de données initialisée', description: 'Les données de base (Coran, Douas, Rappels) ont été importées.' });
        } catch (e: any) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Erreur', description: e.message });
        } finally {
            setIsInitializing(false);
        }
    };

    const handleTestNotification = () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION' });
            toast({ title: 'Test envoyé', description: 'La notification de test devrait apparaître dans quelques secondes.' });
        } else {
            toast({ variant: 'destructive', title: 'Service non prêt', description: "Le service de notifications n'est pas encore actif. Essayez de recharger la page." });
        }
    };
    
    const getInitials = (name: string | null | undefined) => {
        if (!name) return '..';
        const parts = name.split(' ');
        return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
    };

    if (isUserLoading || isProfileLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-24">
            <Card className="bg-card/80 backdrop-blur-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><User /> Mon Profil</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={draftProfile?.photoURL || user?.photoURL || undefined} />
                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{getInitials(draftProfile?.displayName || user?.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="text-xl font-bold">{draftProfile?.displayName || user?.displayName}</p>
                        <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Edit className="mr-2 h-4 w-4" />Modifier</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Modifier le profil</DialogTitle>
                                <DialogDescription>Mettez à jour votre nom et votre photo de profil.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">Nom d'affichage</Label>
                                    <Input id="displayName" value={draftDisplayName} onChange={(e) => setDraftDisplayName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="photoURL">URL de la photo</Label>
                                    <Input id="photoURL" value={draftPhotoURL} onChange={(e) => setDraftPhotoURL(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" onClick={handleSaveProfile} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                                        Enregistrer
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
            
             <Card className="bg-card/80 backdrop-blur-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Palette /> Apparence</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <Label>Thème</Label>
                         <Select value={draftProfile.theme || 'auto'} onValueChange={(value: 'light'|'dark'|'auto') => handleProfileFieldChange('theme', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Clair</SelectItem>
                                <SelectItem value="dark">Sombre</SelectItem>
                                <SelectItem value="auto">Système</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
             <Card className="bg-card/80 backdrop-blur-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Languages /> Préférences Générales</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Langue</Label>
                        <Select value={draftProfile.language || 'fr'} onValueChange={(value: 'fr'|'ar'|'en') => handleProfileFieldChange('language', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="ar">العربية</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Format de l'heure</Label>
                        <div className="flex items-center space-x-2 pt-2">
                            <span>24h</span>
                            <Switch checked={draftProfile.hour12} onCheckedChange={(checked) => handleProfileFieldChange('hour12', checked)} />
                            <span>12h</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Calculator /> Calcul des Prières</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Méthode de calcul</Label>
                        <Select value={draftSettings.calculationMethod} onValueChange={(v: CalculationMethod) => updateCalculationMethod(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(calculationMethods).map(([key, value]) => (
                                    <SelectItem key={key} value={key}>{value.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Emplacement pour le calcul</Label>
                        <LocationSearchInput />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-lg">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Bell /> Notifications des prières</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                         <Label>Voix de l'Adhan</Label>
                        <Select value={draftSettings.adhanVoice} onValueChange={(v: AdhanVoice) => updateAdhanVoice(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(adhanVoices).map(([key, value]) => (
                                    <SelectItem key={key} value={key as AdhanVoice}>{value.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-4">
                        {PRAYERS.map(prayer => (
                            <div key={prayer} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 gap-3">
                                <Label htmlFor={`switch-${prayer}`} className="text-base font-medium">{prayer}</Label>
                                <div className="flex w-full sm:w-auto items-center justify-end gap-4">
                                    <Select
                                        value={draftSettings.alertTypes[prayer]}
                                        onValueChange={(v: AlertType) => updateAlertType(prayer, v)}
                                        disabled={!draftSettings.enabledPrayers[prayer]}
                                    >
                                        <SelectTrigger className="w-full min-w-[150px] sm:w-[180px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(alertTypes).map(([key, value]) => (
                                                <SelectItem key={key} value={key as AlertType}>{value.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Switch
                                        id={`switch-${prayer}`}
                                        checked={draftSettings.enabledPrayers[prayer]}
                                        onCheckedChange={() => togglePrayer(prayer)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="pt-4">
                        <Button onClick={handleTestNotification} variant="outline">
                            <Bell className="mr-2 h-4 w-4" />
                            Tester la notification
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Sliders /> Ajustements manuels (en minutes)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {PRAYERS.map(prayer => (
                        <div key={prayer} className="flex items-center justify-between rounded-lg border p-3">
                            <Label className="text-base font-medium">{prayer}</Label>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updatePrayerOffset(prayer, draftSettings.offsets[prayer] - 1)}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                    type="number"
                                    className="w-16 h-8 text-center"
                                    value={draftSettings.offsets[prayer]}
                                    onChange={(e) => updatePrayerOffset(prayer, parseInt(e.target.value) || 0)}
                                />
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updatePrayerOffset(prayer, draftSettings.offsets[prayer] + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                     ))}
                </CardContent>
            </Card>

            <Card className="bg-destructive/10 border-destructive/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-destructive"><DatabaseZap /> Zone Développeur</CardTitle>
                </CardHeader>
                <CardContent>
                     <Alert variant="destructive">
                        <AlertTitle>Attention</AlertTitle>
                        <AlertDescription>
                           Cette action réécrira les données de base de l'application (Coran, Douas, Rappels). Utilisez-la uniquement pour une nouvelle installation ou pour corriger des données manquantes.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={handleInitializeDb} disabled={isInitializing} variant="destructive" className="mt-4">
                        {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <DatabaseZap className="mr-2 h-4 w-4" />}
                        Initialiser la base de données
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                 <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Enregistrer les réglages
                </Button>
            </div>
        </div>
    );
}
