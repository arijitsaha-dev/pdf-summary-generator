import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiService } from '../../services/ai.service';
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
	pdfFileName = signal<string>("");
	isLoading = signal<boolean>(true);
	error = signal<string>("");

	// Streaming mode state
	isStreaming = signal<boolean>(false);

	// Services
	private router = inject(Router);
	private route = inject(ActivatedRoute);
	private loggingService = inject(LoggingService);
	private summarizationService = inject(SummarizationService);
	private aiService = inject(AiService);

	// For cleanup
	private destroy$ = new Subject<void>();

	// Computed signals that derive from AI service
	readonly summaryBullets = computed(() => {
		// If streaming is complete, use streamed bullets, otherwise use regular summary bullets
		if (this.isStreaming() && !this.aiService.isStreamingComplete()) {
			return this.aiService.streamedBullets();
		} else {
			return this.summarizationService.summaryBullets();
		}
	});

	// Expose AI service signals for the template
	readonly currentBulletIndex = this.aiService.currentBulletIndex;
	readonly currentBulletText = this.aiService.currentBulletText;
	readonly streamedBullets = this.aiService.streamedBullets;
	readonly isStreamingComplete = this.aiService.isStreamingComplete;

	constructor() {
		// Create an effect to update error signal from the summarization service
		effect(() => {
			const serviceError = this.summarizationService.error();
			if (serviceError) {
				this.error.set(serviceError);
			}
		});
	}

	ngOnInit(): void {
		// Check if we're in streaming mode
		this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
			if (params['mode'] === 'streaming') {
				this.isStreaming.set(true);
				// Get the current file name
				this.pdfFileName.set(this.summarizationService.currentFileName());
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
