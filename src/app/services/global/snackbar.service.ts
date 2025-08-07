import { inject, Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
	providedIn: null,
})
export class SnackbarService {
	private _snackBar = inject(MatSnackBar);
	durationInSeconds = 5;

	openSnackBar(_message: string): void {
		this._snackBar.open(_message, "", {
			duration: this.durationInSeconds * 1000,
			horizontalPosition: "end",
			verticalPosition: "bottom",
			politeness: "off",
			panelClass: ["snackbar-error"],
		});
	}
}
