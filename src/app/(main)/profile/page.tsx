
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { getUserProfile, saveUserProfile } from '@/lib/user-service';
import type { UserProfile } from '@/lib/user-schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [username, setUsername] = useState('');
    const [city, setCity] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        async function fetchProfile() {
            if (!firestore) return;
            setIsLoading(true);
            const profile = await getUserProfile(firestore, user.uid);
            if (profile) {
                setUsername(profile.username || '');
                setCity(profile.city || '');
            }
            setIsLoading(false);
        }

        fetchProfile();
    }, [user, isUserLoading, firestore, router]);

    const handleSave = async () => {
        if (!user || !firestore) return;
        setIsSaving(true);
        const profileData: UserProfile = {
            uid: user.uid,
            username: username,
            city: city,
        };

        try {
            await saveUserProfile(firestore, profileData);
            toast({
                title: 'Profil mis à jour !',
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'La sauvegarde du profil a échoué.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || isUserLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <UserIcon />
                        Mon Profil
                    </CardTitle>
                    <CardDescription>
                        Mettez à jour vos informations personnelles.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username">Pseudo</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Votre pseudo"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Ex: Paris, France"
                            disabled={isSaving}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Enregistrer
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
