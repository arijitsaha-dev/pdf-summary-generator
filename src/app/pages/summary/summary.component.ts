import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoggingService } from '../../services/logging.service';
import { SummarizationService } from '../../services/summarization.service';

@Component({
	selector: "app-summary",
	imports: [CommonModule],
	templateUrl: "./summary.component.html",
	styleUrl: "./summary.component.scss",
})
export class SummaryComponent implements OnInit, OnDestroy {
	// State signals
	summaryBullets = signal<string[]>([]);
	pdfFileName = signal<string>("");
	isLoading = signal<boolean>(true);
	error = signal<string>("");
	
	// Streaming state signals
	isStreaming = signal<boolean>(false);
	currentBulletIndex = signal<number>(-1);
	currentBulletText = signal<string>("");
	streamedBullets = signal<string[]>([]);
	isStreamingComplete = signal<boolean>(false);
	
	// Services
	private router = inject(Router);
	private route = inject(ActivatedRoute);
	private loggingService = inject(LoggingService);
	private summarizationService = inject(SummarizationService);
	
	// For cleanup
	private destroy$ = new Subject<void>();

	ngOnInit(): void {
		// Check if we're in streaming mode
		this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
			if (params['mode'] === 'streaming') {
				this.isStreaming.set(true);
				this.setupStreamingObservers();
			}
		});
		
		this.isLoading.set(false);
		this.loggingService.logAction("summary_page_viewed", {
			streaming: this.isStreaming(),
			summaryBullets: this.summaryBullets(),
			fileName: this.pdfFileName(),
			isLoading: this.isLoading(),
			timestamp: new Date().toLocaleString(),
		});
	}
	
	/**
	 * Subscribe to streaming summary state from the summarization service
	 */
	private setupStreamingObservers(): void {
		// Extract the current file name
		const fileName = this.summarizationService.currentFileName();
		this.pdfFileName.set(fileName);
		
		// Track streaming state
		this.currentBulletText.set(this.summarizationService.currentBulletText());
		this.currentBulletIndex.set(this.summarizationService.currentBulletIndex());
		this.streamedBullets.set(this.summarizationService.streamedBullets());
		this.isStreamingComplete.set(this.summarizationService.isStreamingComplete());
		
		// When streaming is complete, update the full summary bullets
		if (this.isStreamingComplete()) {
			this.summaryBullets.set(this.summarizationService.summaryBullets());
		} else {
			// Set up signal effects to track changes in the summarization service
			this.watchStreamingSignals();
		}
	}
	
	/**
	 * Set up watchers on summarization service signals to update our component signals
	 */
	private watchStreamingSignals(): void {
		// Create effect to update currentBulletText when it changes in the service
		const textInterval = setInterval(() => {
			this.currentBulletText.set(this.summarizationService.currentBulletText());
			this.currentBulletIndex.set(this.summarizationService.currentBulletIndex());
			this.streamedBullets.set(this.summarizationService.streamedBullets());
			
			// Check if streaming is complete
			const isComplete = this.summarizationService.isStreamingComplete();
			this.isStreamingComplete.set(isComplete);
			
			if (isComplete) {
				// Update final bullets and clear interval
				this.summaryBullets.set(this.summarizationService.summaryBullets());
				clearInterval(textInterval);
			}
		}, 50); // Check every 50ms for smooth updates
	}

	/**
	 * Navigate back to the home page
	 */
	goBack(): void {
		this.loggingService.logAction("navigate_to_upload", {
			fromPage: "summary",
			timestamp: new Date().toLocaleString(),
		});

		this.router.navigate(["/home"]);
	}
	
	/**
	 * Cleanup resources when component is destroyed
	 */
	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
