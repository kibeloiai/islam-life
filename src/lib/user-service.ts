'use client';

import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import type { UserProfile } from './user-schema';

// Use the existing collection name which has security rules set up.
const USERS_COLLECTION = 'user_profiles';

/**
 * Retrieves a user profile from Firestore.
 * @param firestore - The Firestore instance.
 * @param uid - The user's unique ID.
 * @returns A Promise that resolves to the UserProfile or null if not found.
 */
export const getUserProfile = async (firestore: Firestore, uid: string): Promise<UserProfile | null> => {
  const docRef = doc(firestore, USERS_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // Note: This casts the data to the new UserProfile interface.
    // Ensure the data in Firestore is compatible.
    return docSnap.data() as UserProfile;
  } else {
    return null;
  }
};

/**
 * Saves a user profile to Firestore using the UserProfile interface.
 * Creates the document if it doesn't exist, or merges the data if it does.
 * @param firestore - The Firestore instance.
 * @param profile - The UserProfile object to save (must include uid).
 * @returns A Promise that resolves when the operation is complete.
 */
export const saveUserProfile = async (firestore: Firestore, profile: UserProfile): Promise<void> => {
  const docRef = doc(firestore, USERS_COLLECTION, profile.uid);
  // Using { merge: true } prevents overwriting existing fields 
  // not defined in the new UserProfile interface (like email, total_tasbih, etc.)
  await setDoc(docRef, profile, { merge: true });
};
