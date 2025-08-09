/* eslint-disable no-prototype-builtins */
import { Injectable, inject, signal } from "@angular/core";
import { type OnDestroy } from "@angular/core";
import { PdfService } from "./pdf.service";
import { LoggingService } from "./logging.service";
import { AiService } from "./ai.service";
import { Subject, firstValueFrom, takeUntil } from "rxjs";

/**
 * Service to handle the end-to-end PDF summarization process
 *
 * This service orchestrates the workflow between PDF extraction and summarization,
 * providing a unified interface for the application components.
 */
@Injectable({
	providedIn: "root",
})
export class SummarizationService implements OnDestroy {
	private readonly pdfService = inject(PdfService);
	private readonly loggingService = inject(LoggingService);
	private readonly aiService = inject(AiService);
	private readonly destroy$ = new Subject<boolean>();

	// Maximum file size in bytes (10MB)
	private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

	// Public signals for reactive UI updates
	readonly isProcessing = signal<boolean>(false);
	readonly error = signal<string | null>(null);
	readonly progress = signal<number>(0);
	readonly summaryBullets = signal<string[]>([]);
	readonly currentFileName = signal<string>("");

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
			.pipe(takeUntil(this.destroy$))
			.subscribe(
				(res1) => {
					if (typeof res1 == "object" && res1.hasOwnProperty("text")) {
						this.aiService
							.generateSummary(res1.text as string, file.name)
							.pipe(takeUntil(this.destroy$))
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

	/**
	 * Process a PDF file to generate a streaming summary
	 *
	 * This method handles the complete workflow with progressive streaming output:
	 * 1. Extract text from PDF
	 * 2. Generate streaming summary from the text using Angular 20 AI streaming pattern
	 * 3. Update UI in real-time as bullet points are generated
	 *
	 * @param file - The PDF file to process
	 * @returns Promise indicating processing success
	 */
	async processStreamingPdf(file: File): Promise<boolean> {
		// Reset state and validate file
		this.isProcessing.set(true);
		this.error.set(null);
		this.progress.set(0);
		this.currentFileName.set(file.name);
		this.summaryBullets.set([]);

		if (!this.validateFile(file)) {
			this.isProcessing.set(false);
			return false;
		}

		const fileId = `pdf-streaming-${Date.now()}`;

		this.loggingService.logAction("pdf_streaming_processing_start", {
			fileId,
			filename: file.name,
			fileSize: file.size,
		});

		try {
			// Extract text from PDF
			const textResult = await firstValueFrom(this.pdfService.extractTextFromPdf(file));

			if (typeof textResult === "object" && textResult.hasOwnProperty("text")) {
				this.aiService
					.generateStreamingSummary(textResult.text as string, file.name)
					.pipe(takeUntil(this.destroy$))
					.subscribe({
						error: (error) => {
							this.error.set(error instanceof Error ? error.message : "Unknown error");
							this.isProcessing.set(false);
							this.loggingService.logAction("pdf_streaming_processing_error", {
								fileId,
								error: error instanceof Error ? error.message : "Unknown error",
							});
						},
						complete: () => {
							// When streaming is complete, copy the final bullets to the summary
							this.summaryBullets.set([...this.aiService.streamedBullets()]);
							this.isProcessing.set(false);
							this.loggingService.logAction("pdf_streaming_processing_complete", { fileId });
						},
					});
			} else {
				throw new Error("Failed to extract text from PDF");
			}

			return true;
		} catch (error) {
			this.error.set(error instanceof Error ? error.message : "Unknown error");
			this.isProcessing.set(false);
			this.loggingService.logAction("pdf_streaming_processing_error", {
				fileId,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			return false;
		}
	}

	/**
	 * Cleanup resources when service is destroyed
	 */
	ngOnDestroy(): void {
		this.destroy$.next(true);
		this.destroy$.complete();
	}
}
