function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`Expected ${label} to be a non-negative finite number.`);
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`Expected ${label} to be a positive integer.`);
  }
}

/**
 * Delays execution for a number of milliseconds.
 *
 * @param ms - Delay duration in milliseconds.
 * @returns Promise resolved after the delay.
 */
export function sleep(ms: number): Promise<void> {
  assertNonNegativeFinite(ms, "ms");
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enforces a timeout for an async operation.
 *
 * @param operation - Promise-like operation to guard.
 * @param ms - Timeout in milliseconds.
 * @param message - Optional custom timeout message.
 * @returns Promise resolved/rejected with operation result or timeout error.
 */
export async function timeout<T>(operation: PromiseLike<T>, ms: number, message?: string): Promise<T> {
  assertNonNegativeFinite(ms, "ms");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutError = new Error(message ?? `Operation timed out after ${ms}ms.`);

  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError), ms);
  });

  try {
    return await Promise.race([Promise.resolve(operation), guard]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export type RetryOptions = {
  retries?: number;
  delayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown, failedAttempts: number) => boolean;
};

/**
 * Retries an operation with optional delay and backoff strategy.
 *
 * @param operation - Function that may fail and should be retried.
 * @param options - Retry behavior configuration.
 * @returns Successful operation result.
 * @throws Error from final failed attempt.
 */
export async function retry<T>(operation: () => Promise<T> | T, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 0;
  const backoffFactor = options.backoffFactor ?? 1;
  const shouldRetry = options.shouldRetry ?? (() => true);

  if (!Number.isInteger(retries) || retries < 0) {
    throw new TypeError("Expected retries to be a non-negative integer.");
  }
  assertNonNegativeFinite(delayMs, "delayMs");
  if (!Number.isFinite(backoffFactor) || backoffFactor < 1) {
    throw new TypeError("Expected backoffFactor to be a finite number greater than or equal to 1.");
  }

  let attempt = 0;
  let currentDelay = delayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const canRetry = attempt <= retries && shouldRetry(error, attempt);
      if (!canRetry) {
        throw error;
      }
      if (currentDelay > 0) {
        await sleep(currentDelay);
        currentDelay *= backoffFactor;
      }
    }
  }
}

export type PMapOptions = {
  concurrency?: number;
};

/**
 * Maps values asynchronously with limited concurrency.
 *
 * @param values - Input collection.
 * @param mapper - Async or sync mapper.
 * @param options - Concurrency options.
 * @returns Results preserving original input order.
 */
export async function pMap<T, R>(
  values: readonly T[],
  mapper: (value: T, index: number) => Promise<R> | R,
  options: PMapOptions = {}
): Promise<R[]> {
  const concurrency = options.concurrency ?? Infinity;

  if (concurrency !== Infinity) {
    assertPositiveInteger(concurrency, "concurrency");
  }
  if (values.length === 0) {
    return [];
  }

  const limit = concurrency === Infinity ? values.length : Math.min(concurrency, values.length);
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;

      if (current >= values.length) {
        return;
      }

      results[current] = await mapper(values[current], current);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

export type DebouncePromiseOptions = {
  waitMs: number;
};

/**
 * Debounces async calls and only resolves the latest invocation.
 *
 * @param fn - Async function to debounce.
 * @param options - Debounce options.
 * @returns Debounced async function.
 */
export function debouncePromise<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult> | TResult,
  options: DebouncePromiseOptions
): (...args: TArgs) => Promise<TResult> {
  const waitMs = options.waitMs;
  assertNonNegativeFinite(waitMs, "waitMs");

  let timer: ReturnType<typeof setTimeout> | undefined;
  let latestCall = 0;
  let previousReject: ((reason?: unknown) => void) | undefined;

  return (...args: TArgs) =>
    new Promise<TResult>((resolve, reject) => {
      latestCall += 1;
      const callId = latestCall;
      if (previousReject) {
        previousReject(new Error("Debounced by a newer call."));
      }
      previousReject = reject;

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(async () => {
        try {
          const result = await fn(...args);
          if (callId === latestCall) {
            previousReject = undefined;
            resolve(result);
          }
        } catch (error) {
          if (callId === latestCall) {
            previousReject = undefined;
            reject(error);
          }
        }
      }, waitMs);
    });
}

export type ThrottlePromiseOptions = {
  waitMs: number;
};

/**
 * Throttles async calls and runs at most once per window.
 *
 * @param fn - Async function to throttle.
 * @param options - Throttle options.
 * @returns Throttled async function.
 */
export function throttlePromise<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult> | TResult,
  options: ThrottlePromiseOptions
): (...args: TArgs) => Promise<TResult | undefined> {
  const waitMs = options.waitMs;
  assertNonNegativeFinite(waitMs, "waitMs");

  let lastExecution = 0;
  let inFlight: Promise<TResult> | null = null;

  return async (...args: TArgs) => {
    const now = Date.now();
    if (now - lastExecution < waitMs) {
      return undefined;
    }

    lastExecution = now;
    inFlight = Promise.resolve(fn(...args));
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}
