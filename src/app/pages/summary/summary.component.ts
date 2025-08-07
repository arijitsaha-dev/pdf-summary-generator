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
	pdfText = signal<string>("");
	pdfFileName = signal<string>("");
	isLoading = signal<boolean>(true);
	error = signal<string>("");

	// Services
	private router = inject(Router);
	private loggingService = inject(LoggingService);

	ngOnInit(): void {
		// Attempt to load PDF text from session storage
		try {
			const text = sessionStorage.getItem("pdfText");
			const fileName = sessionStorage.getItem("pdfFileName");

			if (!text || !fileName) {
				// No data found, navigate back to home
				this.error.set("No PDF data found. Please upload a PDF file.");

				this.loggingService.logAction("summary_error", {
					error: "No PDF data found in session storage",
					timestamp: new Date().toISOString(),
				});

				setTimeout(() => {
					this.router.navigate(["/home"]);
				}, 2000);
				return;
			}

			// Data found, show it
			this.pdfText.set(text);
			this.pdfFileName.set(fileName);
			this.isLoading.set(false);

			this.loggingService.logAction("summary_loaded", {
				filename: fileName,
				textLength: text.length,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			this.error.set("Failed to load PDF data.");
			this.isLoading.set(false);

			this.loggingService.logAction("summary_error", {
				error: error instanceof Error ? error.message : "Unknown error loading PDF data",
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Navigate back to the home page
	 */
	goBack(): void {
		this.loggingService.logAction("navigate_to_upload", {
			fromPage: "summary",
			timestamp: new Date().toISOString(),
		});

		this.router.navigate(["/home"]);
	}
}
