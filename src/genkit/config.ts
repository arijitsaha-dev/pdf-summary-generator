/**
 * GenKit and Anthropic Claude API Configuration
 *
 * This file provides the necessary configuration for connecting to the
 * Anthropic Claude API through GenKit. It handles loading API keys from
 * environment variables for security best practices.
 */

import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

/**
 * Configuration interface for GenKit and Anthropic API
 */
export interface GenKitConfig {
  /** Anthropic API key */
  anthropicApiKey: string;
  /** Default Claude model to use */
  defaultModel: string;
}

/**
 * Direct config access that doesn't rely on Angular DI - for server usage
 * Safe to use in non-Angular contexts like Express routes
 */
export const config: GenKitConfig = {
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'] || 'placeholder-for-ssr',
  defaultModel: 'claude-3-haiku-20240307'
};

/**
 * Load and verify API keys for GenKit integration
 * Ensures API keys are properly set before making API calls
 * NOTE: This should only be used in Angular components/services
 *
 * @returns Configuration object with API keys and settings
 * @throws Error if required environment variables are missing
 */
export function loadGenKitConfig(): GenKitConfig {
  // For SSR safety, check if we're in browser environment
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // In SSR context, we'll use placeholder values (API calls will only happen client-side)
  if (!isBrowser) {
    console.warn('GenKit config accessed in SSR context, using placeholder values');
    return {
      anthropicApiKey: 'placeholder-for-ssr',
      defaultModel: 'claude-3-haiku-20240307'
    };
  }

  // Get API key from environment variable
  // In real production app, these would be properly injected at build/runtime
  const anthropicApiKey = process.env['ANTHROPIC_API_KEY'] || '';

  // Verify API key is available
  if (!anthropicApiKey) {
    console.error('Missing ANTHROPIC_API_KEY environment variable');
    throw new Error(
      'Anthropic API key is required. Please set the ANTHROPIC_API_KEY environment variable.'
    );
  }

  return {
    anthropicApiKey,
    defaultModel: 'claude-3-haiku-20240307' // Default to Claude 3 Haiku
  };
}

/**
 * Initialize Claude API client with proper configuration
 * This ensures the API client is configured with the right API key
 */
export function initializeClaudeClient(): void {
  const config = loadGenKitConfig();

  // In a real implementation, this would configure the Claude client
  // For example: claude.setApiKey(config.anthropicApiKey);
  console.log('Claude API initialized with model:', config.defaultModel);
}
