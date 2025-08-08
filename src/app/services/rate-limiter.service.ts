import { Injectable, inject } from '@angular/core';
import { LoggingService } from './logging.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

/**
 * Rate limit configuration for different API providers
 */
export interface RateLimitConfig {
  // Maximum requests allowed in the time window
  maxRequests: number;
  
  // Time window in milliseconds
  windowMs: number;
  
  // Optional delay between requests in milliseconds
  delayMs?: number;
}

/**
 * Service to handle API rate limiting
 * 
 * This service implements token bucket rate limiting to prevent
 * hitting API rate limits when making requests to external services.
 */
@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly loggingService = inject(LoggingService);
  
  // Track request timestamps for different providers
  private requestTimestamps: Record<string, number[]> = {};
  
  // Default configs for known API providers
  private configs: Record<string, RateLimitConfig> = {
    // Claude has a rate limit of 5 requests per minute for most API keys
    anthropic: {
      maxRequests: 5,
      windowMs: 60 * 1000, // 1 minute
      delayMs: 300 // Small delay between requests
    },
    // Default fallback config
    default: {
      maxRequests: 10,
      windowMs: 60 * 1000
    }
  };
  
  /**
   * Check if a request can be made based on rate limits
   * 
   * @param provider - API provider name (e.g., 'anthropic')
   * @returns Promise that resolves when the request can proceed
   */
  async checkRateLimit(provider: string): Promise<void> {
    // Skip rate limiting on server side
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    const config = this.configs[provider] || this.configs['default'];
    const now = Date.now();
    
    // Initialize timestamps array if not exists
    if (!this.requestTimestamps[provider]) {
      this.requestTimestamps[provider] = [];
    }
    
    // Filter out timestamps outside the current window
    this.requestTimestamps[provider] = this.requestTimestamps[provider].filter(
      timestamp => now - timestamp < config.windowMs
    );
    
    // Check if we've hit the rate limit
    if (this.requestTimestamps[provider].length >= config.maxRequests) {
      const oldestTimestamp = this.requestTimestamps[provider][0];
      const windowExpiry = oldestTimestamp + config.windowMs;
      const waitTime = windowExpiry - now;
      
      this.loggingService.logAction('rate_limit_hit', {
        provider,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        waitTimeMs: waitTime
      });
      
      // Wait until we can make another request
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      
      // Try again after waiting
      return this.checkRateLimit(provider);
    }
    
    // Add artificial delay between requests if configured
    if (config.delayMs && this.requestTimestamps[provider].length > 0) {
      const lastRequestTime = Math.max(...this.requestTimestamps[provider]);
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < config.delayMs) {
        const delayTime = config.delayMs - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    }
    
    // Record this request timestamp
    this.requestTimestamps[provider].push(Date.now());
  }
  
  /**
   * Register a completed request
   * 
   * @param provider - API provider name
   * @param success - Whether the request was successful
   */
  registerRequest(provider: string, success: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    this.loggingService.logAction('api_request_complete', {
      provider,
      success,
      timestamp: new Date().toISOString(),
      currentRequests: this.requestTimestamps[provider]?.length || 0
    });
  }
  
  /**
   * Update rate limit config for a provider
   * 
   * @param provider - API provider name
   * @param config - New rate limit config
   */
  updateConfig(provider: string, config: Partial<RateLimitConfig>): void {
    this.configs[provider] = {
      ...(this.configs[provider] || this.configs['default']),
      ...config
    };
    
    this.loggingService.logAction('rate_limit_config_updated', {
      provider,
      config: this.configs[provider]
    });
  }
}
