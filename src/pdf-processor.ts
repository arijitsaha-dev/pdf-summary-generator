// /* eslint-disable @typescript-eslint/no-var-requires */
// import type { Request, Response } from "express";
// import express from "express";
// import multer from "multer";
// const pdf = require("pdf-parse");
// import { Logger } from "./app/services/logger.service";

// // Configure storage for uploaded files
// const storage = multer.memoryStorage();
// const app = express();
// const logger = new Logger();

// // Configure file filter to only accept PDFs
// const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
// 	if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
// 		cb(null, true);
// 	} else {
// 		cb(null, false);
// 		return cb(new Error("Only PDF files are allowed"));
// 	}
// };

// // Configure multer with options
// const upload = multer({
// 	storage,
// 	fileFilter,
// 	limits: {
// 		fileSize: 10 * 1024 * 1024, // 10MB max file size
// 	},
// });

// /**
//  * PDF upload and text extraction endpoint
//  */
// app.post(
// 	"/api/pdf",
// 	upload.single("file") as express.RequestHandler,
// 	async (req: Request, res: Response): Promise<Response | void> => {
// 		try {
// 			logger.log("PDF upload endpoint hit");

// 			// Check if file was provided
// 			if (!req.file) {
// 				logger.error("No file was uploaded");
// 				return res.status(400).json({
// 					error: "No file was uploaded",
// 					status: "error",
// 				});
// 			}

// 			const pdfBuffer = req.file.buffer;
// 			const filename = req.file.originalname;

// 			logger.log(`Processing PDF: ${filename}, size: ${req.file.buffer.length} bytes`);

// 			// Dynamically import pdf.js with Node.js compatibility settings
// 			pdf(pdfBuffer).then((data: any) => {
// 				return res.status(200).json({
// 					text: data.text,
// 					filename,
// 					status: "success",
// 				});
// 			});
// 		} catch (error) {
// 			logger.error(`File upload error: ${error instanceof Error ? error.message : "Unknown error"}`);
// 			return res.status(500).json({
// 				error: "Failed to process file",
// 				details: error instanceof Error ? error.message : "Unknown error",
// 				status: "error",
// 			});
// 		}
// 	},
// );

// export default app;
