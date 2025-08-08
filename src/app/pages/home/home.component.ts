import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { LoggingService } from '../../services/logging.service';
// import { PdfService } from '../../services/pdf.service';
import { SummarizationService } from '../../services/summarization.service';

@Component({
	selector: "app-home",
	imports: [CommonModule, FileUploadComponent],
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.scss",
})
export class HomeComponent {
	// Service injections
	private router = inject(Router);
	// private pdfService = inject(PdfService);
	private loggingService = inject(LoggingService);
	private summarizationService = inject(SummarizationService);

	// Component state signals
	isProcessing = signal<boolean>(false);
	processingStatus = signal<string>("");
	errorMessage = signal<string>("");
	currentFile = signal<File | null>(null);
	extractProgress = signal<number>(0);

	/**
	 * Handle file selection from the upload component
	 * @param file Selected PDF file
	 */
	handleFileSelected(file: File): void {
		this.isProcessing.set(true);
		this.errorMessage.set("");
		this.processingStatus.set(`Uploading ${file.name}...`);
		this.extractProgress.set(0);
		this.currentFile.set(file);

		// Log the file selection action
		this.loggingService.logAction("file_selected", {
			filename: file.name,
			fileSize: file.size,
			fileType: file.type,
			timestamp: new Date().toISOString(),
		});

		// Connect to PDF service progress signal
		// this.extractProgress = this.pdfService.progress;

		// Process the PDF file using our summarization service
		this.processingStatus.set(`Processing ${file.name}...`);

		// Use the new summarization service which handles both extraction and summarization
		this.summarizationService.processPdf(file)
		// .subscribe({
		// 	next: (summaryBullets) => {
		// 		// Store the summary in session storage to use on the summary page
		// 		this.storeSummary(summaryBullets, file.name);
		// 		this.isProcessing.set(false);
		// 		this.processingStatus.set("Processing complete");

		// 		// Log successful processing
		// 		this.loggingService.logAction("summarization_complete", {
		// 			filename: file.name,
		// 			summaryBulletCount: summaryBullets.length,
		// 			timestamp: new Date().toISOString(),
		// 		});

		// 		// Navigate to the summary page
		// 		this.router.navigate(["/summary"]);
		// 	},
		// 	error: (error) => this.handleError(error, file.name),
		// });
	}

	/**
	 * Store the summary bullets in session storage
	 * @param summaryBullets Array of summary bullet points
	 * @param filename Name of the PDF file
	 */
	private storeSummary(summaryBullets: string[], filename: string): void {
		// Store the summary bullets as JSON string
		sessionStorage.setItem("pdfSummary", JSON.stringify(summaryBullets));
		sessionStorage.setItem("pdfFileName", filename);
	}

	/**
	 * Handle errors from the PDF processing
	 * @param error Error object or message
	 * @param filename Name of the file being processed
	 */
	private handleError(error: Error | unknown, filename?: string): void {
		this.isProcessing.set(false);
		const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
		this.errorMessage.set(errorMessage);
		this.processingStatus.set("Error processing file");

		// Log the error
		this.loggingService.logAction("processing_error", {
			filename: filename || "unknown file",
			error: errorMessage,
			timestamp: new Date().toISOString(),
		});
	}
}
