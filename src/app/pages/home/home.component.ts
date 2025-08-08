import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FileUploadComponent } from '../../components/file-upload/file-upload.component';
import { LoggingService } from '../../services/logging.service';
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
	async handleFileSelected(file: File): Promise<void> {
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
			timestamp: new Date().toLocaleString(),
		});

		// Process the PDF file using our summarization service
		this.processingStatus.set(`Processing ${file.name}...`);

		// Use the new summarization service which handles both extraction and summarization
		const data = await this.summarizationService.processPdf(file);
		if (data) {
			this.processingStatus.set(`Processing Complete`);
			this.isProcessing.set(false);
			this.router.navigate(["/summary"]);
		}
	}
}
