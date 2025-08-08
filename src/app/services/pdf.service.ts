import type { OnDestroy } from "@angular/core";
import { Injectable, inject } from "@angular/core";
import type { Observable} from "rxjs";
import { Subject, takeUntil, map, catchError, of } from "rxjs";
import { HttpClientReqService } from "./global/http-client-req.service";
// import { LoggerService } from "./global/logger.service";

/**
 * Service for handling PDF operations including file validation, upload, and text extraction
 * Uses pdfmake for PDF processing
 */
@Injectable({
	providedIn: "root",
})
export class PdfService implements OnDestroy {
	private httpReqService = inject(HttpClientReqService);
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	/**
	 * Extracts text from a PDF file by sending it to the server API endpoint
	 * @param file The PDF file to extract text from
	 * @returns Observable with the extracted text response
	 */
	extractTextFromPdf(file: File): Observable<any> {
		// Create a FormData object to send the file as multipart/form-data
		const formData = new FormData();
		// Add the file with field name 'file' (matching what server expects)
		formData.append("file", file, file.name);

		// Send the FormData to the API endpoint
		return this.httpReqService
			.postRequest("/api/pdf", formData)
			.pipe(
				takeUntil(this._destroy$),
				map((res: any) => res),
				catchError((error: any) => of(error)));

	}

	ngOnDestroy(): void {
		this._destroy$.next(true);
		this._destroy$.complete();
	}
}
