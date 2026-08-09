/** Small fetch helper with retries and concurrency limiting. */

export interface FetchRetryOptions {
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  const retries = options.retries ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 750;
  const timeoutMs = options.timeoutMs ?? 120_000;
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "text/csv,text/plain,*/*",
          "User-Agent": "terraclima-climate-data-v2/1.0",
          ...options.headers,
        },
      });
      lastStatus = res.status;
      lastBody = await res.text();
      if (res.ok) return { ok: true, status: res.status, body: lastBody };
      // Retry on 429 / 5xx
      if (res.status !== 429 && res.status < 500) {
        return { ok: false, status: res.status, body: lastBody };
      }
    } catch (err) {
      lastBody = err instanceof Error ? err.message : String(err);
      lastStatus = 0;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 200);
      await sleep(delay);
    }
  }
  return { ok: false, status: lastStatus, body: lastBody };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]!, i);
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}
