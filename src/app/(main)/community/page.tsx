
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import type { Message } from '@/lib/types';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
    Loader2, 
    Send, 
    Heart, 
    MessageSquare, 
    Share2, 
    Lightbulb, 
    MapPin, 
    Users, 
    Moon,
    Paperclip,
    XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define tags for categorization
const tags = ['Idée', 'Sentiment', 'Endroit', 'Conseil', 'Rappel'] as const;
type Tag = typeof tags[number];

const tagStyles: Record<Tag, { icon: React.ElementType; className: string }> = {
  'Idée': { icon: Lightbulb, className: 'bg-chart-4/20 text-chart-4 border-chart-4/30' },
  'Sentiment': { icon: Heart, className: 'bg-chart-1/20 text-chart-1 border-chart-1/30' },
  'Endroit': { icon: MapPin, className: 'bg-chart-2/20 text-chart-2 border-chart-2/30' },
  'Conseil': { icon: Users, className: 'bg-primary/10 text-primary border-primary/20' },
  'Rappel': { icon: Moon, className: 'bg-chart-3/20 text-chart-3 border-chart-3/30' },
};


const messageSchema = z.object({
  text: z
    .string()
    .min(1, 'Le message ne peut pas être vide.')
    .max(500, 'Le message ne doit pas dépasser 500 caractères.'),
  tag: z.enum(tags),
});
type MessageFormValues = z.infer<typeof messageSchema>;

