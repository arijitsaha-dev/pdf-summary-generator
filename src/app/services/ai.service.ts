import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { from, Subject, throwError, type Observable } from "rxjs";
import { catchError, map, retry, takeUntil, timeout } from "rxjs/operators";
import { LoggingService } from "./logging.service";
import { ErrorHandlerService } from "./error-handler.service";
import { HttpClientReqService } from "./global/http-client-req.service";

/**
 * Service for AI-powered text summarization
 *
 * This service wraps the GenKit and Anthropic Claude integration, providing a clean
 * interface for generating summaries from PDF text content.
 */
@Injectable({
	providedIn: "root",
})
export class AiService {
	private readonly platformId = inject(PLATFORM_ID);
	private readonly loggingService = inject(LoggingService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private httpReqService = inject(HttpClientReqService);
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	// Configuration
	private readonly REQUEST_TIMEOUT_MS = 30000; // 30 seconds
	private readonly MAX_RETRIES = 2; // Number of retries for transient errors

	/**
	 * Generate a summary from PDF text using Anthropic Claude
	 *
	 * @param pdfText - The extracted text content from a PDF file
	 * @param filename - The original filename (for context and logging)
	 * @returns Observable with array of bullet points summarizing the PDF content
	 */
	generateSummary(pdfText: string, filename: string): Observable<string[]> {
		// Guard for SSR
		if (!isPlatformBrowser(this.platformId)) {
			return throwError(() => new Error("Summary generation is only available in browser environment"));
		}

		// Log the summarization request
		this.loggingService.logAction("summary_generation_start", {
			filename,
			textLength: pdfText.length,
		});

		return from(this.callClaudeApi(pdfText, filename)).pipe(
			// Add timeout to prevent hanging requests
			timeout(this.REQUEST_TIMEOUT_MS),

			// Retry transient errors automatically
			retry({
				count: this.MAX_RETRIES,
				delay: (error, retryCount) => {
					const appError = this.errorHandler.handleApiError(error, {
						filename,
						retryCount,
					});

					// Only retry if the error is marked as retryable
					if (!appError.retryable) {
						throw error;
					}

					// Calculate exponential backoff delay (1s, 2s, 4s, etc.)
					const delayMs = Math.pow(2, retryCount - 1) * 1000;

					this.loggingService.logAction("retry_summary_generation", {
						filename,
						retryCount,
						delayMs,
						errorCategory: appError.category,
					});

					return from(new Promise((resolve) => setTimeout(resolve, delayMs)));
				},
			}),

			map((response) => response.summary),

			catchError((error) => {
				// Convert to standardized error
				const appError = this.errorHandler.handleApiError(error, { filename });

				// Get user-friendly message
				const userMessage = this.errorHandler.getUserFriendlyMessage(appError);

				this.loggingService.logAction("summary_generation_error", {
					filename,
					errorMessage: userMessage,
					errorCategory: appError.category,
				});

				return throwError(() => new Error(userMessage));
			}),
		);
	}

	/**
	 * Call Claude API via GenKit to generate summary
	 *
	 * @param pdfText - The PDF text content to summarize
	 * @param filename - The original filename
	 * @returns Promise with summary response
	 * @private
	 */
	private async callClaudeApi(pdfText: string, filename: string): Promise<any> {
		this.loggingService.logAction("claude_api_call_start", {
			filename,
			textLength: pdfText.length,
		});

		this.httpReqService
			.postRequest("/api/summary", { pdfText, filename })
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(response: any) => {
					console.log("response========>>>>>>>>>>>", response);
					// Validate response: any
					if (!response || !Array.isArray(response.summary)) {
						throw new Error("Invalid response format from Claude API");
					}
					// Log successful completion
					this.loggingService.logAction("summary_generation_complete", {
						filename,
						summaryLength: response.summary.length,
					});
					return { summary: response.summary };
				},
				(error) => {
					this.loggingService.logAction("claude_api_error", {
						filename,
						error: error instanceof Error ? error.message : JSON.stringify(error),
					});
					return error;
				},
				() => {
					return true;
				},
			);
	}
}
