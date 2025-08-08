/* eslint-disable @typescript-eslint/consistent-type-imports */
import {
	AngularNodeAppEngine,
	createNodeRequestHandler,
	isMainModule,
	writeResponseToNodeResponse,
} from "@angular/ssr/node";
import * as dotenv from "dotenv";
import express, { Request, Response } from "express";
import * as path from "node:path";
import { join } from "node:path";
import { Logger } from "./app/services/logger.service";
import multer from "multer";

const rootDir = process.cwd();
// Load environment variables from .env file
dotenv.config({ path: path.resolve(rootDir, ".env") });
const browserDistFolder = join(rootDir, "dist", "pdf-summary-generator", "browser");

const app = express();
const logger = new Logger();
const angularApp = new AngularNodeAppEngine();

/**
 * Serve static files from /browser
 */
app.use(
	express.static(browserDistFolder, {
		maxAge: "1y",
		index: false,
		redirect: false,
	}),
);

/**
 * Add a simple health check endpoint.
 */
app.get("/api/health", (req, res) => {
	logger.log("Health check endpoint hit");
	res.status(200).json({ status: "ok", timestamp: new Date().toLocaleString() });
});

/**
 * Setup middleware for handling file uploads
 */

// Configure storage for uploaded files
const storage = multer.memoryStorage();

// Configure file filter to only accept PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
	if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
		cb(null, true);
	} else {
		cb(null, false);
		return cb(new Error("Only PDF files are allowed"));
	}
};

// Configure multer with options
const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB max file size
	}
});

// Define type-safe interface for PDF.js library
interface PdfJsLib {
	getDocument(params: { data: Buffer | Uint8Array }): { promise: Promise<PdfDocument> };
	GlobalWorkerOptions?: { workerSrc: string | null };
}

interface PdfDocument {
	numPages: number;
	getPage(pageNum: number): Promise<PdfPage>;
}

interface PdfPage {
	getTextContent(): Promise<PdfTextContent>;
}

interface PdfTextContent {
	items: PdfTextItem[];
}

interface PdfTextItem {
	str?: string;
	[key: string]: unknown;
}

// Will be populated with dynamic import
let pdfjsLib: PdfJsLib | null = null;

/**
 * PDF upload and text extraction endpoint
 */
