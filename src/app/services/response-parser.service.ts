import { Injectable, inject } from '@angular/core';
import { LoggingService } from './logging.service';

/**
 * Response structure from Anthropic Claude API
 */
export interface ClaudeResponse {
  text: string;
  model: string;
  stop_reason?: string;
  stop?: string;
  // Additional fields omitted for brevity
}

/**
 * Service to parse and format AI model responses
 * 
 * This service handles parsing structured content like bullet points
 * from raw text responses from Claude and other AI models.
 */
@Injectable({
  providedIn: 'root'
})
export class ResponseParserService {
  private readonly loggingService = inject(LoggingService);
  
  /**
   * Extract bullet points from Claude's response text
   * 
   * @param response - The Claude API response object
   * @param context - Optional context for logging
   * @returns Array of extracted bullet points
   */
  extractBulletPoints(response: ClaudeResponse, context?: Record<string, unknown>): string[] {
    if (!response || !response.text) {
      this.loggingService.logAction('extract_bullet_points_error', {
        error: 'Empty response received',
        ...context
      });
      return [];
    }
    
    try {
      // Split text by newlines and filter for bullet points
      const bulletPoints = response.text
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Match common bullet point markers: -, •, *, 1., etc.
          return (
            line.startsWith('-') || 
            line.startsWith('•') || 
            line.startsWith('* ') ||
            /^\d+\.\s/.test(line)  // Numbered list items
          );
        })
        .map(line => {
          // Clean up the bullet point formatting
          return line
            // Remove bullet markers
            .replace(/^[-•*]\s*/, '')
            // Remove numbered list markers
            .replace(/^\d+\.\s*/, '')
            .trim();
        })
        .filter(line => line.length > 0); // Remove empty lines
      
      // Log parsing results
      this.loggingService.logAction('bullet_points_extracted', {
        count: bulletPoints.length,
        success: bulletPoints.length > 0,
        ...context
      });
      
      if (bulletPoints.length === 0) {
        return this.extractFallbackSummary(response.text, context);
      }
      
      return bulletPoints;
    } catch (error) {
      this.loggingService.logAction('extract_bullet_points_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ...context
      });
      
      return this.extractFallbackSummary(response.text, context);
    }
  }
  
  /**
   * Extract fallback summary when bullet points aren't detected
   * 
   * @param text - Raw text response
   * @param context - Optional context for logging
   * @returns Array of text chunks as fallback summary points
   */
  private extractFallbackSummary(text: string, context?: Record<string, unknown>): string[] {
    try {
      this.loggingService.logAction('using_fallback_summary_extraction', context);
      
      // Split by double newlines to get paragraphs
      const paragraphs = text
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => {
          // Filter out metadata or headings
          return (
            p.length > 0 && 
            !p.toLowerCase().includes('summary') && 
            !p.toLowerCase().includes('bullet point') &&
            !p.startsWith('#')
          );
        });
      
      // Take up to 10 paragraphs and format as summary points
      const fallbackSummary = paragraphs
        .slice(0, 10)
        .map(p => p.replace(/\n/g, ' '));
      
      return fallbackSummary;
    } catch (error) {
      this.loggingService.logAction('fallback_summary_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ...context
      });
      
      // Return a generic message if all parsing fails
      return ['Unable to generate summary from the provided content.'];
    }
  }
}