export default function CommunityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { text: '', tag: 'Rappel' },
  });

  const messagesQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, 'community_messages'), orderBy('createdAt', 'desc'))
        : null,
    [firestore, user]
  );
  const { data: messages, isLoading: isLoadingMessages } = useCollection<Message>(messagesQuery);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const acceptedImageTypes = ['image/jpeg', 'image/png'];
    const acceptedVideoTypes = ['video/mp4'];
    const isImage = acceptedImageTypes.includes(file.type);
    const isVideo = acceptedVideoTypes.includes(file.type);

    if (!isImage && !isVideo) {
        toast({ variant: 'destructive', title: 'Type de fichier non supporté', description: 'Veuillez sélectionner une image (PNG, JPG) ou une vidéo (MP4).' });
        return;
    }

    const maxSizeInMB = 10;
    if (file.size > maxSizeInMB * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Fichier trop volumineux', description: `Le fichier ne doit pas dépasser ${maxSizeInMB} Mo.` });
        return;
    }

    setFileToUpload(file);
    setMediaType(isImage ? 'image' : 'video');

    const reader = new FileReader();
    reader.onloadend = () => {
        setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFileToUpload(null);
    setFilePreview(null);
    setMediaType(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    if (!user || !firestore) return;

    setIsSubmitting(true);

    let mediaUrl: string | undefined = undefined;
    let finalMediaType: 'image' | 'video' | undefined = undefined;

    // --- Step 1: Upload to Storage (if a file is present) ---
    if (fileToUpload && mediaType) {
        try {
            const storage = getStorage();
            const filePath = `community_uploads/${user.uid}/${Date.now()}-${fileToUpload.name}`;
            const fileRef = storageRef(storage, filePath);
            
            await uploadBytes(fileRef, fileToUpload);
            
            mediaUrl = await getDownloadURL(fileRef);
            finalMediaType = mediaType;

        } catch (storageError) {
            console.error('Firebase Storage upload error:', storageError);
            toast({
                variant: 'destructive',
                title: 'Erreur de téléversement',
                description: "Votre média n'a pas pu être envoyé. Vérifiez votre connexion et les permissions de stockage."
            });
            setIsSubmitting(false);
            return; // Stop the process if storage upload fails
        }
    }

    // --- Step 2: Write to Firestore ---
    try {
        await addDoc(collection(firestore, 'community_messages'), {
            ...data,
            authorId: user.uid,
            authorName: user.displayName || 'Utilisateur anonyme',
            authorPhotoURL: user.photoURL,
            createdAt: serverTimestamp(),
            likes: [],
            commentCount: 0,
            ...(mediaUrl && { mediaUrl: mediaUrl, mediaType: finalMediaType }),
        });
        
        form.reset();
        removeFile();

    } catch (firestoreError) {
        console.error('Firestore write error:', firestoreError);
        toast({
            variant: 'destructive',
            title: "Erreur d'envoi du message",
            description: "Le message n'a pas pu être publié. Veuillez réessayer."
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleLike = async (messageId: string, currentLikes: string[]) => {
      if (!user || !firestore) return;
      const messageRef = doc(firestore, 'community_messages', messageId);
      const userHasLiked = currentLikes.includes(user.uid);
      
      try {
        if (userHasLiked) {
            await updateDoc(messageRef, { likes: arrayRemove(user.uid) });
        } else {
            await updateDoc(messageRef, { likes: arrayUnion(user.uid) });
        }
      } catch (error) {
          console.error("Error updating like:", error);
      }
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '..';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center space-y-4">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold font-headline">Rejoignez la conversation</h2>
        <p className="text-muted-foreground">
          Connectez-vous pour partager vos pensées, douas et inspirations avec la communauté.
        </p>
        <Button asChild>
          <Link href="/login">Connexion / Inscription</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="shadow-xl bg-card/90 dark:bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
             <Avatar className="h-12 w-12 border-2 border-primary/50">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold font-headline">Partagez un message, {user.displayName || 'cher ami'} !</h2>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Partagez une Doua, une pensée ou un rappel..."
                        {...field}
                        className="resize-none min-h-[100px] text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {filePreview && (
                <div className="relative w-full max-w-xs mt-4">
                    {mediaType === 'image' ? (
                        <Image src={filePreview} alt="Aperçu" width={400} height={300} className="rounded-lg object-cover" />
                    ) : (
                        <video src={filePreview} controls className="rounded-lg w-full" />
                    )}
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-6 w-6 z-10" onClick={removeFile}>
                        <XCircle className="h-4 w-4" />
                    </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <FormField
                      control={form.control}
                      name="tag"
                      render={({ field }) => (
                          <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Choisissez un tag" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {tags.map(tag => {
                                      const { icon: Icon } = tagStyles[tag];
                                      return (
                                          <SelectItem key={tag} value={tag}>
                                              <div className="flex items-center gap-2">
                                                  <Icon className="h-4 w-4" />
                                                  <span>{tag}</span>
                                              </div>
                                          </SelectItem>
                                      )
                                  })}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                </div>

                <div className="flex items-center gap-2 sm:self-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                        <Paperclip className="h-5 w-5" />
                        <span className="sr-only">Joindre un fichier</span>
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, video/mp4"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                    />
                    <Button type="submit" disabled={isSubmitting} className="h-10 rounded-full">
                        {isSubmitting ? ( <Loader2 className="animate-spin" /> ) : ( <Send /> )}
                        <span className="ml-2">Envoyer</span>
                    </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        {isLoadingMessages && user && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
        {messages?.map((message) => {
            const userHasLiked = user && message.likes?.includes(user.uid);
            const TagIcon = tagStyles[message.tag]?.icon || Lightbulb;
            const tagClassName = tagStyles[message.tag]?.className || tagStyles['Idée'].className;

            return (
          <Card key={message.id} className="overflow-hidden shadow-xl bg-card/90 dark:bg-card/60 backdrop-blur-sm transition-all hover:shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={message.authorPhotoURL || undefined} />
                  <AvatarFallback>{getInitials(message.authorName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold">{message.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                            {isClient && message.createdAt?.toDate &&
                            formatDistanceToNow(message.createdAt.toDate(), {
                                addSuffix: true,
                                locale: fr,
                            })}
                        </p>
                    </div>
                    <Badge className={cn("flex items-center gap-1.5 border", tagClassName)}>
                        <TagIcon className="h-3.5 w-3.5" />
                        {message.tag}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-2">
              <p className="text-foreground/90 whitespace-pre-wrap text-base leading-relaxed">{message.text}</p>
              {message.mediaUrl && (
                <div className="mt-4 rounded-lg overflow-hidden border">
                    {message.mediaType === 'image' ? (
                        <Image src={message.mediaUrl} alt="Contenu partagé" width={500} height={400} className="w-full h-auto object-cover" />
                    ) : message.mediaType === 'video' ? (
                        <video controls src={message.mediaUrl} className="w-full bg-black rounded-lg" />
                    ) : null}
                </div>
              )}
            </CardContent>
            <CardFooter className="py-2 flex items-center justify-start gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleLike(message.id, message.likes || [])} className="flex items-center gap-2 transition-all text-muted-foreground hover:text-primary">
                    <Heart className={cn('h-4 w-4', userHasLiked ? 'text-destructive fill-current' : '')} />
                    <span>{message.likes && message.likes.length > 0 ? message.likes.length : 'Amine'}</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                    <MessageSquare className="h-4 w-4" />
                    <span>{message.commentCount || 0}</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                    <Share2 className="h-4 w-4" />
                    <span>Partager</span>
                </Button>
            </CardFooter>
          </Card>
        )})}
      </div>
    </div>
  );
}

    