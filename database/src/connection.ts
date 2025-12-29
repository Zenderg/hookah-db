/**
 * Database Connection Layer
 *
 * Provides connection pool management, initialization, error handling,
 * retry logic, and health check functionality for PostgreSQL database.
 *
 * @package @hookah-db/database
 */

import { Pool, PoolConfig, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Connection configuration parsed from environment variables
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  min: number;
  max: number;
  timeout: number;
  connectionTimeoutMillis: number;
}

/**
 * Connection state tracking
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  poolSize: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  latency: number;
  error?: string;
}

/**
 * Connection error details
 */
export interface ConnectionError extends Error {
  code?: string;
  isRetryable: boolean;
  attempt: number;
  maxAttempts: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Database connection manager class
 */
export class DatabaseConnection {
  private pool: Pool | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private config: DatabaseConfig | null = null;
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Parse DATABASE_URL environment variable
   * Format: postgresql://user:password@host:port/database
   */
  private parseDatabaseUrl(url: string): Omit<DatabaseConfig, 'min' | 'max' | 'timeout' | 'connectionTimeoutMillis'> {
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    
    if (!match) {
      throw new Error(
        'Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database'
      );
    }

    const [, user, password, host, portStr, database] = match;
    
    if (!user || !password || !host || !portStr || !database) {
      throw new Error('Invalid DATABASE_URL format: missing required fields');
    }

    const port = parseInt(portStr, 10);

    if (isNaN(port)) {
      throw new Error('Invalid port number in DATABASE_URL');
    }

    return {
      host,
      port,
      database,
      user,
      password,
    };
  }

  /**
   * Validate connection parameters
   */
  private validateConfig(config: DatabaseConfig): void {
    if (!config.host || config.host.trim() === '') {
      throw new Error('Database host is required');
    }

    if (config.port < 1 || config.port > 65535) {
      throw new Error('Database port must be between 1 and 65535');
    }

    if (!config.database || config.database.trim() === '') {
      throw new Error('Database name is required');
    }

    if (!config.user || config.user.trim() === '') {
      throw new Error('Database user is required');
    }

    if (!config.password || config.password.trim() === '') {
      throw new Error('Database password is required');
    }

    if (config.min < 0) {
      throw new Error('Minimum pool size cannot be negative');
    }

    if (config.max < config.min) {
      throw new Error('Maximum pool size must be greater than or equal to minimum pool size');
    }

    if (config.timeout < 0) {
      throw new Error('Connection timeout cannot be negative');
    }
  }

  /**
   * Initialize database connection pool
   */
  async initialize(
    databaseUrl?: string,
    minConnections?: number,
    maxConnections?: number,
    timeout?: number
  ): Promise<void> {
    try {
      this.state = ConnectionState.CONNECTING;
      console.log('Initializing database connection...');

      // Get configuration from environment or parameters
      const url = databaseUrl || process.env.DATABASE_URL;
      if (!url) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      const min = minConnections ?? parseInt(process.env.DATABASE_POOL_MIN || '2', 10);
      const max = maxConnections ?? parseInt(process.env.DATABASE_POOL_MAX || '10', 10);
      const connectionTimeout = timeout ?? parseInt(process.env.DATABASE_TIMEOUT || '10000', 10);

      // Parse and validate configuration
      const parsedConfig = this.parseDatabaseUrl(url);
      this.config = {
        ...parsedConfig,
        min,
        max,
        timeout: connectionTimeout,
        connectionTimeoutMillis: connectionTimeout,
      };

      this.validateConfig(this.config);

      // Create connection pool configuration
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        min: this.config.min,
        max: this.config.max,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        idleTimeoutMillis: 30000,
        statement_timeout: this.config.timeout,
      };

      // Create connection pool with retry logic
      this.pool = await this.createPoolWithRetry(poolConfig);

      this.state = ConnectionState.CONNECTED;
      console.log(`Database connection pool initialized successfully`);
      console.log(`  Host: ${this.config.host}:${this.config.port}`);
      console.log(`  Database: ${this.config.database}`);
      console.log(`  Pool size: ${this.config.min} - ${this.config.max}`);
      console.log(`  Connection timeout: ${this.config.timeout}ms`);
    } catch (error) {
      this.state = ConnectionState.ERROR;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize database connection:', errorMessage);
      throw error;
    }
  }

