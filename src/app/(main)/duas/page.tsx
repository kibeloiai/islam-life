'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Dua, UserProfile } from '@/lib/types';
import { collection, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Loader2, Heart, ThumbsUp, Share2, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudio } from '@/context/audio-provider';


export default function DuasPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { playItem, currentItem, isPlaying } = useAudio();

  const duasQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'duas') : null), [firestore]);
  const { data: allDuas, isLoading } = useCollection<Dua>(duasQuery);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'user_profiles', user.uid) : null), [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const [activeFilter, setActiveFilter] = useState('Toutes');

  const categories = useMemo(() => {
    if (!allDuas) return ['Toutes'];
    const uniqueCategories = [...new Set(allDuas.map((d) => d.categoryName))];
    return ['Toutes', ...uniqueCategories.sort()];
  }, [allDuas]);

  const filteredDuas = useMemo(() => {
    if (!allDuas) return [];
    if (activeFilter === 'Toutes') return allDuas;
    return allDuas.filter((d) => d.categoryName === activeFilter);
  }, [allDuas, activeFilter]);

  const handleShare = (dua: Dua) => {
    const textToShare = `${dua.title}\n\n${dua.arabicText}\n\n${dua.phonetic}\n\n${dua.translation}`;
    if (navigator.share) {
      navigator.share({ title: dua.title, text: textToShare }).catch(console.error);
    } else {
      navigator.clipboard.writeText(textToShare);
      toast({ title: 'Copié !', description: 'Le contenu de la doua a été copié.' });
    }
  };

  const handleLike = async (duaId: string, currentLikes: string[] = []) => {
    if (!user || !firestore) { toast({ variant: 'destructive', description: "Connectez-vous pour aimer une doua." }); return; }
    const duaRef = doc(firestore, 'duas', duaId);
    try {
      await updateDoc(duaRef, { likes: currentLikes.includes(user.uid) ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    } catch (error) {
      console.error("Error updating like:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de mettre à jour le 'J'aime'." });
    }
  };

  const handleFavorite = async (duaId: string) => {
    if (!user || !userProfile || !firestore) { toast({ variant: 'destructive', description: "Connectez-vous pour gérer vos favoris." }); return; }
    const profileRef = doc(firestore, 'user_profiles', user.uid);
    try {
      await updateDoc(profileRef, { favoriteDuaIds: userProfile.favoriteDuaIds?.includes(duaId) ? arrayRemove(duaId) : arrayUnion(duaId) });
      toast({ title: userProfile.favoriteDuaIds?.includes(duaId) ? 'Retiré des favoris' : 'Ajouté aux favoris !' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de mettre à jour les favoris." });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des douas...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-lg font-semibold md:text-2xl font-headline mb-6">
        Bibliothèque de Douas
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => setActiveFilter(category)}
            variant={activeFilter === category ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="grid gap-6">
        {filteredDuas.map((dua) => {
          const userHasLiked = dua.likes?.includes(user?.uid || '');
          const isFavorited = userProfile?.favoriteDuaIds?.includes(dua.id);
          const isThisDuaPlaying = isPlaying && currentItem?.id === dua.id;


          return (
            <Card key={dua.id} className="shadow-lg bg-card/90 dark:bg-card/60 backdrop-blur-sm overflow-hidden">
                <CardHeader className="flex flex-row justify-between items-start">
                    <CardTitle className="text-lg font-headline">{dua.title}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleShare(dua)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <p className="text-2xl text-right font-arabic leading-loose">{dua.arabicText}</p>
                        <div className="border-t pt-2 flex items-center justify-end gap-0">
                            <Button variant="ghost" size="icon" onClick={() => handleLike(dua.id, dua.likes)} disabled={!user} className="rounded-full text-muted-foreground hover:text-primary">
                                <ThumbsUp className={cn('h-5 w-5', userHasLiked && 'text-primary fill-primary/20')} />
                                <span className="sr-only">Like</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleFavorite(dua.id)} disabled={!user} className="rounded-full text-muted-foreground hover:text-destructive">
                                <Heart className={cn('h-5 w-5', isFavorited && 'text-destructive fill-destructive')} />
                                <span className="sr-only">Favoris</span>
                            </Button>
                             <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => playItem({
                                    id: dua.id,
                                    title: dua.title,
                                    audioUrl: dua.audioUrl,
                                    textToSpeak: dua.arabicText
                                })}
                                className="rounded-full h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
                                >
                                {isThisDuaPlaying ? (
                                    <Pause className="h-5 w-5 animate-pulse fill-primary" />
                                ) : (
                                    <Play className="h-5 w-5" />
                                )}
                                <span className="sr-only">Play/Pause</span>
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm italic text-muted-foreground">{dua.phonetic}</p>
                    <p className="text-sm leading-relaxed">{dua.translation}</p>
                </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredDuas.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Aucune doua trouvée pour cette catégorie.</p>
        </div>
      )}
    </div>
  );
}
