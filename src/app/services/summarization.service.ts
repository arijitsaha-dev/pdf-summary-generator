/* eslint-disable no-prototype-builtins */
import { Injectable, inject, signal } from "@angular/core";
import { type OnDestroy } from "@angular/core";
import { PdfService } from "./pdf.service";
import { LoggingService } from "./logging.service";
import { AiService } from "./ai.service";
import { type StreamingSummaryState } from "./ai.service";
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
	
	// Streaming summary state signals
	readonly isStreamingComplete = signal<boolean>(false);
	readonly currentBulletIndex = signal<number>(-1);
	readonly currentBulletText = signal<string>("");
	readonly streamedBullets = signal<string[]>([]);

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
	 * 2. Generate streaming summary from the text
	 * 3. Update UI in real-time as bullet points arrive
	 *
	 * @param file - The PDF file to process
	 * @returns Promise indicating processing success
	 */
	async processStreamingPdf(file: File): Promise<boolean> {
		// Reset state and validate file
		this.isProcessing.set(true);
		this.error.set(null);
		this.progress.set(0);
		this.resetStreamingState();
		this.currentFileName.set(file.name);

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
				// Generate streaming summary
				this.aiService
					.generateStreamingSummary(textResult.text as string, file.name)
					.pipe(takeUntil(this.destroy$))
					.subscribe(
						// Update streaming state on each emission
						(streamState: StreamingSummaryState) => {
							this.updateStreamingState(streamState);
						},
						// Handle errors
						(error) => {
							this.error.set(error.message as string);
							this.isProcessing.set(false);
						},
						// Complete streaming
						() => {
							this.isStreamingComplete.set(true);
							this.isProcessing.set(false);
							this.loggingService.logAction("pdf_streaming_processing_complete", { fileId });
						}
					);
			} else {
				throw new Error("Failed to extract text from PDF");
			}

			return true;
		} catch (error) {
			this.error.set(error instanceof Error ? error.message : "Unknown error");
			this.isProcessing.set(false);
			this.loggingService.logAction("pdf_streaming_processing_error", {
				fileId,
				error: error instanceof Error ? error.message : "Unknown error"
			});
			return false;
		}
	}

	/**
	 * Reset all streaming state signals to initial values
	 */
	private resetStreamingState(): void {
		this.isStreamingComplete.set(false);
		this.currentBulletIndex.set(-1);
		this.currentBulletText.set("");
		this.streamedBullets.set([]);
	}
	
	/**
	 * Update streaming state signals based on current streaming state
	 */
	private updateStreamingState(state: StreamingSummaryState): void {
		this.isStreamingComplete.set(state.isComplete);
		this.currentBulletIndex.set(state.currentBulletIndex);
		this.currentBulletText.set(state.currentBulletText);
		this.streamedBullets.set([...state.bulletPoints]);
		
		// Also update the normal summary bullets when complete
		if (state.isComplete) {
			this.summaryBullets.set([...state.bulletPoints]);
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
