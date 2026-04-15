'use client'; // Permet d'utiliser ce module côté client, par exemple dans un onClick

import {
  collection,
  doc,
  Firestore,
  writeBatch,
} from 'firebase/firestore';
import { quran, duas, reminders } from '@/lib/data';

/**
 * Initialise la base de données Firestore avec le contenu de base de l'application.
 * Cette fonction utilise un `writeBatch` pour effectuer toutes les écritures en une seule opération atomique,
 * ce qui est plus efficace et économique en termes de quotas Firestore.
 *
 * @param firestore - L'instance de Firestore à utiliser.
 */
export const initializeDatabase = async (firestore: Firestore) => {
  const batch = writeBatch(firestore);

  // 1. Initialisation des Sourates du Coran
  quran.forEach(surah => {
    const docRef = doc(firestore, 'quran', surah.number.toString());
    batch.set(docRef, surah);
  });
  
  // 2. Initialisation des Douas (Invocations)
  const duasCollectionRef = collection(firestore, 'duas');
  duas.forEach(dua => {
    const docRef = doc(duasCollectionRef);
    const duaData = {
      ...dua,
      likes: [],
      commentCount: 0,
    }
    batch.set(docRef, duaData);
  });

  // 3. Initialisation des Rappels
  const remindersCollectionRef = collection(firestore, 'reminders');
  reminders.forEach(reminder => {
    const docRef = doc(remindersCollectionRef);
    batch.set(docRef, reminder);
  });

  // On exécute toutes les opérations d'écriture en une seule fois.
  await batch.commit();
};
