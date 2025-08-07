import { inject, Injectable } from "@angular/core";
import { HttpStatus } from "../../shared/utils/http-status";
import { SnackbarService } from "./snackbar.service";

@Injectable({
	providedIn: "root",
})
export class HttpErrorHandlerService {
	_snackbarService = inject(SnackbarService);
	/**
	 * This service can be used to handle API errors.
	 */

	errorHandler(errorResponse: any): void {
		switch (errorResponse["status"] as number) {
			case HttpStatus.BAD_REQUEST:
				this._snackbarService.openSnackBar((errorResponse["message"] || "400 error") as string);
				break;
			case HttpStatus.UNAUTHORIZED:
				this._snackbarService.openSnackBar((errorResponse["message"] || "401 error") as string);
				break;
			case HttpStatus.FORBIDDEN:
				this._snackbarService.openSnackBar((errorResponse["message"] || "403 error") as string);
				break;
			case HttpStatus.NOT_FOUND:
				this._snackbarService.openSnackBar((errorResponse["message"] || "404 error") as string);
				break;
			case HttpStatus.UNPROCESSABLE_ENTITY:
				this._snackbarService.openSnackBar((errorResponse["message"] || "422 error") as string);
				break;
			case HttpStatus.FAILED_DEPENDENCY:
				this._snackbarService.openSnackBar((errorResponse["message"] || "424 error") as string);
				break;
			case HttpStatus.INTERNAL_SERVER_ERROR:
				this._snackbarService.openSnackBar((errorResponse["message"] || "Something went wrong!") as string);
				break;
			default:
				this._snackbarService.openSnackBar(
					(errorResponse["message"] ||
						"There seems to be an error. Please try again. If the problem persists, reach out to the support team.") as string,
				);
		}
	}
}
