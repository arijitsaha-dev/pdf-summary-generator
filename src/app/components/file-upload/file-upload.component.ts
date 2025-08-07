import { CommonModule } from "@angular/common";
import { Component, inject, output, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

@Component({
	selector: "app-file-upload",
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: "./file-upload.component.html",
	styleUrl: "./file-upload.component.scss",
})
export class FileUploadComponent {
	private fb = inject(FormBuilder);

	// Signals for component state
	isUploading = signal<boolean>(false);
	uploadButtonText = signal<string>("Upload a PDF");
	errorMessage = signal<string>("");

	// Output event for parent components to handle the file
	fileSelected = output<File>();

	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const files = input?.files;

		if (!files || files.length === 0) {
			return;
		}

		const file = files[0];

		// Reset error message
		this.errorMessage.set("");

		// Validate file is a PDF
		if (file.type !== "application/pdf") {
			this.errorMessage.set("Only PDF files are allowed.");
			// Reset the input
			input.value = "";
			return;
		}

		// Set uploading state
		this.isUploading.set(true);
		this.uploadButtonText.set("Uploading...");

		// Emit the file to parent component
		this.fileSelected.emit(file);

		// In a real application, you would handle the upload completion callback from the parent
		// For now, we'll simulate the upload completion after a delay
		setTimeout(() => {
			this.isUploading.set(false);
			this.uploadButtonText.set("Upload a PDF");
			// Reset the input for future uploads
			input.value = "";
		}, 2000);
	}
}
