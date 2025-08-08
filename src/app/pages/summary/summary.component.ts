import { CommonModule } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoggingService } from '../../services/logging.service';

@Component({
	selector: "app-summary",
	imports: [CommonModule],
	templateUrl: "./summary.component.html",
	styleUrl: "./summary.component.scss",
})
export class SummaryComponent implements OnInit {
	// State signals
	summaryBullets = signal<string[]>([]);
	pdfFileName = signal<string>("");
	isLoading = signal<boolean>(true);
	error = signal<string>("");

	// Services
	private router = inject(Router);
	private loggingService = inject(LoggingService);

	ngOnInit(): void {
		this.isLoading.set(false);
		this.loggingService.logAction("summary_page_viewed", {
			summaryBullets: this.summaryBullets(),
			fileName: this.pdfFileName(),
			isLoading: this.isLoading(),
			error: this.error(),
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
}
