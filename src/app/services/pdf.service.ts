import type { OnDestroy } from "@angular/core";
import { Injectable, inject } from "@angular/core";
import { Subject, takeUntil } from "rxjs";
import { HttpClientReqService } from "./global/http-client-req.service";
// import { LoggerService } from "./global/logger.service";

/**
 * Service for handling PDF operations including file validation, upload, and text extraction
 * Uses pdfmake for PDF processing
 */
@Injectable({
	providedIn: "root",
})
export class PdfService implements OnDestroy {
	private httpReqService = inject(HttpClientReqService);
	// private loggingService = inject(LoggerService);
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	// 	// Signal to track processing state
	// 	isProcessing = signal(false);

	// 	// Signal to track error state
	// 	errorMessage = signal<string | null>(null);

	// 	// Signal to track extraction progress
	// 	progress = signal(0);

	// 	private loggingService = inject(LoggingService);

	// 	// Inject platform ID to detect browser environment
	// 	private platformId = inject(PLATFORM_ID);

	// 	// Inject application ref
	// 	private appRef = inject(ApplicationRef);

	/**
	 * Extracts text from a PDF file by sending it to the server API endpoint
	 * @param file The PDF file to extract text from
	 * @returns Observable with the extracted text response
	 */
	extractTextFromPdf(file: File): any {
		// Create a FormData object to send the file as multipart/form-data
		const formData = new FormData();
		// Add the file with field name 'file' (matching what server expects)
		formData.append("file", file, file.name);

		// Send the FormData to the API endpoint
		this.httpReqService
			.postRequest("/api/pdf", formData)
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(response) => {
					// this.loggingService.info("PDF extracted successfully", response);
					return response;
				},
				(error) => {
					// this.loggingService.error("PDF extraction failed", error);
					return error;
				},
			);
	}

	ngOnDestroy(): void {
		this._destroy$.next(true);
		this._destroy$.complete();
	}
}
