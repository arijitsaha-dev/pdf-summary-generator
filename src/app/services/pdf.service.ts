import { Injectable, inject, signal, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import { Observable, catchError, from, map, of, switchMap, throwError } from "rxjs";
import { LoggingService } from "./logging.service";

// Import core Angular components
import { ApplicationRef } from "@angular/core";

// Import pdfmake library
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Types for PDF document
interface PdfDocument {
	content: any[];
	info?: Record<string, string>;
	pageSize?: string | { width: number; height: number };
	pageOrientation?: 'portrait' | 'landscape';
	pageMargins?: [number, number, number, number];
	defaultStyle?: Record<string, any>;
	styles?: Record<string, any>;
	images?: Record<string, any>;
}

/**
 * Service for handling PDF operations including file validation, upload, and text extraction
 * Uses pdfmake for PDF processing
 */
@Injectable({
	providedIn: "root"
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

	// Inject application ref
	private appRef = inject(ApplicationRef);

	constructor() {
		// Initialize pdfmake with fonts in browser environment only
		if (isPlatformBrowser(this.platformId)) {
			// Add virtual file system to pdfmake
			(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
		}
	}

	/**
	 * Validates if the file is a PDF
	 * @param file The file to validate
	 * @returns Boolean indicating if the file is a valid PDF
	 */
	validatePdfFile(file: File): boolean {
		// Check if file exists
		if (!file) {
			this.errorMessage.set("No file selected");
			return false;
		}

		// Check file type
		if (file.type !== 'application/pdf') {
			this.errorMessage.set("Invalid file type. Please upload a PDF file.");
			return false;
		}

		// Reset error state
		this.errorMessage.set(null);
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
	 * Extracts text from a PDF file using pdfmake and pdf.js
	 * @param file The PDF file to extract text from
	 * @returns Observable with the extracted text
	 */
	extractTextFromPdf(file: File): Observable<string> {
		if (!this.validatePdfFile(file)) {
			const errorMessage = "Invalid file type. Please upload a PDF file.";
			this.errorMessage.set(errorMessage);
			return throwError(() => new Error(errorMessage));
		}

		// Check if we're in the browser - PDF processing requires browser APIs
		if (!isPlatformBrowser(this.platformId)) {
			const errorMessage = "PDF extraction is only available in the browser environment.";
			this.errorMessage.set(errorMessage);
			return throwError(() => new Error(errorMessage));
		}

		this.isProcessing.set(true);
		this.progress.set(0);
		this.errorMessage.set(null);

		// Generate a unique ID for this extraction task
		const fileId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

		// Import pdfjs dynamically since pdfmake is built on pdf.js
		return new Observable<string>(observer => {
			try {
				const fileReader = new FileReader();

				fileReader.onload = () => {
					try {
						// The file content as ArrayBuffer
						const arrayBuffer = fileReader.result as ArrayBuffer;

						// Log the start of extraction
						this.loggingService.logAction("extract_text_start", {
							fileId,
							fileName: file.name,
							fileSize: file.size
						});

						// Use pdfMake to parse the document
						// Since pdfmake doesn't have a direct text extraction API, we need to use a workaround
						// We'll use pdf.js which pdfmake uses internally

						// We can use pdfMake createPdf to generate a Blob and then use pdf.js to extract text
						const uint8Array = new Uint8Array(arrayBuffer);

						// Use a third-party library approach with pdf.js for text extraction
						// Load pdf.js dynamically
						this.loadPdfJS().then(pdfJS => {
							// Use pdf.js to load the document
							pdfJS.getDocument(uint8Array).promise.then(pdfDocument => {
								this.loggingService.logAction("extract_text_pdf_loaded", {
									fileId,
									numPages: pdfDocument.numPages
								});

								// Extract text from all pages
								this.extractTextFromAllPages(pdfDocument, fileId).then(allText => {
									this.isProcessing.set(false);
									this.progress.set(100);

									this.loggingService.logAction("extract_text_complete", {
										fileId,
										characterCount: allText.length
									});

									// Complete the observable with the extracted text
									observer.next(allText);
									observer.complete();
								}).catch(error => {
									this.handleExtractionError(error, fileId, observer);
								});
							}).catch(error => {
								this.handleExtractionError(error, fileId, observer);
							});
						}).catch(error => {
							this.handleExtractionError(error, fileId, observer);
						});
					} catch (error) {
						this.handleExtractionError(error, fileId, observer);
					}
				};

				fileReader.onerror = (error) => {
					this.handleExtractionError(error, fileId, observer);
				};

				// Start reading the file
				fileReader.readAsArrayBuffer(file);

			} catch (error) {
				this.handleExtractionError(error, fileId, observer);
			}
		});
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
	 * Handles a PDF document after it's been loaded by the PdfViewerComponent
	 * @param pdf The loaded PDF document
	 * @param fileId Identifier for the file being processed
	 * @param pdfComponentRef Reference to the PDF component to clean up
		try {
			// Extract text from all pages
			const allText = await this.extractTextFromAllPages(pdf, fileId);

			// Clean up the component
			pdfComponentRef.destroy();

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
			pdfComponentRef.destroy();
			this.handleExtractionError(error, fileId, observer);
		}
	}

	/**
	 * Extract text from all pages in a PDF document
	 * @param pdf PDF document from ng2-pdf-viewer
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
	 * Extract text from a single PDF page using ng2-pdf-viewer's PDFPageProxy
	 * @param page PDF page from ng2-pdf-viewer
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
