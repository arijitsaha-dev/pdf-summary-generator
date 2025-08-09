import { Injectable, inject, signal, type OnDestroy } from "@angular/core";
import { EMPTY, Subject, concat, defer, from, of, type Observable } from "rxjs";
import { catchError, concatMap, delay, finalize, map, scan, takeUntil, tap } from "rxjs/operators";
import { HttpClientReqService } from "./global/http-client-req.service";
import { LoggingService } from "./logging.service";

/**
 * Interface for API summary response
 */
export interface SummaryResponse {
	result: {
		summary: string[];
	};
}

/**
 * Interface for streaming summary response
 */
export interface StreamingSummaryState {
	isComplete: boolean;
	bulletPoints: string[];
	currentBulletIndex: number;
	currentBulletText: string;
}

/**
 * Service for AI-powered text summarization
 *
 * This service wraps the GenKit and Anthropic Claude integration, providing a clean
 * interface for generating PDF summaries.
 */
@Injectable({
	providedIn: "root",
})
export class AiService implements OnDestroy {
	private readonly loggingService = inject(LoggingService);
	private readonly httpReqService = inject(HttpClientReqService);
	private readonly destroy$ = new Subject<boolean>();

	// Signal-based state for streaming summary
	private readonly _isStreamingComplete = signal<boolean>(false);
	private readonly _currentBulletIndex = signal<number>(-1);
	private readonly _currentBulletText = signal<string>('');
	private readonly _streamedBullets = signal<string[]>([]);

	// Public read-only signals for components to consume
	readonly isStreamingComplete = this._isStreamingComplete.asReadonly();
	readonly currentBulletIndex = this._currentBulletIndex.asReadonly();
	readonly currentBulletText = this._currentBulletText.asReadonly();
	readonly streamedBullets = this._streamedBullets.asReadonly();

	/**
	 * Generate a summary from PDF text using Anthropic Claude
	 *
	 * @param pdfText - The PDF text content to summarize
	 * @param filename - The original filename (for context and logging)
	 * @returns Observable with array of bullet points summarizing the PDF content
	 */
	generateSummary(pdfText: string, filename: string): Observable<SummaryResponse> {
		this.loggingService.logAction("claude_api_call_start", {
			filename,
			textLength: pdfText.length,
		});

		return this.httpReqService.postRequest("/api/summary", { pdfText, filename }).pipe(
			takeUntil(this.destroy$),
			map((response: unknown) => response as SummaryResponse),
			catchError((error) => {
				this.loggingService.logAction("claude_api_error", {
					filename,
					error: error instanceof Error ? error.message : JSON.stringify(error),
				});
				return of({ result: { summary: [] } } as SummaryResponse);
			}),
		);
	}

	/**
	 * Generate a streaming summary that simulates AI typing effect
	 *
	 * @param pdfText - The PDF text content to summarize
	 * @param filename - The original filename (for context and logging)
	 * @returns Observable with streaming summary state that updates as text "appears"
	 */
	generateStreamingSummary(pdfText: string, filename: string): Observable<StreamingSummaryState> {
		// Reset the streaming state
		this.resetStreamingState();

		return this.generateSummary(pdfText, filename).pipe(
			concatMap((response) => {
				const bullets = response.result.summary || [];

				// If no bullets, return empty state
				if (bullets.length === 0) {
					this._isStreamingComplete.set(true);
					return of({
						isComplete: true,
						bulletPoints: [],
						currentBulletIndex: -1,
						currentBulletText: ''
					} as StreamingSummaryState);
				}

				// Create a stream of bullet points with typing effect
				const streamAllBullets = bullets.map((bullet: string, bulletIndex: number) => {
					// Split the bullet into individual characters
					return from(bullet.split('')).pipe(
						// Add random delay between characters (30-70ms) for realistic typing effect
						concatMap(char => defer(() => of(char).pipe(delay(Math.random() * 45)))),
						scan((acc, char) => acc + char, ''),
						tap(partialText => {
							// Update signals with the current state
							this._currentBulletIndex.set(bulletIndex);
							this._currentBulletText.set(partialText);

							// Update bullet points array
							const updatedBullets = [...this._streamedBullets()];

							// Make sure the array is at least as large as needed
							while (updatedBullets.length <= bulletIndex) {
								updatedBullets.push('');
							}

							// Update the current bullet being typed
							updatedBullets[bulletIndex] = partialText;

							// Update the signal with the new array
							this._streamedBullets.set(updatedBullets);
						}),
						map(partialText => {
							// Create a new bullet points array with all previous completed bullets
							const updatedBullets = bullets.map((_, index) => {
								if (index < bulletIndex) {
									// Keep completed bullet points intact
									return bullets[index];
								} else if (index === bulletIndex) {
									// Current bullet being typed
									return partialText;
								} else {
									// Future bullets are empty
									return '';
								}
							});

							return {
								isComplete: false,
								bulletPoints: updatedBullets,
								currentBulletIndex: bulletIndex,
								currentBulletText: partialText
							} as StreamingSummaryState;
						})
					);
				});

				// Process bullet points sequentially with appropriate pauses
				let combinedStream: Observable<StreamingSummaryState>;

				if (streamAllBullets.length === 0) {
					// Return empty state if no bullets
					combinedStream = of({
						isComplete: true,
						bulletPoints: [],
						currentBulletIndex: -1,
						currentBulletText: ''
					} as StreamingSummaryState);
				} else {
					// Start with the first bullet stream with no delay
					combinedStream = streamAllBullets[0];

					// Add subsequent bullet streams with pauses
					for (let i = 1; i < streamAllBullets.length; i++) {
						// Create a pause observable that emits the last state
						const pause = of(null).pipe(
							delay(400), // 400ms pause between bullets
							concatMap(() => streamAllBullets[i])
						);
						combinedStream = concat(combinedStream, pause);
					}

					// Add final complete state
					combinedStream = concat(
						combinedStream,
						of({
							isComplete: true,
							bulletPoints: bullets,
							currentBulletIndex: bullets.length - 1,
							currentBulletText: bullets[bullets.length - 1] || ''
						} as StreamingSummaryState).pipe(
							tap(() => {
								// Update final state signals
								this._streamedBullets.set(bullets);
								this._isStreamingComplete.set(true);
							})
						)
					);
				}

				// Return the combined stream with cleanup
				return combinedStream.pipe(
					finalize(() => {
						this._isStreamingComplete.set(true);
					})
				);
			}),
			catchError(() => {
				this._isStreamingComplete.set(true);
				return EMPTY;
			})
		);
	}

	/**
	 * Reset all streaming state signals to initial values
	 */
	private resetStreamingState(): void {
		this._isStreamingComplete.set(false);
		this._currentBulletIndex.set(-1);
		this._currentBulletText.set('');
		this._streamedBullets.set([]);
	}

	/**
	 * Cleanup resources when service is destroyed
	 */
	ngOnDestroy(): void {
		this.destroy$.next(true);
		this.destroy$.complete();
	}
}
