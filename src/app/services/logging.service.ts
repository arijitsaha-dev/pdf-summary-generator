import { Injectable, signal, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { PLATFORM_ID } from "@angular/core";

/**
 * Interface defining the structure of a session log entry
 */
interface SessionLog {
	timestamp: number;
	action: string;
	details: Record<string, unknown>;
	sessionId: string;
}

/**
 * Service for logging user interactions and system events
 * Logs are stored in memory and can be persisted to sessionStorage
 */
@Injectable({
	providedIn: "root",
})
export class LoggingService {
	private readonly SESSION_LOG_KEY = "pdf_summarizer_session_logs";
	private readonly sessionId: string;
	private logs = signal<SessionLog[]>([]);
	
	// Inject platform ID to detect browser environment
	private platformId = inject(PLATFORM_ID);

	constructor() {
		// Generate session ID only in browser environment
		this.sessionId = this.isBrowser() ? crypto.randomUUID() : 'server-side-session';
		
		// Load logs only in browser
		if (this.isBrowser()) {
			this.loadLogsFromStorage();
		}
	}
	
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
		const logEntry: SessionLog = {
			timestamp: Date.now(),
			action,
			details,
			sessionId: this.sessionId,
		};

		// Add to current logs
		this.logs.update((currentLogs) => [...currentLogs, logEntry]);

		// Save to session storage only in browser
		if (this.isBrowser()) {
			this.persistLogsToStorage();
		}

		// Output to console in development mode only
		if (this.isBrowser()) {
			// eslint-disable-next-line no-console
			console.log(`[LOG] ${action}:`, details);
		}
	}

	/**
	 * Get all logs for the current session
	 * @returns Array of session log entries
	 */
	getAllLogs(): SessionLog[] {
		return this.logs();
	}

	/**
	 * Get logs filtered by action type
	 * @param action The action type to filter by
	 * @returns Filtered array of log entries
	 */
	getLogsByAction(action: string): SessionLog[] {
		return this.logs().filter((log) => log.action === action);
	}

	/**
	 * Clear all logs for the current session
	 */
	clearLogs(): void {
		this.logs.set([]);
		if (this.isBrowser()) {
			sessionStorage.removeItem(this.SESSION_LOG_KEY);
		}
	}

	/**
	 * Save logs to session storage
	 */
	private persistLogsToStorage(): void {
		// Skip if not in browser
		if (!this.isBrowser()) return;
		
		try {
			sessionStorage.setItem(this.SESSION_LOG_KEY, JSON.stringify(this.logs()));
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Failed to save logs to session storage:", error);
		}
	}

	/**
	 * Load logs from session storage
	 */
	private loadLogsFromStorage(): void {
		// Skip if not in browser
		if (!this.isBrowser()) return;
		
		try {
			const storedLogs = sessionStorage.getItem(this.SESSION_LOG_KEY);
			if (storedLogs) {
				const parsedLogs = JSON.parse(storedLogs) as SessionLog[];
				this.logs.set(parsedLogs);
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Failed to load logs from session storage:", error);
		}
	}
}
