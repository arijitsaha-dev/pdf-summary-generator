import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, switchMap, throwError } from 'rxjs';
import { PdfService } from './pdf.service';
import { AiService } from './ai.service';
import { LoggingService } from './logging.service';
import { ErrorHandlerService } from './error-handler.service';

/**
 * Service to handle the end-to-end PDF summarization process
 * 
 * This service orchestrates the workflow between PDF extraction and AI summarization,
 * providing a unified interface for the application components.
 */
@Injectable({
  providedIn: 'root'
})
export class SummarizationService {
  private readonly pdfService = inject(PdfService);
  private readonly aiService = inject(AiService);
  private readonly loggingService = inject(LoggingService);
  private readonly errorHandler = inject(ErrorHandlerService);
  
  // Maximum file size in bytes (10MB)
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Maximum retry attempts for the entire process
  private readonly MAX_RETRIES = 2;
  
  // Public signals for reactive UI updates
  readonly isProcessing = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly progress = signal<number>(0);
  readonly summaryBullets = signal<string[]>([]);
  
  /**
   * Validate file before processing
   * 
   * @param file File to validate
   * @returns true if file is valid
   */
  private validateFile(file: File): boolean {
    if (!file) {
      const errorMessage = 'No file provided';
      this.error.set(errorMessage);
      return false;
    }
    
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      const errorMessage = `File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${maxSizeMB}MB.`;
      
      this.error.set(errorMessage);
      
      this.loggingService.logAction('pdf_file_too_large', {
        filename: file.name,
        fileSize: file.size,
        maxSize: this.MAX_FILE_SIZE
      });
      
      return false;
    }
    
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      const errorMessage = 'Only PDF files are supported.';
      
      this.error.set(errorMessage);
      
      this.loggingService.logAction('pdf_invalid_file_type', {
        filename: file.name,
        fileType: file.type
      });
      
      return false;
    }
    
    return true;
  }
  
  /**
   * Process a PDF file to generate a summary
   * 
   * This method handles the complete workflow:
   * 1. Extract text from PDF
   * 2. Generate summary from the text
   * 3. Return the summary
   * 
   * @param file - The PDF file to process
   * @returns Observable with array of summary bullet points
   */
  processPdf(file: File): Observable<string[]> {
    // Reset state and validate file
    this.isProcessing.set(true);
    this.error.set(null);
    this.progress.set(0);
    this.summaryBullets.set([]);
    
    if (!this.validateFile(file)) {
      this.isProcessing.set(false);
      return of([]);
    }
    
    const fileId = `pdf-${Date.now()}`;
    
    this.loggingService.logAction('pdf_processing_start', {
      fileId, 
      filename: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    // Track the number of retries
    let retryCount = 0;
    
    // Extract text from the PDF file
    return this.pdfService.extractTextFromPdf(file).pipe(
        
      // Check if we have text to summarize and process it
      switchMap(extractedText => {
        if (!extractedText || extractedText.trim().length === 0) {
          return throwError(() => new Error('No text could be extracted from the PDF'));
        }
        
        // Update extraction progress
        this.progress.set(50);
        
        // Log extraction completion
        this.loggingService.logAction('pdf_text_extraction_complete', { 
          fileId,
          filename: file.name, 
          textLength: extractedText.length 
        });
        
        // Truncate text if too long to prevent API issues
        const maxTextLength = 100000; // 100K chars
        const processText = extractedText.length > maxTextLength 
          ? extractedText.substring(0, maxTextLength) + '... [text truncated due to length]'
          : extractedText;
        
        if (extractedText.length > maxTextLength) {
          this.loggingService.logAction('pdf_text_truncated', {
            fileId,
            filename: file.name,
            originalLength: extractedText.length,
            truncatedLength: processText.length
          });
        }
        
        // Generate summary with automatic retries built into the AI service
        return this.aiService.generateSummary(processText, file.name).pipe(
          map(summary => {
            // Update state with results
            this.summaryBullets.set(summary);
            this.progress.set(100);
            
            // Log completion
            this.loggingService.logAction('pdf_processing_complete', { 
              fileId,
              filename: file.name, 
              summaryLength: summary.length 
            });
            
            return summary;
          })
        );
      }),
      catchError(error => {
        const userMessage = error instanceof Error
          ? error.message
          : this.errorHandler.getUserFriendlyMessage(error);
          
        this.loggingService.logAction('pdf_processing_error', {
          fileId,
          filename: file.name,
          errorMessage: userMessage,
          error: error instanceof Error ? error.message : JSON.stringify(error),
          retryCount
        });
        
        // Try to retry if we haven't exceeded max retries and error is retryable
        if (retryCount < this.MAX_RETRIES) {
          const isRetryable = (
            // Network errors are retryable
            (error instanceof Error && error.message.toLowerCase().includes('network')) ||
            // Rate limit errors are retryable
            (error instanceof Error && error.message.toLowerCase().includes('rate limit')) ||
            // Server errors are retryable
            (error instanceof Error && error.message.toLowerCase().includes('server')) ||
            // Anything explicitly marked retryable by our error handler
            (typeof error === 'object' && error && 'retryable' in error && (error as {retryable: boolean}).retryable)
          );
          
          if (isRetryable) {
            retryCount++;
            const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
            
            this.error.set(`Retrying (${retryCount}/${this.MAX_RETRIES})...`);
            
            this.loggingService.logAction('pdf_processing_retry', {
              fileId,
              filename: file.name,
              attempt: retryCount,
              maxRetries: this.MAX_RETRIES,
              delayMs
            });
            
            // Retry after delay
            return new Observable<string[]>(observer => {
              setTimeout(() => {
                // Reset error state before retry
                this.error.set(null);
                
                // Re-call the entire process, not just the failing part
                this.processPdf(file).subscribe({
                  next: result => observer.next(result),
                  error: err => observer.error(err),
                  complete: () => observer.complete()
                });
              }, delayMs);
            });
          }
        }
        
        // If not retryable or max retries reached, set error and return empty array
        this.error.set(userMessage);
        return of([]);
      }),
      
      finalize(() => {
        this.isProcessing.set(false);
      })
    );
  }
}
