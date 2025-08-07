import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, of, switchMap, throwError } from "rxjs";
import { LoggingService } from "./logging.service";
import { isPlatformBrowser } from "@angular/common";
import { PLATFORM_ID } from "@angular/core";

// Import PDF.js only if we're in a browser environment
// Using more specific types for dynamic imports
interface PdfJsLib {
	getDocument: (params: {data: Uint8Array}) => {promise: Promise<PDFDocumentProxy>};
	version: string;
}

interface WorkerOptions {
	workerSrc: string;
}

let pdfjsLib: PdfJsLib | undefined;
let GlobalWorkerOptions: WorkerOptions | undefined;

// We'll import these types for TypeScript compilation
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

/**
 * Service for handling PDF operations including file validation, upload, and text extraction
 */
@Injectable({
	providedIn: "root",
})
export class PdfService {
	private http = inject(HttpClient);

	// Signal to track processing state
	isProcessing = signal(false);

	// Signal to track error state
	errorMessage = signal<string | null>(null);

	// Signal to track extraction progress
	progress = signal(0);

	private loggingService = inject(LoggingService);

	// Inject platform ID to detect browser environment
	private platformId = inject(PLATFORM_ID);

	constructor() {
		// Initialize PDF.js only in browser environment
		if (isPlatformBrowser(this.platformId)) {
			this.loadPdfJs();
		}
	}
	
	/**
	 * Dynamically import PDF.js only in browser environment
	 */
	private async loadPdfJs(): Promise<void> {
		try {
			// Dynamically import PDF.js modules
			const pdfJs = await import('pdfjs-dist');
			pdfjsLib = pdfJs;
			
			// Import GlobalWorkerOptions
			const { GlobalWorkerOptions: workerOptions } = await import('pdfjs-dist');
			GlobalWorkerOptions = workerOptions;
			
			// Now initialize the worker
			this.initPdfWorker();
		} catch (error) {
			this.loggingService.logAction("pdf_js_load_error", {
				error: error instanceof Error ? error.message : "Unknown error loading PDF.js"
			});
			this.errorMessage.set("Failed to load PDF processing library");
		}
	}

	/**
	 * Initialize the PDF.js worker
	 */
	private initPdfWorker(): void {
		// Make sure PDF.js is loaded
		if (!pdfjsLib || !GlobalWorkerOptions) {
			this.loggingService.logAction("pdf_worker_init_failed", {
				reason: "PDF.js not loaded yet"
			});
			return;
		}
		
		// Enable fake worker mode which doesn't require an external worker file
		// This is more reliable in various environments including when network access is limited
		GlobalWorkerOptions.workerSrc = '';
		
		this.loggingService.logAction("pdf_worker_initialized", {
			version: pdfjsLib.version,
			mode: "fake_worker"
		});
	}

	/**
	 * Validates if a file is a PDF
	 * @param file The file to validate
	 * @returns True if the file is a valid PDF, false otherwise
	 */
	validatePdfFile(file: File): boolean {
		if (!file) {
			this.errorMessage.set("No file provided");
			return false;
		}

		// Check if file is a PDF by MIME type
		if (file.type !== "application/pdf") {
			this.errorMessage.set("Only PDF files are allowed");
			return false;
		}

		// Clear any previous error messages
		this.errorMessage.set("");
		return true;
	}

	/**
	 * Uploads a PDF file (simulated for now)
	 * @param file PDF file to upload
	 * @returns Observable with upload result
	 */
	uploadPdf(file: File): Observable<{ success: boolean; fileId: string }> {
		if (!this.validatePdfFile(file)) {
			const errorMessage = "Invalid file type. Please upload a PDF file.";
			this.loggingService.logAction("upload_pdf_error", {
				filename: file.name,
				error: errorMessage,
			});
			return throwError(() => new Error(errorMessage));
		}

		this.loggingService.logAction("upload_pdf_start", {
			filename: file.name,
			fileSize: file.size,
		});

		this.isProcessing.set(true);
		this.errorMessage.set(null);
		// For now, we'll simulate an API call
		// In a real implementation, this would use the HttpClient to post to an API endpoint
		return of({ success: true, fileId: `pdf-${Date.now()}` }).pipe(
			// Simulate network delay
			switchMap((response) => {
				return new Observable<{ success: boolean; fileId: string }>((observer) => {
					setTimeout(() => {
						this.isProcessing.set(false);
						observer.next(response);
						observer.complete();
					}, 1500);
				});
			}),
			catchError((error) => {
				this.isProcessing.set(false);
				const errorMessage = error instanceof Error ? error.message : "Failed to upload PDF.";
				this.errorMessage.set(errorMessage);

				this.loggingService.logAction("upload_pdf_error", {
					filename: file.name,
					error: errorMessage,
				});

				return throwError(() => error);
			}),
		);
	}

