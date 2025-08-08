import { Injectable, inject } from "@angular/core";
import { of, Subject, type Observable } from "rxjs";
import { catchError, map, takeUntil } from "rxjs/operators";
import { LoggingService } from "./logging.service";
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
	private readonly loggingService = inject(LoggingService);
	private httpReqService = inject(HttpClientReqService);
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	/**
	 * Generate a summary from PDF text using Anthropic Claude
	 *
	 * @param pdfText - The extracted text content from a PDF file
	 * @param filename - The original filename (for context and logging)
	 * @returns Observable with array of bullet points summarizing the PDF content
	 */
	generateSummary(pdfText: string, filename: string): Observable<any> {
		this.loggingService.logAction("claude_api_call_start", {
			filename,
			textLength: pdfText.length,
		});

		return this.httpReqService.postRequest("/api/summary", { pdfText, filename }).pipe(
			takeUntil(this._destroy$),
			map((response: any) => response),
			catchError((error) => {
				this.loggingService.logAction("claude_api_error", {
					filename,
					error: error instanceof Error ? error.message : JSON.stringify(error),
				});
				return of(error);
			}),
		);
	}
}
