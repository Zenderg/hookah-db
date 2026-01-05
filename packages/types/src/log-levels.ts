/**
 * Log level enumeration
 * Represents the severity/importance of a log message
 * Ordered from most severe (error) to least severe (silly)
 */
export enum LogLevel {
  /** Error conditions - something went wrong */
  ERROR = 'error',
  /** Warning conditions - potentially harmful situations */
  WARN = 'warn',
  /** Informational messages - normal operational messages */
  INFO = 'info',
  /** HTTP request/response logging */
  HTTP = 'http',
  /** Verbose messages - more detailed than info */
  VERBOSE = 'verbose',
  /** Debug messages - diagnostic information */
  DEBUG = 'debug',
  /** Silly messages - very detailed debugging info */
  SILLY = 'silly',
}

/**
 * Log level type union
 * Allows using LogLevel enum values as string literals
 */
export type LogLevelType = keyof typeof LogLevel | LogLevel;
