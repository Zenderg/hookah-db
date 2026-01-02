/**
 * Parse Error
 *
 * Custom error class for HTML parsing errors with additional context.
 *
 * @module parser-error
 */

/**
 * Custom error class for HTML parsing failures
 */
export class ParseError extends Error {
  /** The CSS selector or element being parsed */
  public readonly element: string;

  /** The HTML content being parsed (truncated for large content) */
  public readonly html: string;

  /** Optional underlying error that caused this parse error */
  public readonly cause?: Error;

  /**
   * Create a new ParseError
   *
   * @param message - Error message describing what went wrong
   * @param element - CSS selector or element being parsed
   * @param html - HTML content being parsed
   * @param cause - Optional underlying error
   */
  constructor(message: string, element: string, html: string, cause?: Error) {
    super(message);
    this.name = 'ParseError';
    this.element = element;
    // Truncate HTML to avoid massive error messages
    this.html = html.length > 500 ? html.substring(0, 500) + '...' : html;
    this.cause = cause;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ParseError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseError);
    }
  }

  /**
   * Get a detailed error message including context
   */
  getDetailedMessage(): string {
    let message = `${this.name}: ${this.message}\n`;
    message += `Element: ${this.element}\n`;
    if (this.cause) {
      message += `Caused by: ${this.cause.message}\n`;
    }
    message += `HTML preview: ${this.html}`;
    return message;
  }

  /**
   * Convert error to a plain object for serialization
   */
  toJSON(): {
    name: string;
    message: string;
    element: string;
    html: string;
    cause?: string;
  } {
    return {
      name: this.name,
      message: this.message,
      element: this.element,
      html: this.html,
      cause: this.cause?.message,
    };
  }
}
