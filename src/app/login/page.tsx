
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/logo';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.17-2.8-6.17-6.23s2.77-6.23 6.17-6.23c1.87 0 3.13.78 3.86 1.48l2.34-2.34C16.88 2.56 14.88 1.5 12.48 1.5 7.43 1.5 3.5 5.4 3.5 10.43s3.93 8.93 8.98 8.93c2.43 0 4.5-.8 6.03-2.33 1.6-1.6 2.3-3.8 2.3-6.28 0-.6-.05-1.18-.16-1.72h-8.2z" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const syncUserProfile = (user: User) => {
    if (!firestore) return;
    const userProfileRef = doc(firestore, 'user_profiles', user.uid);
    const profileData = {
      id: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0],
      photoURL: user.photoURL,
      // Default fields for a new profile
      favoriteMosqueIds: [],
      createdAt: serverTimestamp(),
    };
    // Use `merge: true` to create or update the profile without overwriting existing fields
    // like 'total_tasbih', 'language', etc.
    setDoc(userProfileRef, profileData, { merge: true }).catch(
      (firestoreError) => {
        console.error(
          'Erreur de synchronisation du profil utilisateur:',
          firestoreError
        );
        // We don't block the user for this, but we log the error
      }
    );
  };

  const handleAuthSuccess = (
    user: User,
    message: { title: string; description: string }
  ) => {
    syncUserProfile(user);
    toast(message);
    router.push('/dashboard');
  };

  const handleAuthError = (error: any) => {
    let title = "Erreur d'authentification";
    let description = 'Une erreur inconnue est survenue. Veuillez réessayer.';

    switch (error.code) {
      case 'auth/invalid-email':
        title = 'Email invalide';
        description = 'Veuillez saisir une adresse email valide.';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        title = 'Identifiants incorrects';
        description = "L'adresse email ou le mot de passe est incorrect.";
        break;
      case 'auth/email-already-in-use':
        title = 'Email déjà utilisé';
        description = 'Cette adresse email est déjà associée à un compte.';
        break;
      case 'auth/weak-password':
        title = 'Mot de passe faible';
        description = 'Le mot de passe doit contenir au moins 6 caractères.';
        break;
      case 'auth/popup-closed-by-user':
        title = 'Fenêtre fermée';
        description = "La fenêtre de connexion a été fermée avant la fin de l'opération.";
        break;
    }

    toast({
      variant: 'destructive',
      title: title,
      description: description,
    });
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Champs invalides',
        description: 'Veuillez saisir votre email et votre mot de passe.',
      });
      return;
    }
    setIsSubmitting(true);
    signInWithEmailAndPassword(auth, email, password)
      .then((credential) => {
        handleAuthSuccess(credential.user, {
          title: 'Connexion réussie',
          description: 'Bon retour parmi nous !',
        });
      })
      .catch(handleAuthError)
      .finally(() => setIsSubmitting(false));
  };

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Champs invalides',
        description:
          'Veuillez saisir un email et un mot de passe pour vous inscrire.',
      });
      return;
    }
    setIsSubmitting(true);
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // AuthSuccess handles profile creation and redirection
        handleAuthSuccess(userCredential.user, {
          title: 'Bienvenue !',
          description: 'Votre compte a été créé avec succès.',
        });
      })
      .catch(handleAuthError)
      .finally(() => setIsSubmitting(false));
  };

  const handleGoogleSignIn = () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        handleAuthSuccess(result.user, {
          title: 'Connexion réussie',
          description: 'Bon retour parmi nous !',
        });
      })
      .catch(handleAuthError)
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-headline">
            Connexion à IslamLife
          </CardTitle>
          <CardDescription>
            Entrez vos identifiants pour accéder à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
              )}
              Continuer avec Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continuer avec
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Link
                    href="#"
                    className="inline-block text-sm underline"
                    prefetch={false}
                  >
                    Mot de passe oublié?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Se connecter'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Vous n'avez pas de compte ?{' '}
              <button
                onClick={handleSignUp}
                className="underline"
                disabled={isSubmitting}
              >
                Inscrivez-vous
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
