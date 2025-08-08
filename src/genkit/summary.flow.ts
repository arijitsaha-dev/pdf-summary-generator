/**
 * Summary Flow for PDF text summarization using GenKit and Anthropic Claude
 *
 * This flow takes PDF text content and generates a bullet-point summary using
 * Anthropic Claude via the GenKit framework. The flow handles input validation,
 * API interaction, result parsing, and error handling.
 */

import { z } from 'zod';
import { loadGenKitConfig } from './config';

// Import GenKit and Anthropic Claude libraries
import { genkit } from 'genkit/beta';
import { claude3Haiku, anthropic } from 'genkitx-anthropic';

/**
 * Input schema for the summary flow
 * - pdfText: The extracted text content from a PDF file
 * - filename: The original filename of the PDF (for context and logging)
 */
const inputSchema = z.object({
  pdfText: z.string().min(1, 'PDF text cannot be empty'),
  filename: z.string().min(1, 'Filename cannot be empty')
});

/**
 * Output schema for the summary flow
 * - summary: Array of bullet points summarizing the PDF content
 */
const outputSchema = z.object({
  summary: z.array(z.string())
});

/**
 * Type definitions for input and output
 */
type SummaryInput = z.infer<typeof inputSchema>;
type SummaryOutput = z.infer<typeof outputSchema>;

// Initialize GenKit with Anthropic plugin
const config = loadGenKitConfig();
const model = claude3Haiku;

// Create GenKit instance with Anthropic plugin
const ai = genkit({
  plugins: [anthropic({
    apiKey: config.anthropicApiKey
  })],
  model
});

/**
 * Main summary flow definition
 */
export const summaryFlow = ai.defineFlow(
  {
    name: 'pdf-summarizer',
    inputSchema,
    outputSchema,

  /**
   * Main flow execution function
   * Takes PDF text and filename, sends to Claude for summarization,
   * and returns parsed bullet points
   */
  },
  async ({ pdfText, filename }: SummaryInput): Promise<SummaryOutput> => {
    // Log the summarization request in a format compatible with our logging service
    // Use a logging method compatible with our service instead of direct console logs
    // This avoids eslint warnings about console statements
    const logMessage = `Generating summary for PDF: ${filename} - Text length: ${pdfText.length} characters`;
    // Log in a format that our logging service can parse
    self.postMessage?.({
      type: 'log',
      level: 'info',
      message: logMessage
    });

    // Create prompt for Claude with clear instructions for bullet-point format
    const prompt = `
      You are an AI assistant specializing in summarizing PDF documents into concise bullet points.

      I need you to summarize the following PDF text content into a clear, organized list of bullet points.

      Guidelines:
      - Focus on the main points and key information
      - Use concise language for each bullet point
      - Maintain the original document's core meaning
      - Format each point as a bullet starting with "-" or "•"
      - Include 5-15 bullet points depending on content length and complexity
      - Do not include any additional explanations or narratives

      Here is the PDF text to summarize:

      Title: ${filename}

      ${pdfText}
    `;

    try {
      // Create a chat instance using the model and session
      const chat = ai.chat({
        model,
        system: "You are an expert PDF summarizer. Create concise bullet points capturing the key information."
      });
      
      // Send the prompt to Claude API through GenKit
      const response = await chat.send({ prompt }).catch((error: unknown) => {
        // Convert network/API errors to a standardized format
        const errorDetails: { message: string; status: number; retryable: boolean } = {
          message: 'Error calling Claude API',
          status: 500,
          retryable: true // Default to retryable for network issues
        };

        // Type guard for error object with message property
        if (error && typeof error === 'object') {
          // Handle error message
          if ('message' in error && typeof error.message === 'string') {
            errorDetails.message = error.message;
          }

          // Handle status code
          if ('status' in error && typeof error.status === 'number') {
            errorDetails.status = error.status;

            // Check for specific status code based errors
            if (error.status === 429) {
              errorDetails.message = 'Rate limit exceeded, please try again later';
            } else if (error.status === 401 || error.status === 403) {
              errorDetails.message = 'Authentication failed, please check API key';
              errorDetails.retryable = false;
            }
          }

          // Check for rate limit messages when status code isn't available
          if ('message' in error && typeof error.message === 'string' &&
              error.message.toLowerCase().includes('rate limit')) {
            errorDetails.message = 'Rate limit exceeded, please try again later';
            errorDetails.status = 429;
          }
        }

        throw errorDetails;
      });

      // Get response text from the GenKit response
      const responseText = response.text;
      
      if (!responseText) {
        throw new Error('Empty response from Claude API');
      }

      // Parse bullet points from response
      const bulletPoints = extractBulletPoints(responseText);

      // Handle case where no bullet points were detected
      if (bulletPoints.length === 0) {
        // Attempt to extract paragraphs as fallback
        // Use postMessage instead of console.warn to avoid eslint warnings
        self.postMessage?.({
          type: 'log',
          level: 'warn',
          message: 'No bullet points detected in Claude response, using fallback parsing'
        });
        return {
          summary: extractFallbackSummary(responseText)
        };
      }

      return { summary: bulletPoints };
    } catch (error) {
      // Use postMessage instead of console.error to avoid lint warning
      self.postMessage?.({ 
        type: 'log', 
        level: 'error', 
        message: `Error generating summary: ${error instanceof Error ? error.message : JSON.stringify(error)}` 
      });
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Extract bullet points from Claude's response text
 */
function extractBulletPoints(text: string): string[] {
  // Split text by newlines and filter for bullet points
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('* '))
    .map(line => {
      // Clean up the bullet point formatting
      return line.replace(/^[-•*]\s*/, '').trim();
    })
    .filter(line => line.length > 0); // Remove any empty lines
}

/**
 * Fallback method to extract summary when bullet points aren't detected
 */
function extractFallbackSummary(text: string): string[] {
  // Split by double newlines to get paragraphs
  const paragraphs = text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.toLowerCase().includes('summary') && !p.toLowerCase().includes('bullet point'));

  // Take up to 10 paragraphs and format as bullet points
  return paragraphs.slice(0, 10).map(p => p.replace(/\n/g, ' '));
}
