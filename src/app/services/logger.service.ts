/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-console */
// src/app/core/server-logger.service.ts
import { Injectable } from "@angular/core";

@Injectable()
export class Logger {
	log(message: string, ...optionalParams: unknown[]): void {
		console.log(`[SERVER][${new Date().toLocaleString()}]`, message, ...optionalParams);
	}

	error(message: string, ...optionalParams: unknown[]): void {
		console.error(`[SERVER][${new Date().toLocaleString()}] ERROR:`, message, ...optionalParams);
	}

	warn(message: string, ...optionalParams: unknown[]): void {
		console.warn(`[SERVER][${new Date().toLocaleString()}] WARN:`, message, ...optionalParams);
	}
}
