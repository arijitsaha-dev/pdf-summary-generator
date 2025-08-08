/**
 * Advanced text summarization utility for server-side use
 * Implements GenKit with Anthropic Claude for AI-powered summarization
 * Designed to avoid Angular DI conflicts in SSR environments
 *
 * @module summary-util
 */

import { Logger } from "../app/services/logger.service";
import { genkit } from "genkit/beta";
import { anthropic } from "genkitx-anthropic";
import { config } from "../genkit/config";
import { claude3Haiku } from "genkitx-anthropic";

// Create a logger instance
const logger = new Logger();

/**
 * Interface for the summary input
 */
export interface SummaryInput {
	pdfText: string;
	filename: string;
}

/**
 * Interface for the summary output
 */
export interface SummaryOutput {
	summary: string[];
}

// Model reference defined inline where used

// Configure GenKit for server-side use
// We use the direct config export instead of loadGenKitConfig() to avoid Angular DI
const serverAI = genkit({
	plugins: [
		anthropic({
			apiKey: config.anthropicApiKey,
		}),
	],
	model: claude3Haiku,
});

/**
 * Extract bullet points from text response
 *
 * @param text Response text from AI model
 * @returns Array of extracted bullet points
 */
function extractBulletPoints(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("-") || line.startsWith("•") || line.startsWith("* "))
		.map((line) => line.replace(/^[-•*]\s*/, "").trim())
		.filter((line) => line.length > 0);
}

/**
 * Fallback method to extract summary when bullet points aren't detected
 *
 * @param text Response text from AI model
 * @returns Array of extracted paragraphs as summary points
 */
function extractFallbackSummary(text: string): string[] {
	// Split by double newlines to get paragraphs
	const paragraphs = text
		.split("\n\n")
		.map((p) => p.trim())
		.filter((p) => p.length > 0 && !p.toLowerCase().includes("summary") && !p.toLowerCase().includes("bullet point"));

	// Take up to 10 paragraphs and format as bullet points
	return paragraphs.slice(0, 10).map((p) => p.replace(/\n/g, " "));
}

/**
 * Advanced text summarization using GenKit with Anthropic Claude
 * Specifically designed for server-side use without Angular DI conflicts
 *
 * @param input Object containing PDF text and filename
 * @returns Promise resolving to summary output
 */
export async function summarizePdfText(input: SummaryInput): Promise<SummaryOutput> {
	const { pdfText, filename } = input;

	try {
		logger.log(`Generating AI summary for ${filename}, text length: ${pdfText.length} characters`);

		// First try the AI-powered approach with GenKit
		try {
			// Create prompt for Claude with instructions for bullet-point format
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

        ${pdfText.slice(0, 100000)} ${pdfText.length > 100000 ? "... (text truncated)" : ""}
      `.trim();

			// Create a chat session with proper configuration
			const chat = serverAI.chat({
				system: "You are an expert PDF summarizer. Create concise bullet points capturing the key information.",
			});

			// Send the prompt to Claude API through GenKit
			const response = await chat.send({ prompt });
			const responseText = response.text;

			if (!responseText) {
				throw new Error("Empty response from Claude API");
			}

			// Parse bullet points from response
			const bulletPoints = extractBulletPoints(responseText);

			// If bullet points were successfully extracted, return them
			if (bulletPoints.length > 0) {
				logger.log(`Generated ${bulletPoints.length} AI summary points for ${filename}`);
				return { summary: bulletPoints };
			}

			// If no bullet points were detected, use fallback parsing
			logger.warn(`No bullet points detected in Claude response for ${filename}, using fallback parsing`);
			const fallbackSummary = extractFallbackSummary(responseText);

			if (fallbackSummary.length > 0) {
				logger.log(`Generated ${fallbackSummary.length} AI summary paragraphs for ${filename}`);
				return { summary: fallbackSummary };
			}

			// If fallback also failed, throw error to trigger extractive summary
			throw new Error("Could not extract summary from AI response");
		} catch (aiError) {
			// Log the AI error but don't fail - continue to extractive summary
			logger.warn(
				`AI summarization failed: ${aiError instanceof Error ? aiError.message : String(aiError)}. Using extractive fallback.`,
			);

			// Continue to extractive summary as fallback
		}

		// Fallback to extractive summarization if AI approach fails
		logger.log(`Using extractive summarization for ${filename}`);

		// Simple extraction of what seem to be important sentences
		const sentences = pdfText
			.replace(/\r\n|\r|\n/g, " ")
			.replace(/\s+/g, " ")
			.split(/\.\s|\?\s|!\s/)
			.filter((sentence) => sentence.trim().length > 30)
			.filter((sentence) => !sentence.includes("http") && !sentence.includes("www"));

		// Take a limited number of sentences
		const selectedSentences = sentences.slice(0, Math.min(10, sentences.length));

		// Format as bullet points
		const bulletPoints = selectedSentences.map((sentence) => sentence.trim() + ".");

		logger.log(`Generated ${bulletPoints.length} extractive summary points for ${filename}`);

		return { summary: bulletPoints };
	} catch (error) {
		// Log error but keep it clean for ESLint
		logger.error(`Error generating summary: ${error instanceof Error ? error.message : String(error)}`);
		throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}
