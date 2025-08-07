import { isPlatformBrowser } from "@angular/common";
import type { AfterViewInit, OnDestroy } from "@angular/core";
import { ChangeDetectorRef, Component, inject, PLATFORM_ID, signal } from "@angular/core";
import { Subject } from "rxjs";
import { DataShareService } from "src/app/services/global/data-share.service";
import { LoggerService } from "src/app/services/global/logger.service";
import { SnackbarService } from "src/app/services/global/snackbar.service";

@Component({
	selector: "app-notify-connection",
	templateUrl: "./notify-connection.component.html",
	styleUrl: "./notify-connection.component.scss",
	providers: [LoggerService, SnackbarService],
})
export class NotifyConnectionComponent implements OnDestroy, AfterViewInit {
	private _serviceName = NotifyConnectionComponent.name;
	_message = signal<string>("");
	_eventType = signal<string>("");
	_dataShare = inject(DataShareService);
	private _cdr = inject(ChangeDetectorRef);
	private _destroy$: Subject<boolean> = new Subject<boolean>();
	private readonly _platformId = inject(PLATFORM_ID);
	private _listenersAdded = false;
	private _logger = inject(LoggerService);
	private _snackbarService = inject(SnackbarService);

	ngAfterViewInit(): void {
		// Only run in browser
		if (isPlatformBrowser(this._platformId)) {
			this._logger.info(`Setting up connection listeners`, this._serviceName);

			// Wait a tick to ensure component is fully initialized
			setTimeout(() => {
				this._setupConnectionListeners();
			}, 0);
		}
	}

	private _setupConnectionListeners(): void {
		if (this._listenersAdded) return;
		this._listenersAdded = true;

		this._logger.debug("Adding online/offline event listeners", this._serviceName);

		// Adding event to track when the window have come Online
		window.addEventListener("online", this.handleOnline);

		// Adding event to track when the window went Offline
		window.addEventListener("offline", this.handleOffline);
	}

	// Use arrow functions to preserve 'this' context
	private handleOnline = (): void => {
		// this._dataShare['showAlert'].set(true);
		// this._eventType.set('online');
		this._message.set("Internet Connection Restored");
		this._logger.info("Internet connection restored", this._serviceName);
		this._snackbarService.openSnackBar(this._message());
		// Manually trigger change detection since we're outside of Angular's detection
		this._cdr.detectChanges();
	};

	private handleOffline = (): void => {
		// this._dataShare['showAlert'].set(true);
		// this._eventType.set('offline');
		this._message.set("Internet Connection Lost");
		this._logger.warn("Internet connection lost", this._serviceName);
		this._snackbarService.openSnackBar(this._message());
		// Manually trigger change detection since we're outside of Angular's detection
		this._cdr.detectChanges();
	};

	hideWindow(): void {
		// if (this._eventType() != '') {
		// 	this._dataShare['showAlert'].set(false);
		// }
	}

	// Unsubscribe from the subject itself and remove event listeners
	ngOnDestroy(): void {
		this._destroy$.next(true);
		this._destroy$.complete();

		// Clean up event listeners
		if (isPlatformBrowser(this._platformId) && this._listenersAdded) {
			this._logger.debug("Removing online/offline event listeners", this._serviceName);
			window.removeEventListener("online", this.handleOnline);
			window.removeEventListener("offline", this.handleOffline);
		}
	}
}
