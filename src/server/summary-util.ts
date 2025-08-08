/**
 * Simple text summarization utility for server-side use
 * This avoids using Angular DI or GenKit, making it compatible with server contexts
 * 
 * @module summary-util
 */

import { Logger } from '../app/services/logger.service';

// Create a logger instance
const logger = new Logger();

/**
 * Interface for the summary input
 */
interface SummaryInput {
  pdfText: string;
  filename: string;
}

/**
 * Interface for the summary output
 */
export interface SummaryOutput {
  summary: string[];
}

/**
 * Placeholder function that creates a simple summary of the text
 * In a real application, this would call an external API like OpenAI/Anthropic
 * 
 * @param input Object containing PDF text and filename
 * @returns Promise resolving to summary output
 */
export async function summarizePdfText(input: SummaryInput): Promise<SummaryOutput> {
  const { pdfText, filename } = input;
  
  try {
    logger.log(`Generating summary for ${filename}, text length: ${pdfText.length} characters`);
    
    // In a real implementation, this would call an AI service API
    // For now, we'll create a simple extractive summary by taking key sentences
    
    // Simple extraction of what seem to be important sentences
    const sentences = pdfText
      .replace(/\r\n|\r|\n/g, ' ')
      .replace(/\s+/g, ' ')
      .split(/\.\s|\?\s|!\s/)
      .filter(sentence => sentence.trim().length > 30)
      .filter(sentence => !sentence.includes('http') && !sentence.includes('www'));
    
    // Take a limited number of sentences
    const selectedSentences = sentences.slice(0, Math.min(10, sentences.length));
    
    // Format as bullet points
    const bulletPoints = selectedSentences.map(sentence => sentence.trim() + '.');
    
    logger.log(`Generated ${bulletPoints.length} summary points for ${filename}`);
    
    return { summary: bulletPoints };
  } catch (error) {
    // Log error but keep it clean for ESLint
    logger.error(`Error generating summary: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

