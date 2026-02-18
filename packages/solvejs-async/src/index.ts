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

export type TaskQueueOptions = {
  concurrency?: number;
};

export type TaskQueue = {
  add: <T>(task: () => Promise<T> | T) => Promise<T>;
  pending: () => number;
  running: () => number;
};

/**
 * Creates a lightweight async task queue with bounded concurrency.
 *
 * @param options - Queue options.
 * @param options.concurrency - Maximum number of tasks running in parallel.
 * @returns Queue controller with `add`, `pending`, and `running`.
 */
export function createTaskQueue(options: TaskQueueOptions = {}): TaskQueue {
  const concurrency = options.concurrency ?? 1;
  assertPositiveInteger(concurrency, "concurrency");

  const queue: Array<() => void> = [];
  let activeCount = 0;

  const schedule = () => {
    while (activeCount < concurrency && queue.length > 0) {
      const run = queue.shift();
      if (!run) return;
      activeCount += 1;
      run();
    }
  };

  const add = <T>(task: () => Promise<T> | T): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            activeCount -= 1;
            schedule();
          });
      });
      schedule();
    });

  return {
    add,
    pending: () => queue.length,
    running: () => activeCount
  };
}

export type RateLimiterOptions = {
  maxCalls: number;
  windowMs: number;
};

/**
 * Creates a fixed-window async rate limiter wrapper.
 *
 * @param options - Rate limiter options.
 * @param options.maxCalls - Maximum executions allowed within the window.
 * @param options.windowMs - Window duration in milliseconds.
 * @returns Function that schedules work respecting the configured rate.
 */
export function createRateLimiter(options: RateLimiterOptions): <T>(task: () => Promise<T> | T) => Promise<T> {
  const { maxCalls, windowMs } = options;
  assertPositiveInteger(maxCalls, "maxCalls");
  assertNonNegativeFinite(windowMs, "windowMs");

  let chain = Promise.resolve();
  const executionTimestamps: number[] = [];

  return async <T>(task: () => Promise<T> | T): Promise<T> => {
    const run = async () => {
      const now = Date.now();
      while (executionTimestamps.length > 0 && now - executionTimestamps[0] >= windowMs) {
        executionTimestamps.shift();
      }

      if (executionTimestamps.length >= maxCalls) {
        const earliest = executionTimestamps[0];
        const waitMs = Math.max(0, windowMs - (now - earliest));
        if (waitMs > 0) {
          await sleep(waitMs);
        }
      }

      executionTimestamps.push(Date.now());
      return task();
    };

    const resultPromise = chain.then(run, run);
    chain = resultPromise.then(
      () => undefined,
      () => undefined
    );
    return resultPromise;
  };
}

export type TokenBucketLimiterOptions = {
  capacity: number;
  refillTokens: number;
  refillIntervalMs: number;
  initialTokens?: number;
};

/**
 * Creates a token-bucket limiter for bursty traffic with smooth refill.
 *
 * @param options - Token bucket options.
 * @param options.capacity - Maximum bucket size.
 * @param options.refillTokens - Tokens added each refill interval.
 * @param options.refillIntervalMs - Refill interval in milliseconds.
 * @param options.initialTokens - Initial token count. Defaults to `capacity`.
 * @returns Function that schedules work when enough tokens are available.
 */
export function createTokenBucketLimiter(
  options: TokenBucketLimiterOptions
): <T>(task: () => Promise<T> | T, tokenCost?: number) => Promise<T> {
  const { capacity, refillTokens, refillIntervalMs } = options;
  const initialTokens = options.initialTokens ?? capacity;

  assertPositiveInteger(capacity, "capacity");
  assertPositiveInteger(refillTokens, "refillTokens");
  assertPositiveInteger(refillIntervalMs, "refillIntervalMs");
  assertNonNegativeFinite(initialTokens, "initialTokens");

  if (initialTokens > capacity) {
    throw new TypeError("Expected initialTokens to be less than or equal to capacity.");
  }

  type PendingTask<T> = {
    tokenCost: number;
    task: () => Promise<T> | T;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };

  const queue: Array<PendingTask<unknown>> = [];
  let availableTokens = initialTokens;
  let lastRefillAt = Date.now();
  let drainTimer: ReturnType<typeof setTimeout> | undefined;

  const refill = () => {
    const now = Date.now();
    const elapsed = now - lastRefillAt;
    if (elapsed < refillIntervalMs) {
      return;
    }

    const intervals = Math.floor(elapsed / refillIntervalMs);
    availableTokens = Math.min(capacity, availableTokens + intervals * refillTokens);
    lastRefillAt += intervals * refillIntervalMs;
  };

  const scheduleDrain = () => {
    if (queue.length === 0 || drainTimer) {
      return;
    }

    const next = queue[0];
    const missingTokens = Math.max(0, next.tokenCost - availableTokens);
    if (missingTokens === 0) {
      return;
    }

    const intervalsNeeded = Math.ceil(missingTokens / refillTokens);
    const nextReadyAt = lastRefillAt + intervalsNeeded * refillIntervalMs;
    const waitMs = Math.max(1, nextReadyAt - Date.now());
    drainTimer = setTimeout(() => {
      drainTimer = undefined;
      runQueue();
    }, waitMs);
  };

  const runQueue = () => {
    refill();

    while (queue.length > 0) {
      const next = queue[0];
      if (next.tokenCost > availableTokens) {
        break;
      }

      queue.shift();
      availableTokens -= next.tokenCost;

      Promise.resolve()
        .then(next.task)
        .then(next.resolve, next.reject)
        .finally(() => {
          runQueue();
        });
    }

    scheduleDrain();
  };

  return <T>(task: () => Promise<T> | T, tokenCost = 1): Promise<T> => {
    assertPositiveInteger(tokenCost, "tokenCost");
    if (tokenCost > capacity) {
      throw new TypeError("Expected tokenCost to be less than or equal to capacity.");
    }

    return new Promise<T>((resolve, reject) => {
      queue.push({
        tokenCost,
        task,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      runQueue();
    });
  };
}
