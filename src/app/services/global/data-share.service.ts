import type { OnDestroy } from "@angular/core";
import { Injectable, signal } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class DataShareService implements OnDestroy {
	/**
	 * This service can be used to share data across application.
	 */

	showAlert = signal<boolean>(false);
	sidebarActive = signal<boolean>(true);
	shareDistrictData = signal<object>({});
	private _destroy$: Subject<boolean> = new Subject<boolean>();

	// Unsubscribe from the subject itself
	ngOnDestroy(): void {
		this._destroy$.next(true);
		this._destroy$.complete();
	}
}
