import { Injectable, inject } from '@angular/core';
import { LoggingService } from './logging.service';

/**
 * Interface for API error response objects
 */
interface ApiErrorResponse {
  status?: number;
  statusCode?: number;
  message?: string;
  error?: { message?: string };
}

/**
 * Error categories for API and application errors
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

/**
 * Structured error object with additional metadata
 */
export interface AppError {
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  retryable: boolean;
  timestamp: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}

/**
 * Service to standardize error handling across the application
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private readonly loggingService = inject(LoggingService);

  /**
   * Handle an API error and convert it to a standardized AppError
   *
   * @param error - The original error object
   * @param context - Additional context about the error
   * @returns Standardized AppError object
   */
  handleApiError(error: unknown, context?: Record<string, unknown>): AppError {
    let appError: AppError;

    // Handle Error instances
    if (error instanceof Error) {
      appError = this.processErrorInstance(error, context);
    }
    // Handle response-like objects with status codes
    else if (this.isResponseLike(error)) {
      appError = this.processResponseError(error, context);
    }
    // Handle unknown error types
    else {
      appError = {
        message: 'An unknown error occurred',
        category: ErrorCategory.UNKNOWN,
        retryable: false,
        timestamp: new Date().toLocaleString(),
        originalError: error,
        context
      };
    }

    // Log the error
    this.loggingService.logAction('api_error', {
      message: appError.message,
      category: appError.category,
      statusCode: appError.statusCode,
      retryable: appError.retryable,
      context: appError.context
    });

    return appError;
  }

  /**
   * Process an Error instance
   *
   * @param error - Error instance
   * @param context - Additional context
   * @returns Standardized AppError
   * @private
   */
  private processErrorInstance(error: Error, context?: Record<string, unknown>): AppError {
    // Check for network errors
    if (error.message.toLowerCase().includes('network') ||
        error.message.toLowerCase().includes('connection')) {
      return {
        message: 'Network connection error',
        category: ErrorCategory.NETWORK,
        retryable: true,
        timestamp: new Date().toLocaleString(),
        originalError: error,
        context
      };
    }

    // Check for authentication errors
    if (error.message.toLowerCase().includes('auth') ||
        error.message.toLowerCase().includes('unauthorized') ||
        error.message.toLowerCase().includes('api key')) {
      return {
        message: 'Authentication error',
        category: ErrorCategory.AUTHENTICATION,
        retryable: false,
        timestamp: new Date().toLocaleString(),
        originalError: error,
        context
      };
    }

    // Default error handling
    return {
      message: error.message || 'An application error occurred',
      category: ErrorCategory.CLIENT,
      retryable: false,
      timestamp: new Date().toLocaleString(),
      originalError: error,
      context
    };
  }

  /**
   * Process response-like errors with status codes
   *
   * @param error - Response-like error object
   * @param context - Additional context
   * @returns Standardized AppError
   * @private
   */
  private processResponseError(error: ApiErrorResponse, context?: Record<string, unknown>): AppError {
    // Access index signature properties using bracket notation to satisfy linter
    const statusCode = error['status'] || error['statusCode'] || 500;
    let category = ErrorCategory.UNKNOWN;
    let message = 'API error';
    let retryable = false;

    // Categorize based on status code
    if (statusCode && typeof statusCode === 'number') {
      if (statusCode >= 400 && statusCode < 500) {
        if (statusCode === 401 || statusCode === 403) {
          category = ErrorCategory.AUTHENTICATION;
          message = 'Authentication failed';
        } else if (statusCode === 422) {
          category = ErrorCategory.VALIDATION;
          message = 'Validation error';
        } else if (statusCode === 429) {
          category = ErrorCategory.RATE_LIMIT;
          message = 'Rate limit exceeded';
          retryable = true;
        } else {
          category = ErrorCategory.CLIENT;
          message = `Client error (${statusCode})`;
        }
      } else if (statusCode >= 500) {
        category = ErrorCategory.SERVER;
        message = `Server error (${statusCode})`;
        retryable = true;
      }
    }

    // Extract error message if available
    if (error['message'] && typeof error['message'] === 'string') {
      message = error['message'];
    } else if (error['error']?.['message'] && typeof error['error']['message'] === 'string') {
      message = error['error']['message'];
    }

    return {
      message,
      category,
      statusCode,
      retryable,
      timestamp: new Date().toLocaleString(),
      originalError: error,
      context
    };
  }

  /**
   * Check if an object is response-like with status codes
   *
   * @param obj - Object to check
   * @returns True if the object has status code properties
   * @private
   */
  private isResponseLike(obj: unknown): obj is ApiErrorResponse {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const candidate = obj as Record<string, unknown>;
    return (
      ('status' in candidate && typeof candidate['status'] === 'number') ||
      ('statusCode' in candidate && typeof candidate['statusCode'] === 'number')
    );
  }

  /**
   * Create a user-friendly error message
   *
   * @param error - AppError or Error object
   * @returns User-friendly error message
   */
  getUserFriendlyMessage(error: AppError | Error | unknown): string {
    if (error instanceof Error) {
      return this.simplifyErrorMessage(error.message);
    }

    if (this.isAppError(error)) {
      const baseMessage = this.getBaseMessageForCategory(error.category);

      // Add status code for certain categories
      if (error.category === ErrorCategory.SERVER && error.statusCode) {
        return `${baseMessage} (${error.statusCode})`;
      }

      return baseMessage;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Type guard to check if an object is an AppError
   *
   * @param obj - Object to check
   * @returns True if the object is an AppError
   * @private
   */
  private isAppError(obj: unknown): obj is AppError {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    const candidate = obj as Record<string, unknown>;
    return (
      'message' in candidate && typeof candidate['message'] === 'string' &&
      'category' in candidate && typeof candidate['category'] === 'string' &&
      'retryable' in candidate && typeof candidate['retryable'] === 'boolean'
    );
  }

  /**
   * Get a base message for each error category
   *
   * @param category - Error category
   * @returns User-friendly message for the category
   * @private
   */
  private getBaseMessageForCategory(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Network connection error. Please check your internet connection.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your API key.';
      case ErrorCategory.RATE_LIMIT:
        return 'Rate limit exceeded. Please try again in a minute.';
      case ErrorCategory.VALIDATION:
        return 'The request contained invalid data.';
      case ErrorCategory.SERVER:
        return 'The server encountered an error. Please try again later.';
      case ErrorCategory.CLIENT:
        return 'There was an error with your request.';
      case ErrorCategory.UNKNOWN:
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Simplify technical error messages for user display
   *
   * @param message - Original error message
   * @returns Simplified message
   * @private
   */
  private simplifyErrorMessage(message: string): string {
    // Hide technical details and credentials
    const sanitized = message
      .replace(/api[-_]?key[^a-z]*\w+/gi, 'API_KEY_REDACTED')
      .replace(/bearer\s+[^\s]+/gi, 'BEARER_TOKEN_REDACTED');

    // Simplify common error patterns
    if (sanitized.match(/network|connection|offline|unreachable/i)) {
      return 'Network connection error. Please check your internet connection.';
    }

    if (sanitized.match(/timeout|timed? out/i)) {
      return 'The request timed out. Please try again.';
    }

    if (sanitized.match(/rate\s*limit|too\s*many\s*requests|429/i)) {
      return 'Rate limit exceeded. Please try again in a minute.';
    }

    if (sanitized.match(/auth|unauthorized|forbidden|api[-_]?key|401|403/i)) {
      return 'Authentication failed. Please check your API key.';
    }

    return sanitized;
  }
}
