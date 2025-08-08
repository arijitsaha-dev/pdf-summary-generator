/* eslint-disable no-prototype-builtins */
import { Injectable, inject, signal } from "@angular/core";
// import { Observable, catchError, finalize, map, of, switchMap, throwError } from 'rxjs';
import { PdfService } from "./pdf.service";
import { LoggingService } from "./logging.service";
import { AiService } from "./ai.service";
import { Subject, takeUntil } from "rxjs";

/**
 * Service to handle the end-to-end PDF summarization process
 *
 * This service orchestrates the workflow between PDF extraction and summarization,
 * providing a unified interface for the application components.
 */
@Injectable({
	providedIn: "root",
})
export class SummarizationService {
	private readonly pdfService = inject(PdfService);
	private readonly loggingService = inject(LoggingService);
	private readonly aiService = inject(AiService);
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	// Maximum file size in bytes (10MB)
	private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

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
			const errorMessage = "No file provided";
			this.error.set(errorMessage);
			return false;
		}

		// Check file size
		if (file.size > this.MAX_FILE_SIZE) {
			const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
			const errorMessage = `File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${maxSizeMB}MB.`;

			this.error.set(errorMessage);

			this.loggingService.logAction("pdf_file_too_large", {
				filename: file.name,
				fileSize: file.size,
				maxSize: this.MAX_FILE_SIZE,
			});
			return false;
		}

		// Check file type
		if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
			const errorMessage = "Only PDF files are supported.";

			this.error.set(errorMessage);

			this.loggingService.logAction("pdf_invalid_file_type", {
				filename: file.name,
				fileType: file.type,
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
	async processPdf(file: File): Promise<any> {
		// Reset state and validate file
		this.isProcessing.set(true);
		this.error.set(null);
		this.progress.set(0);
		this.summaryBullets.set([]);

		if (!this.validateFile(file)) {
			this.isProcessing.set(false);
			return false;
		}

		const fileId = `pdf-${Date.now()}`;

		this.loggingService.logAction("pdf_processing_start", {
			fileId,
			filename: file.name,
			fileSize: file.size,
			fileType: file.type,
		});

		// Track the number of retries
		this.pdfService
			.extractTextFromPdf(file)
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(res1) => {
					if (typeof res1 == "object" && res1.hasOwnProperty("text")) {
						this.aiService
							.generateSummary(res1.text as string, file.name)
							.pipe(takeUntil(this._destroy$))
							.subscribe(
								(res2) => {
									this.summaryBullets.set(res2.result.summary as string[]);
								},
								(error) => {
									this.error.set(error.message as string);
								},
								() => {
									this.isProcessing.set(false);
									return true;
								},
							);
					}
				},
				(error) => {
					this.error.set(error.message as string);
				},
				() => {
					this.isProcessing.set(false);
				},
			);
		this.loggingService.logAction("pdf_processing_end", {
			fileId,
			filename: file.name,
			fileSize: file.size,
			fileType: file.type,
		});
		return true;
	}
}
