/* eslint-disable @typescript-eslint/no-var-requires */
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
const pdf = require("pdf-parse");

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

		logger.log(`Processing PDF: ${filename}, size: ${req.file.buffer.length} bytes`);

		// Dynamically import pdf.js with Node.js compatibility settings
		pdf(pdfBuffer).then((data: any) => {
			return res.status(200).json({
				text: data.text,
				filename,
				status: "success",
			});
		});
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
