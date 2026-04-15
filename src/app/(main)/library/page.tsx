
'use client';

import { redirect } from 'next/navigation';

// This page is now obsolete, we redirect to the Quran page directly.
export default function LibraryPage() {
  redirect('/quran');
}