app.post("/api/pdf", upload.single("file") as express.RequestHandler, async (req: Request, res: Response): Promise<Response | void> => {
	try {
		logger.log("PDF upload endpoint hit");

		// Check if file was provided
		if (!req.file) {
			logger.error("No file was uploaded");
			return res.status(400).json({
				error: "No file was uploaded",
				status: "error"
			});
		}

		const pdfBuffer = req.file.buffer;
		const filename = req.file.originalname;

		logger.log(`Processing PDF: ${filename}, size: ${pdfBuffer.length} bytes`);

		// Dynamically import pdf.js with Node.js compatibility settings
		if (!pdfjsLib) {
			try {
				// Polyfill browser objects needed for PDF.js in Node.js environment
				if (typeof global.DOMMatrix === 'undefined') {
					// Use type assertion to avoid complex TypeScript errors
					(global as any).DOMMatrix = class DOMMatrix {
						a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
						m11 = 1; m12 = 0; m13 = 0; m14 = 0;
						m21 = 0; m22 = 1; m23 = 0; m24 = 0;
						m31 = 0; m32 = 0; m33 = 1; m34 = 0;
						m41 = 0; m42 = 0; m43 = 0; m44 = 1;
					};
				}

				// Import standard PDF.js build
				const pdfjs = await import('pdfjs-dist');

				// Get the exported library (handle both default and named exports)
				pdfjsLib = (pdfjs as any).default || pdfjs as PdfJsLib;

				// Disable worker for server environment (critical for SSR)
				if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
					pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";
				}

				logger.log('PDF.js library loaded successfully for server-side processing');
			} catch (error) {
				logger.error('Failed to load PDF.js library', error);
				return res.status(500).json({ error: 'Failed to load PDF processing library' });
			}
		}

		// Extract text from the PDF document
		try {
			// Ensure pdfjsLib is loaded
			if (!pdfjsLib) {
				throw new Error('PDF.js library not initialized');
			}

			// Get PDF document from buffer
			const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
			const pdf = await loadingTask.promise;
			const numPages = pdf.numPages;

			// Track any extraction warnings
			const warnings: string[] = [];
			if (numPages === 0) {
				warnings.push('PDF appears to have no pages');
			}

			logger.log(`PDF loaded successfully. Number of pages: ${numPages}`);

			// Extract text from each page with proper typing and error handling
			const pageTexts: string[] = [];

			for (let pageNum = 1; pageNum <= numPages; pageNum++) {
				try {
					const page = await pdf.getPage(pageNum);
					const textContent = await page.getTextContent();

					// Ensure items exists and use proper type narrowing
					if (!textContent.items || !Array.isArray(textContent.items)) {
						warnings.push(`Page ${pageNum}: Invalid text content structure`);
						continue;
					}

					// Filter and map items with proper type guards
					const pageText = textContent.items
						.filter((item): item is PdfTextItem =>
							item !== null &&
							typeof item === 'object' &&
							'str' in item &&
							typeof item.str === 'string'
						)
						.map(item => item.str || '')
						.join(' ');

					if (pageText.trim()) {
						pageTexts.push(pageText);
					} else {
						warnings.push(`Page ${pageNum} appears to be empty or contains non-textual content`);
					}
				} catch (pageError) {
					const errorMessage = pageError instanceof Error ? pageError.message : 'Unknown error';
					warnings.push(`Error extracting text from page ${pageNum}: ${errorMessage}`);
					logger.error(`Error processing page ${pageNum}:`, pageError);
				}
			}

			// Combine text from all pages
			const extractedText = pageTexts.join('\n\n');

			// Log any warnings
			if (warnings.length > 0) {
				logger.warn(`PDF extraction warnings for ${filename}:`, warnings);
			}

			// Return extracted text with metadata
			return res.status(200).json({
				text: extractedText,
				filename,
				pageCount: numPages,
				warnings: warnings.length > 0 ? warnings : undefined,
				status: "success"
			});
		} catch (pdfError) {
			logger.error("Error extracting text from PDF:", pdfError);
			return res.status(500).json({
				error: "Failed to extract text from PDF",
				details: pdfError instanceof Error ? pdfError.message : 'Unknown error',
				status: "error"
			});
		}
	} catch (error) {
		logger.error(`File upload error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		return res.status(500).json({
			error: "Failed to process file",
			details: error instanceof Error ? error.message : 'Unknown error',
			status: "error"
		});
	}
});

/**
 * Process all requests.
 */
app.use((req, res, next) => {
	logger.log(`${req.method} ${req.url}`);
	next();
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
	angularApp
		.handle(req)
		.then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
		.catch(next);
});

/**
 * Helper function to convert minutes to milliseconds
 */
const minutesToMilliseconds = (minutes: number): number => minutes * 60 * 1000;

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 8080.
 */
// Keep track of active connections
const connections = new Set<import("net").Socket>();

/**
 * Log when the process is about to exit
 */
process.on("exit", (code) => {
	logger.log(`Process is exiting with code ${code}`);
	logger.log(`Active connections at exit: ${connections.size}`);
});

/**
 * Log unhandled promise rejections
 */
process.on("unhandledRejection", (reason, promise) => {
	logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

if (isMainModule(import.meta.url)) {
	try {
		// Default to 4000 if PORT is not set or invalid
		const port = process.env["PORT"] ? parseInt(process.env["PORT"], 10) : 4000;

		logger.log(`Attempting to start server on http://localhost:${port}`);

		const server = app.listen(port, () => {
			const address = server.address();
			const actualPort = typeof address === "string" ? port : address?.port;
			logger.log(`Access the application at: http://localhost:${actualPort}`);

			/**
			 * Log server info for debugging
			 */
			logger.log("Server info:", {
				address: server.address(),
				listening: server.listening,
				maxHeadersCount: server.maxHeadersCount,
				timeout: server.timeout,
				connections: connections.size,
			});
		});

		/**
		 * Track connections
		 */
		server.on("connection", (connection) => {
			connections.add(connection);
			logger.log(`New connection. Total connections: ${connections.size}`);

			connection.on("close", () => {
				connections.delete(connection);
				logger.log(`Connection closed. Remaining connections: ${connections.size}`);
			});
		});

		/**
		 * Keep the process alive
		 */
		const keepAlive = setInterval(() => {
			logger.log(`Keep-alive ping. Active connections: ${connections.size}`);
		}, minutesToMilliseconds(15));

		/**
		 * Clean up on exit
		 */
		const cleanup = () => {
			logger.log(`Cleaning up...`);
			clearInterval(keepAlive);
			server.close(() => {
				logger.log(`Server closed`);
				process.exit(0);
			});

			/**
			 * Force close after timeout
			 */
			setTimeout(() => {
				logger.log(`Forcing server close`);
				process.exit(1);
			}, minutesToMilliseconds(5));
		};

		/**
		 * Clean up on exit
		 */
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);

		server.on("error", (error: NodeJS.ErrnoException) => {
			logger.error("Server error:", error);
			switch (error.code) {
				case "EADDRINUSE":
					logger.error(`Port ${port} is already in use.`);
					break;
				case "EACCES":
					logger.error(`Permission denied: Port ${port} requires elevated privileges.`);
					break;
				case "EADDRNOTAVAIL":
					logger.error(`Address not available. http://localhost:${port}`);
					break;
				default:
					logger.error(`Server error: ${error.message}`);
					break;
			}
			process.exit(1);
		});

		process.on("SIGTERM", () => {
			logger.log("SIGTERM received. Shutting down gracefully.");
			server.close(() => {
				logger.log(`Server closed.`);
				process.exit(0);
			});
		});
	} catch (error) {
		logger.error("Failed to start server:", error);
		process.exit(1);
	}
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
