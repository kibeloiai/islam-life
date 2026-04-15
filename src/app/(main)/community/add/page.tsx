
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  category: z.enum(['Mosquée', 'Restaurant Hallal', 'Commerce']),
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères.')
    .max(500, 'La description ne doit pas dépasser 500 caractères.'),
});

export default function AddPlacePage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Vous devez être connecté pour soumettre un lieu.',
      });
      router.push('/login');
      return;
    }

    setIsSubmitting(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!firestore) {
             toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Le service de base de données n'est pas disponible.",
            });
            setIsSubmitting(false);
            return;
        }
        const pendingPlacesRef = collection(firestore, 'pending_places');

        const newPlace = {
          ...values,
          latitude,
          longitude,
          addedByUserId: user.uid,
          status: 'pending',
          createdAt: serverTimestamp(),
        };

        addDocumentNonBlocking(pendingPlacesRef, newPlace)
          .then(() => {
            toast({
              title: 'Contribution reçue !',
              description:
                "Merci ! Votre suggestion a été envoyée pour révision.",
            });
            router.push('/map');
          })
          .catch((err: any) => {
            toast({
              variant: 'destructive',
              title: 'Erreur de soumission',
              description: err.message || "Une erreur s'est produite.",
            });
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      },
      (error) => {
        toast({
          variant: 'destructive',
          title: 'Erreur de géolocalisation',
          description:
            "Impossible d'obtenir votre position. Veuillez autoriser l'accès et réessayer.",
        });
        setIsSubmitting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirection gérée côté client pour éviter les erreurs de rendu serveur
    router.push('/login');
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Suggérer un nouveau lieu</CardTitle>
        <CardDescription>
          Aidez la communauté à découvrir de nouveaux endroits. Remplissez le formulaire ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du lieu</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Mosquée Al-Nour" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Mosquée">Mosquée</SelectItem>
                      <SelectItem value="Restaurant Hallal">
                        Restaurant Hallal
                      </SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Donnez quelques détails sur ce lieu (ex: spécialités, ambiance, produits...)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Soumettre pour révision
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
