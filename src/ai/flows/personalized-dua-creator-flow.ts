'use server';
/**
 * @fileOverview A Genkit flow for generating personalized invocations (duas).
 *
 * - createPersonalizedDua - A function that generates a personalized dua.
 * - PersonalizedDuaCreatorInput - The input type for the createPersonalizedDua function.
 * - PersonalizedDuaCreatorOutput - The return type for the createPersonalizedDua function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedDuaCreatorInputSchema = z.object({
  situation: z
    .string()
    .describe(
      'A detailed description of the user\'s current situation or reason for the dua.'
    ),
  feelings: z
    .string()
    .describe('The emotions or feelings the user is currently experiencing.'),
  theme: z.string().describe('The spiritual theme or topic for the dua.'),
});
export type PersonalizedDuaCreatorInput = z.infer<
  typeof PersonalizedDuaCreatorInputSchema
>;

const PersonalizedDuaCreatorOutputSchema = z.object({
  duaTitle: z.string().describe('A concise and meaningful title for the dua.'),
  arabicText:
    z.string().describe('The complete Arabic text of the personalized dua.'),
  translation:
    z.string().describe('The English translation of the personalized dua.'),
  phonetic:
    z.string().describe('The phonetic transliteration of the Arabic dua.'),
  guidance: z
    .string()
    .optional()
    .describe(
      'Optional spiritual guidance or reflection related to the dua or situation.'
    ),
});
export type PersonalizedDuaCreatorOutput = z.infer<
  typeof PersonalizedDuaCreatorOutputSchema
>;

export async function createPersonalizedDua(
  input: PersonalizedDuaCreatorInput
): Promise<PersonalizedDuaCreatorOutput> {
  return personalizedDuaCreatorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedDuaCreatorPrompt',
  input: {schema: PersonalizedDuaCreatorInputSchema},
  output: {schema: PersonalizedDuaCreatorOutputSchema},
  prompt: `You are a compassionate spiritual guide specializing in crafting personalized invocations (duas) for Muslims.
Your task is to generate a meaningful dua based on the user's specific situation, feelings, and a chosen theme.

Craft a dua that is heartfelt, relevant, and spiritually uplifting. Ensure it includes an Arabic text, its English translation, and a phonetic transliteration. Optionally, provide a brief spiritual guidance or reflection.

User's Situation: {{{situation}}}
User's Feelings: {{{feelings}}}
Theme for Dua: {{{theme}}}

Generate the output in the specified JSON format.`,
});

const personalizedDuaCreatorFlow = ai.defineFlow(
  {
    name: 'personalizedDuaCreatorFlow',
    inputSchema: PersonalizedDuaCreatorInputSchema,
    outputSchema: PersonalizedDuaCreatorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
