/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 */

// Zone.js is required by Angular
import "zone.js";

// RegExp lookbehind assertions polyfill
// This is needed for Angular SSR and other dependencies
(function () {
	try {
		// Test if lookbehind is supported
		new RegExp("(?<!a)b");
	} catch (e) {
		// Polyfill for lookbehind assertions
		const wrap = (re: RegExp) => {
			return {
				exec: function (str: string) {
					return re.exec(str);
				},
				test: function (str: string) {
					return re.test(str);
				},
				[Symbol.match]: function (str: string) {
					return str.match(re);
				},
				[Symbol.matchAll]: function (str: string) {
					return str.matchAll(re);
				},
				[Symbol.replace]: function (str: string, replacer: any) {
					return str.replace(re, replacer);
				},
				[Symbol.search]: function (str: string) {
					return str.search(re);
				},
				[Symbol.split]: function (str: string, limit?: number) {
					return str.split(re, limit);
				},
				get source() {
					return re.source;
				},
				get flags() {
					return re.flags;
				},
				get global() {
					return re.global;
				},
				get ignoreCase() {
					return re.ignoreCase;
				},
				get multiline() {
					return re.multiline;
				},
				get sticky() {
					return re.sticky;
				},
				get unicode() {
					return re.unicode;
				},
				get dotAll() {
					return re.dotAll;
				},
				get lastIndex() {
					return re.lastIndex;
				},
				set lastIndex(v) {
					re.lastIndex = v;
				},
			};
		};

		const handler = {
			construct(target: any, args: any) {
				const pattern = args[0];
				const flags = args[1] || "";

				// Only wrap if lookbehind is used
				if (typeof pattern === "string" && /\\(?![\s\S]|$)/.test(pattern)) {
					const re = new RegExp(
						pattern.replace(/\\([pP])([^\s\S]|$)/g, "\\$1").replace(/\\([pP]\{([^}]+)\})/g, "\\$1"),
						flags,
					);
					return wrap(re);
				}

				return new target(...args);
			},
		};

		// @ts-ignore
		RegExp = new Proxy(RegExp, handler);
	}
})();

// Minimal polyfills for browser and server-side rendering
if (typeof window !== "undefined") {
	// Set global reference to window
	(window as any).global = window;

	// Add process object if it doesn't exist (for server-side rendering compatibility)
	if (!(window as any).process) {
		(window as any).process = { env: {} };
	}

	// Simple polyfill for requestAnimationFrame
	if (!window.requestAnimationFrame) {
		(() => {
			const vendors = ["ms", "moz", "webkit", "o"];

			for (const vendor of vendors) {
				const raf = (window as any)[`${vendor}RequestAnimationFrame`];
				if (raf) {
					window.requestAnimationFrame = raf;
					window.cancelAnimationFrame =
						(window as any)[`${vendor}CancelAnimationFrame`] ||
						(window as any)[`${vendor}CancelRequestAnimationFrame`];
					break;
				}
			}

			if (!window.requestAnimationFrame) {
				let lastTime = 0;
				window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
					const currTime = Date.now();
					const timeToCall = Math.max(0, 16 - (currTime - lastTime));
					const id = window.setTimeout(() => {
						callback(currTime + timeToCall);
					}, timeToCall);
					lastTime = currTime + timeToCall;
					return id;
				};

				if (!window.cancelAnimationFrame) {
					window.cancelAnimationFrame = (id: number): void => {
						clearTimeout(id);
					};
				}
			}
		})();
	}
}

// Add global to window, assigning the value of window itself.
declare global {
	interface Window {
		process?: {
			env: Record<string, string | undefined>;
		};
		global: typeof globalThis;
		webkitRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
		mozRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
		msRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
	}
}

// Initialize globals for browser and server-side rendering
if (typeof window !== "undefined") {
	// For browser environment
	window.global = window;

	// Add process object if it doesn't exist (for server-side rendering compatibility)
	if (!window.process) {
		// Minimal process.env implementation for browser
		window.process = {
			env: {} as Record<string, string | undefined>,
			// Add other minimal required properties to satisfy TypeScript
			argv: [],
			exit: (_code?: number) => {
				/* noop */
			},
			nextTick: (callback: (...args: unknown[]) => void, ...args: unknown[]): void => {
				setTimeout(() => callback(...args), 0);
			},
		} as unknown as NodeJS.Process;
	}

	// Request animation frame polyfill for older browsers
	(function initializeRequestAnimationFrame(): void {
		const raf =
			window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.msRequestAnimationFrame;

		if (raf) {
			window.requestAnimationFrame = raf.bind(window);
		}
	})();
}