  /**
   * Create connection pool with retry logic
   */
  private async createPoolWithRetry(config: PoolConfig): Promise<Pool> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        console.log(`Connection attempt ${attempt}/${this.retryConfig.maxAttempts}...`);
        
        const pool = new Pool(config);
        
        // Test the connection
        const client = await pool.connect();
        client.release();
        
        return pool;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const isRetryable = this.isRetryableError(lastError);
        
        console.error(`Connection attempt ${attempt} failed:`, lastError.message);
        
        if (!isRetryable || attempt === this.retryConfig.maxAttempts) {
          const connectionError: ConnectionError = {
            ...lastError,
            name: 'ConnectionError',
            code: (error as any)?.code,
            isRetryable,
            attempt,
            maxAttempts: this.retryConfig.maxAttempts,
          };
          throw connectionError;
        }

        // Exponential backoff
        if (attempt < this.retryConfig.maxAttempts) {
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelay);
        }
      }
    }

    throw lastError || new Error('Failed to create connection pool');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      '57P01', // admin shutdown
      '57P02', // crash shutdown
      '57P03', // cannot connect now
    ];

    const code = (error as any).code;
    return retryableCodes.includes(code) || 
           error.message.includes('timeout') ||
           error.message.includes('ETIMEDOUT');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database connection pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Get a client from pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database connection pool not initialized. Call initialize() first.');
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      this.state = ConnectionState.ERROR;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to get client from pool:', errorMessage);
      throw error;
    }
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database connection pool not initialized. Call initialize() first.');
    }

    try {
      return await this.pool.query<T>(text, params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Query execution failed:', errorMessage);
      throw error;
    }
  }

  /**
   * Execute a transaction with automatic client management
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform health check on database connection
   */
  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.pool) {
      return {
        status: 'unhealthy',
        connected: false,
        poolSize: {
          totalCount: 0,
          idleCount: 0,
          waitingCount: 0,
        },
        latency: 0,
        error: 'Connection pool not initialized',
      };
    }

    const startTime = Date.now();

    try {
      // Run a simple query to test connectivity
      await this.query('SELECT 1 as health_check');
      
      const latency = Date.now() - startTime;
      const totalCount = this.pool.totalCount;
      const idleCount = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;

      return {
        status: 'healthy',
        connected: true,
        poolSize: {
          totalCount,
          idleCount,
          waitingCount,
        },
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        status: 'unhealthy',
        connected: false,
        poolSize: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount,
        },
        latency,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get connection configuration
   */
  getConfig(): DatabaseConfig | null {
    return this.config;
  }

  /**
   * Close all connections in pool
   */
  async close(): Promise<void> {
    if (!this.pool) {
      console.log('Connection pool not initialized, nothing to close');
      return;
    }

    try {
      console.log('Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
      this.state = ConnectionState.DISCONNECTED;
      console.log('Database connection pool closed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error closing connection pool:', errorMessage);
      throw error;
    }
  }

  /**
   * Gracefully close all connections with timeout
   */
  async closeWithTimeout(timeoutMs: number = 10000): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection pool close timeout')), timeoutMs);
    });

    try {
      await Promise.race([this.close(), timeoutPromise]);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of database connection
 */
let databaseConnection: DatabaseConnection | null = null;

/**
 * Get or create database connection singleton
 */
export function getDatabaseConnection(retryConfig?: Partial<RetryConfig>): DatabaseConnection {
  if (!databaseConnection) {
    databaseConnection = new DatabaseConnection(retryConfig);
  }
  return databaseConnection;
}

/**
 * Initialize database connection singleton
 */
export async function initializeDatabase(
  databaseUrl?: string,
  minConnections?: number,
  maxConnections?: number,
  timeout?: number,
  retryConfig?: Partial<RetryConfig>
): Promise<DatabaseConnection> {
  const connection = getDatabaseConnection(retryConfig);
  await connection.initialize(databaseUrl, minConnections, maxConnections, timeout);
  return connection;
}

/**
 * Close database connection singleton
 */
export async function closeDatabase(): Promise<void> {
  if (databaseConnection) {
    await databaseConnection.close();
    databaseConnection = null;
  }
}
