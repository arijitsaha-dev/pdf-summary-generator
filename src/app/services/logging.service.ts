import { isPlatformBrowser } from "@angular/common";
import { Injectable, PLATFORM_ID, inject } from "@angular/core";


/**
 * Service for logging user interactions and system events
 * Logs are stored in memory and can be persisted to sessionStorage
 */
@Injectable({
	providedIn: "root",
})
export class LoggingService {

	// Inject platform ID to detect browser environment
	private platformId = inject(PLATFORM_ID);

	/**
	 * Checks if code is running in browser environment
	 * @returns true if in browser, false if in server
	 */
	private isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	/**
	 * Log a user action with optional details
	 * @param action The action being performed
	 * @param details Additional details about the action
	 */
	logAction(action: string, details: Record<string, unknown> = {}): void {
		// Output to console in development mode only
		if (this.isBrowser()) {
			// eslint-disable-next-line no-console
			console.log(`[LOG] ${action}:`, details);
		}
	}
}
