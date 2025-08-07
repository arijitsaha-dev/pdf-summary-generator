import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";

/**
 * Log levels for the application
 */
export enum LogLevel {
	OFF = 0,
	ERROR = 1,
	WARN = 2,
	INFO = 3,
	DEBUG = 4,
	TRACE = 5,
}

/**
 * Global logger service for consistent logging across the application
 */
@Injectable({
	providedIn: null,
})
export class LoggerService {
	// Default log level from environment or INFO if not specified
	private level: LogLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;

	/**
	 * Sets the current log level
	 * @param level The log level to set
	 */
	setLogLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * Gets the current log level
	 * @returns The current log level
	 */
	getLogLevel(): LogLevel {
		return this.level;
	}

	/**
	 * Logs a message at the ERROR level
	 * @param message The message to log
	 * @param context The context (usually component/service name)
	 * @param optionalParams Additional parameters to log
	 */
	error(message: string, context?: string, ...optionalParams: unknown[]): void {
		this.logWith(LogLevel.ERROR, message, context, optionalParams);
	}

	/**
	 * Logs a message at the WARN level
	 * @param message The message to log
	 * @param context The context (usually component/service name)
	 * @param optionalParams Additional parameters to log
	 */
	warn(message: string, context?: string, ...optionalParams: unknown[]): void {
		this.logWith(LogLevel.WARN, message, context, optionalParams);
	}

	/**
	 * Logs a message at the INFO level
	 * @param message The message to log
	 * @param context The context (usually component/service name)
	 * @param optionalParams Additional parameters to log
	 */
	info(message: string, context?: string, ...optionalParams: unknown[]): void {
		this.logWith(LogLevel.INFO, message, context, optionalParams);
	}

	/**
	 * Logs a message at the DEBUG level
	 * @param message The message to log
	 * @param context The context (usually component/service name)
	 * @param optionalParams Additional parameters to log
	 */
	debug(message: string, context?: string, ...optionalParams: unknown[]): void {
		this.logWith(LogLevel.DEBUG, message, context, optionalParams);
	}

	/**
	 * Logs a message at the TRACE level
	 * @param message The message to log
	 * @param context The context (usually component/service name)
	 * @param optionalParams Additional parameters to log
	 */
	trace(message: string, context?: string, ...optionalParams: unknown[]): void {
		this.logWith(LogLevel.TRACE, message, context, optionalParams);
	}

	/**
	 * Internal method to handle logging with specific level
	 * @param level The log level
	 * @param message The message to log
	 * @param context The context (usually component/service name)
	 * @param optionalParams Additional parameters to log
	 */
	private logWith(level: LogLevel, message: string, context?: string, optionalParams: unknown[] = []): void {
		if (this.level < level) {
			return;
		}

		const timestamp = new Date().toLocaleString();
		const contextStr = context ? `[${context}]` : "";
		const levelStr = LogLevel[level];

		const formattedMessage = `${timestamp} ${levelStr} ${contextStr}: ${message}`;

		switch (level) {
			case LogLevel.ERROR:
				// eslint-disable-next-line no-console
				console.error(formattedMessage, ...(optionalParams as []));
				break;
			case LogLevel.WARN:
				// eslint-disable-next-line no-console
				console.warn(formattedMessage, ...(optionalParams as []));
				break;
			case LogLevel.INFO:
				// eslint-disable-next-line no-console
				console.info(formattedMessage, ...(optionalParams as []));
				break;
			case LogLevel.DEBUG:
			case LogLevel.TRACE:
			default:
				// eslint-disable-next-line no-console
				console.log(formattedMessage, ...(optionalParams as []));
				break;
		}
	}
}
