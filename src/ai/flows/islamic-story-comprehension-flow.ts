'use server';
/**
 * @fileOverview A Genkit flow for summarizing Islamic stories or answering questions about their content.
 *
 * - islamicStoryComprehension - A function that handles the story comprehension process.
 * - IslamicStoryComprehensionInput - The input type for the islamicStoryComprehension function.
 * - IslamicStoryComprehensionOutput - The return type for the islamicStoryComprehension function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IslamicStoryComprehensionInputSchema = z.object({
  storyContent: z.string().describe('The full content of the Islamic story.'),
  question: z.string().optional().describe('An optional question about the story. If provided, the AI will answer this question; otherwise, it will summarize the story.'),
});
export type IslamicStoryComprehensionInput = z.infer<typeof IslamicStoryComprehensionInputSchema>;

const IslamicStoryComprehensionOutputSchema = z.object({
  type: z.enum(['summary', 'answer']).describe('Indicates whether the output is a summary or an answer to a question.'),
  summary: z.string().optional().describe('The AI-generated summary of the Islamic story, if no question was provided.'),
  answer: z.string().optional().describe('The AI-generated answer to the question about the Islamic story, if a question was provided.'),
});
export type IslamicStoryComprehensionOutput = z.infer<typeof IslamicStoryComprehensionOutputSchema>;

const IslamicStoryComprehensionPrompt = ai.definePrompt({
  name: 'islamicStoryComprehensionPrompt',
  input: { schema: IslamicStoryComprehensionInputSchema },
  output: { schema: IslamicStoryComprehensionOutputSchema },
  prompt: `You are an AI assistant specialized in Islamic knowledge. Your task is to either summarize an Islamic story or answer a specific question about its content.

Story:
{{{storyContent}}}

{{#if question}}
Based on the story above, answer the following question: "{{{question}}}".
Ensure your answer is concise and directly addresses the question.
If the story does not contain information to answer the question, state that the information is not available in the provided story.
Respond with a JSON object that strictly adheres to the following TypeScript interface:
interface IslamicStoryComprehensionOutput {
  type: "answer";
  answer: string;
}
{{else}}
Provide a concise summary of the Islamic story above. Focus on the main lessons, characters, and events.
Respond with a JSON object that strictly adheres to the following TypeScript interface:
interface IslamicStoryComprehensionOutput {
  type: "summary";
  summary: string;
}
{{/if}}
`
});

const islamicStoryComprehensionFlow = ai.defineFlow(
  {
    name: 'islamicStoryComprehensionFlow',
    inputSchema: IslamicStoryComprehensionInputSchema,
    outputSchema: IslamicStoryComprehensionOutputSchema,
  },
  async (input) => {
    const { output } = await IslamicStoryComprehensionPrompt(input);
    return output!;
  }
);

export async function islamicStoryComprehension(input: IslamicStoryComprehensionInput): Promise<IslamicStoryComprehensionOutput> {
  return islamicStoryComprehensionFlow(input);
}
