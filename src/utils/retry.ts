import { logger } from './logger';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();

      if (attempt > 1) {
        logger.info(`${operationName} succeeded on attempt ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      logger.warn(
        `${operationName} attempt ${attempt}/${opts.maxAttempts} failed:`,
        lastError.message
      );

      // Don't retry on certain errors
      if (isNonRetryableError(lastError)) {
        logger.error(`${operationName} failed with non-retryable error:`, lastError);
        throw lastError;
      }

      // Last attempt, throw error
      if (attempt === opts.maxAttempts) {
        logger.error(`${operationName} failed after ${opts.maxAttempts} attempts:`, lastError);
        throw lastError;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt - 1, opts);
      logger.debug(`Retrying ${operationName} in ${delay}ms...`);

      await sleep(delay);
    }
  }

  // This should never be reached
  throw lastError!;
}

/**
 * Execute function with timeout and retry
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string,
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  return withRetry(
    () => withTimeout(operation, timeoutMs, operationName),
    operationName,
    retryOptions
  );
}

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  let delay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // Apply jitter to prevent thundering herd
  if (options.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.min(delay, options.maxDelayMs);
}

function isNonRetryableError(error: Error): boolean {
  const nonRetryablePatterns = [
    'invalid private key',
    'invalid address',
    'insufficient funds',
    'nonce too low',
    'nonce too high',
    'gas required exceeds allowance',
    'execution reverted',
  ];

  const message = error.message.toLowerCase();
  return nonRetryablePatterns.some(pattern =>
    message.includes(pattern.toLowerCase())
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeoutMs: number = 60000, // 1 minute
    private readonly name: string = 'CircuitBreaker'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info(`${this.name} circuit breaker entering HALF_OPEN state`);
      } else {
        throw new Error(`${this.name} circuit breaker is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`${this.name} circuit breaker returning to CLOSED state`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(
        `${this.name} circuit breaker opened after ${this.failureCount} failures`
      );
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}