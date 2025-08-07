import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';
import { LoggingService } from './logging.service';

/**
 * Service for handling PDF operations including file validation, upload, and text extraction
 */
@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private http = inject(HttpClient);
  
  // Signal to track processing state
  isProcessing = signal(false);
  
  // Signal to track error state
  errorMessage = signal<string | null>(null);
  
  private loggingService = inject(LoggingService);
  
  /**
   * Validates if a file is a PDF
   * @param file The file to validate
   * @returns True if the file is a valid PDF, false otherwise
   */
  validatePdfFile(file: File): boolean {
    if (!file) {
      this.errorMessage.set('No file provided');
      return false;
    }
    
    // Check if file is a PDF by MIME type
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Only PDF files are allowed');
      return false;
    }
    
    // Clear any previous error messages
    this.errorMessage.set('');
    return true;
  }
  
  /**
   * Uploads a PDF file (simulated for now)
   * @param file PDF file to upload
   * @returns Observable with upload result
   */
  uploadPdf(file: File): Observable<{ success: boolean, fileId: string }> {
    if (!this.validatePdfFile(file)) {
      const errorMessage = 'Invalid file type. Please upload a PDF file.';
      this.loggingService.logAction('upload_pdf_error', {
        filename: file.name,
        error: errorMessage
      });
      return throwError(() => new Error(errorMessage));
    }
    
    this.loggingService.logAction('upload_pdf_start', {
      filename: file.name,
      fileSize: file.size
    });
    
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    // For now, we'll simulate an API call
    // In a real implementation, this would use the HttpClient to post to an API endpoint
    return of({ success: true, fileId: `pdf-${Date.now()}` }).pipe(
      // Simulate network delay
      switchMap(response => {
        return new Observable<{success: boolean, fileId: string}>(observer => {
          setTimeout(() => {
            this.isProcessing.set(false);
            observer.next(response);
            observer.complete();
          }, 1500);
        });
      }),
      catchError(error => {
        this.isProcessing.set(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload PDF.';
        this.errorMessage.set(errorMessage);
        
        this.loggingService.logAction('upload_pdf_error', {
          filename: file.name,
          error: errorMessage
        });
        
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Extracts text from a PDF file
   * In a real implementation, this would call a backend service with PDF.js or similar
   * @param file The PDF file to extract text from
   * @returns An Observable with the extracted text or error
   */
  extractTextFromPdf(file: File): Observable<string> {
    if (!this.validatePdfFile(file)) {
      const errorMessage = 'Invalid file type. Please upload a PDF file.';
      this.errorMessage.set(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
    
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    
    const fileId = `pdf-${Date.now()}`;
    
    this.loggingService.logAction('extract_text_start', {
      fileId
    });
    
    // For now, we'll simulate text extraction with a delay
    return new Observable<string>(observer => {
      setTimeout(() => {
        this.isProcessing.set(false);
        const extractedText = `Extracted text from ${fileId}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.`;
        
        this.loggingService.logAction('extract_text_complete', {
          fileId,
          textLength: extractedText.length
        });
        
        observer.next(extractedText);
        observer.complete();
      }, 2000);
    }).pipe(
      catchError(error => {
        this.isProcessing.set(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to extract text from PDF.';
        this.errorMessage.set(errorMessage);
        
        this.loggingService.logAction('extract_text_error', {
          fileId,
          error: errorMessage
        });
        
        return throwError(() => error);
      })
    );
  }
}
