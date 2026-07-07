export const STARTUP_FAILSAFE_MS = 6000;
export const NETWORK_TIMEOUT_MS = 5000;

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  work: PromiseLike<T>,
  ms = NETWORK_TIMEOUT_MS,
  label = 'operation',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });

  return Promise.race([Promise.resolve(work), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function reloadApp(): void {
  try {
    window.location.reload();
  } catch {
    window.location.href = window.location.href;
  }
}
