# PDF Summary Generator

An Angular 20 application that generates AI-powered summaries from PDF documents with real-time streaming updates.

## Features

- Upload and process PDF files
- Extract text content from PDFs
- Generate AI-powered summaries using GenKit with Anthropic Claude
- Real-time streaming of summary bullets with typing effect
- Responsive design with Tailwind CSS

## Requirements

- Node.js (v20+)
- Angular CLI
- Anthropic API key

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

1. Create a `.env` file in the root directory based on `.env.example`
2. Add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

> **Note:** An Anthropic API key is required to run this application. Please refer to `.env.example` file for other configuration options.

## Usage

### Development

```bash
# Start the application with HMR
npm run start:hmr
```

### Production

```bash
# Build for production
npm run build:prod

# Run the production server
npm run start:hmr
```

## How It Works

The application uses AI streaming pattern with signals and reactive primitives to provide a real-time summary experience. The PDF text is processed using GenKit integration with Claude AI to generate concise bullet-point summaries.