	/**
	 * Extracts text from a PDF file using PDF.js
	 * @param file The PDF file to extract text from
	 * @returns An Observable with the extracted text or error
	 */
	extractTextFromPdf(file: File): Observable<string> {
		if (!this.validatePdfFile(file)) {
			const errorMessage = "Invalid file type. Please upload a PDF file.";
			this.errorMessage.set(errorMessage);
			return throwError(() => new Error(errorMessage));
		}

		// Check if we're in the browser - PDF.js requires browser APIs
		if (!isPlatformBrowser(this.platformId)) {
			const errorMessage = "PDF extraction is only available in browser environment";
			this.errorMessage.set(errorMessage);
			return throwError(() => new Error(errorMessage));
		}

		// Check if PDF.js is loaded
		if (!pdfjsLib) {
			const errorMessage = "PDF.js library not loaded. Please try again.";
			this.errorMessage.set(errorMessage);
			return throwError(() => new Error(errorMessage));
		}

		this.isProcessing.set(true);
		this.errorMessage.set(null);
		this.progress.set(0);

		const fileId = `pdf-${Date.now()}`;

		this.loggingService.logAction("extract_text_start", {
			fileId,
			fileName: file.name,
			fileSize: file.size
		});

		// Use PDF.js to extract text
		return new Observable<string>((observer) => {
			const reader = new FileReader();
			
			reader.onload = async (e: ProgressEvent<FileReader>): Promise<void> => {
				try {
					if (!e.target?.result) {
						throw new Error("Failed to read PDF file");
					}
					
					if (!pdfjsLib) {
						throw new Error("PDF.js library not available");
					}
					
					// Load the PDF document
					const typedArray = new Uint8Array(e.target.result as ArrayBuffer);
					const loadingTask = pdfjsLib.getDocument({ data: typedArray });
					
					// Get the PDF document
					const pdf = await loadingTask.promise;
					
					this.loggingService.logAction("pdf_document_loaded", {
						fileId,
						numPages: pdf.numPages
					});
					
					const allText = await this.extractTextFromAllPages(pdf, fileId);
					this.isProcessing.set(false);
					this.progress.set(100);
					
					this.loggingService.logAction("extract_text_complete", {
						fileId,
						textLength: allText.length,
						numPages: pdf.numPages
					});
					
					observer.next(allText);
					observer.complete();
				} catch (error) {
					this.handleExtractionError(error, fileId, observer);
				}
			};
			
			reader.onerror = (error: ProgressEvent<FileReader>): void => {
				this.handleExtractionError(error, fileId, observer);
			};
			
			// Read the file as ArrayBuffer
			reader.readAsArrayBuffer(file);
		}).pipe(
			catchError((error) => {
				this.isProcessing.set(false);
				this.progress.set(0);
				const errorMessage = error instanceof Error ? error.message : "Failed to extract text from PDF.";
				this.errorMessage.set(errorMessage);

				this.loggingService.logAction("extract_text_error", {
					fileId,
					error: errorMessage,
				});

				return throwError(() => error);
			}),
		);
	}
	
	/**
	 * Extract text from all pages in a PDF document
	 * @param pdf PDF document
	 * @param fileId Identifier for the file being processed
	 * @returns Promise with the combined text from all pages
	 */
	private async extractTextFromAllPages(pdf: PDFDocumentProxy, fileId: string): Promise<string> {
		const numPages = pdf.numPages;
		let textContent = "";
		
		for (let i = 1; i <= numPages; i++) {
			try {
				// Update progress
				this.progress.set(Math.floor((i - 1) / numPages * 100));
				
				const page = await pdf.getPage(i);
				const pageText = await this.extractTextFromPage(page);
				
				// Add page number and text
				textContent += `Page ${i}\n${pageText}\n\n`;
				
				this.loggingService.logAction("page_text_extracted", {
					fileId,
					page: i,
					totalPages: numPages
				});
			} catch (error) {
				this.loggingService.logAction("page_extraction_error", {
					fileId,
					page: i,
					error: error instanceof Error ? error.message : "Unknown error"
				});
				
				// Continue with next page even if this one fails
				textContent += `Page ${i}\n[Error extracting text from this page]\n\n`;
			}
		}
		
		return textContent;
	}
	
	/**
	 * Extract text from a single PDF page
	 * @param page PDF page
	 * @returns Promise with the extracted text
	 */
	private async extractTextFromPage(page: PDFPageProxy): Promise<string> {
		const textContent = await page.getTextContent();
		let pageText = "";
		
		// Combine text items into a single string
		for (const item of textContent.items) {
			if ('str' in item) {
				pageText += item.str + " ";
			}
		}
		
		return pageText;
	}
	
	/**
	 * Handle errors during PDF text extraction
	 * @param error The error object
	 * @param fileId ID of the file being processed
	 * @param observer The observer to notify about the error
	 */
	private handleExtractionError(error: unknown, fileId: string, observer: { error: (err: Error) => void }): void {
		this.isProcessing.set(false);
		this.progress.set(0);
		const errorMessage = error instanceof Error ? error.message : "Failed to extract text from PDF.";
		this.errorMessage.set(errorMessage);
		
		this.loggingService.logAction("extract_text_error", {
			fileId,
			error: errorMessage
		});
		
		observer.error(new Error(errorMessage));
	}
}
