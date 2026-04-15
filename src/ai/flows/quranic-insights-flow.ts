'use server';
/**
 * @fileOverview This file provides an AI-powered Genkit flow to offer concise explanations
 * and contextual insights for selected Quranic verses or summaries of entire Surahs.
 *
 * - getQuranicInsights - The main function to request insights.
 * - QuranicInsightsInput - The input type for the getQuranicInsights function.
 * - QuranicInsightsOutput - The return type for the getQuranicInsights function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuranicInsightsInputSchema = z.discriminatedUnion('contextType', [
  z.object({
    contextType: z.literal('verse').describe('Indicates that the request is for a specific Quranic verse explanation.'),
    surahName: z.string().describe('The name of the Surah (e.g., Al-Fatiha).'),
    verseNumber: z.number().int().positive().describe('The number of the verse within the Surah.'),
    verseText: z.string().describe('The Arabic text of the Quranic verse.'),
    translation: z.string().optional().describe('The English translation of the verse, if available.'),
  }),
  z.object({
    contextType: z.literal('surah').describe('Indicates that the request is for a summary of a complete Surah.'),
    surahName: z.string().describe('The name of the Surah (e.g., Al-Baqarah).'),
    surahSummaryText: z.string().describe('A summary or the full text of the Surah to be summarized. If providing full text, ensure it is within token limits.'),
  }),
]);
export type QuranicInsightsInput = z.infer<typeof QuranicInsightsInputSchema>;

const QuranicInsightsOutputSchema = z.object({
  title: z.string().describe('A concise and informative title for the explanation or summary.'),
  explanation: z.string().describe('A clear and concise explanation or summary of the Quranic text, providing contextual insights and meaning.'),
  keyTakeaways: z.array(z.string()).describe('A list of key insights or moral lessons derived from the text.'),
  relatedThemes: z.array(z.string()).optional().describe('A list of related theological or ethical themes, if applicable.'),
});
export type QuranicInsightsOutput = z.infer<typeof QuranicInsightsOutputSchema>;

export async function getQuranicInsights(input: QuranicInsightsInput): Promise<QuranicInsightsOutput> {
  return quranicInsightsFlow(input);
}

const quranicInsightsPrompt = ai.definePrompt({
  name: 'quranicInsightsPrompt',
  input: { schema: QuranicInsightsInputSchema },
  output: { schema: QuranicInsightsOutputSchema },
  prompt: `You are an expert Islamic scholar and guide, providing concise and profound insights into the Quran.
Your task is to provide an explanation or summary of the provided Quranic text.

{{#eq contextType "verse"}}
  Analyze the following Quranic verse:
  Surah: {{{surahName}}}
  Verse Number: {{{verseNumber}}}
  Arabic Text: {{{verseText}}}
  {{#if translation}}
  English Translation: {{{translation}}}
  {{/if}}
  Provide a concise explanation that includes its meaning, context, and any key lessons.
{{/eq}}

{{#eq contextType "surah"}}
  Summarize the following Quranic Surah:
  Surah Name: {{{surahName}}}
  Surah Content: {{{surahSummaryText}}}
  Provide a comprehensive and concise summary that captures the main themes, key messages, and overall narrative of the Surah.
{{/eq}}

Ensure the explanation/summary is clear, spiritually uplifting, and easy to understand for a general audience.
`,
});

const quranicInsightsFlow = ai.defineFlow(
  {
    name: 'quranicInsightsFlow',
    inputSchema: QuranicInsightsInputSchema,
    outputSchema: QuranicInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await quranicInsightsPrompt(input);
    return output!;
  }
);
