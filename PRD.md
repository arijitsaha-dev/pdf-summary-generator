# 📄 PDF Summary Generator MVP – Product Requirements Document (PRD)

## 🧩 Overview

The PDF Summary Generator is a lightweight, AI-powered Angular 20 application that allows users to upload a PDF document and receive a concise, bullet-point summary of its content. The summary is generated using GenKit and integrates with Angular's AI tooling (`Windsurf`, `vive-coding`, and Signals API).

---

## 🎯 Goals & Objectives

- Allow users to upload **only** `.pdf` files (MIME `application/pdf`) from the UI.
- Extract text from the PDF on the client (or backend, if required for large files).
- Generate a **summarized response** using **GenKit** powered by the **Anthropic Claude** model.
- GenKit must handle all communication with the Anthropic model (no direct SDK calls from Angular).
- Display the summary as **clean, bullet-point content**.
- Persist every summarisation session in a root-level `memory/` folder; each file is named `<uploaded-filename>.txt`.
- Optionally allow downloading or copying the summary.

---

## 🏗️ Architecture Overview

### Frontend: Angular 20
- **Standalone Components**
- **Signals for reactivity**
- File Upload → PDF Parsing → Summary Display

### Backend (Optional)
- A lightweight Node service running **GenKit** exposes a single endpoint:
  - `POST /summarize` → `{ file: PDF }` → `{ summary: string[] }`
- Internally, GenKit invokes the **Anthropic Claude** model. All prompt/response logs are written to `memory/<filename>.txt`.

### GenKit (AI Logic)
- Model: **Anthropic Claude** (via GenKit integration)
- Prompt template:
  "Summarize the following PDF text into short bullet points for easy understanding"
- GenKit manages streaming, retries, and rate-limits.
- Deployment: local or cloud-hosted; endpoint documented above.

### GenKit Flow Implementation Reference

A reference implementation (`public/sample-genkit-flow.ts`) demonstrates how to:
1. Configure the GenKit client with plugins and a chosen model.
2. Define reusable tools (e.g., `getDateTime`) using `ai.defineTool`.
3. Build a conversational or task-oriented **flow** with `ai.defineFlow`, specifying input & output Zod schemas.
4. Maintain multi-turn context via `ai.createSession` and `session.chat()`.
5. Parse the model response safely via a helper (e.g., `maybeStripMarkdown`).

For PDF summarisation you must:
- Create `src/genkit/summary.flow.ts` patterned on the sample.
- Input schema: `{ pdfText: string, filename: string }`.
- Output schema: `{ summary: string[] }`.
- Inside the flow:
  1. Craft the prompt: "Summarize the following PDF text into short bullet points for easy understanding".
  2. Call the Anthropic Claude model via GenKit.
  3. Persist `{ prompt, response }` to `memory/<filename>.txt` (append mode).
- Expose the flow through the `/summarize` endpoint described above.

Follow the same TypeScript patterns (strict types, Zod validation) and error handling as in the sample file.

---

## 📌 Features

| Feature                             | Description                                                                 |
|-------------------------------------|-----------------------------------------------------------------------------|
| 🗂 PDF Upload                        | Accept **only** `.pdf` files; client-side MIME validation                   |
| 📜 PDF Parsing                      | Extract text with `pdfjs-dist` or similar                                  |
| 🤖 AI-Powered Summary               | GenKit → Anthropic Claude → bullet-point summary                            |
| 💬 Bullet-point Summary Display     | Tailwind/Angular Material list component                                   |
| 🧩 Memory Persistence               | Store prompt & response in `memory/<filename>.txt`                          |
| 🔁 Signals-Based UI                 | Reactive updates using `signal()` & `computed()`                            |
| 🧠 AI Dev Mode (vive coding)        | Use `@angular/cli-ai` to scaffold UI logic                                 |
| 🛠 Download or Copy Summary         | Export/copy summary text                                                   |

---

## 🎨 UI/UX Design Reference

The user interface MUST match the visual and interaction patterns demonstrated in the HTML prototypes stored in `public/designs/`:

1. `public/designs/2.html` – Landing & upload page (`DocuSummarize` hero section with PDF upload button).
2. `public/designs/3.html` – Two-pane summary view (original PDF preview on the left, AI-generated bullet summary on the right).

Guidelines to follow:
- Tailwind utility classes, color palette, typography (`Inter` font) and spacing **must** mirror the prototypes.
- Sticky, translucent header with blur and bottom border.
- Responsive layout: single-column on mobile; 2-column grid from `lg` breakpoint.
- Use brand primary color `#0d7ff2` for accents (upload/primary buttons, bullet dots, icons).
- Ensure accessible color contrast (WCAG AA) for all text.
- All buttons include hover/active states exactly as designed.
- Components mapping:
  - `HeaderComponent` & `FooterComponent` use markup from both prototypes.
  - `FileUploadComponent` derives from prototype 2.
  - `SummaryViewComponent` derives from prototype 3 (summary list with coloured bullet dots).

Future design tweaks should be reflected both in prototypes and this PRD to stay in sync.
