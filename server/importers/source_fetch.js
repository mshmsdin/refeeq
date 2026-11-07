export async function fetchText(url, { fetchImpl = fetch, timeoutMs = 30_000 } = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json,text/html,text/plain;q=0.9,*/*;q=0.8',
        'User-Agent': 'Rafeeq-Bible-Importer/1.0 (https://wiki.din.hk/bible/)'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (response.ok) return response.text();
    if (response.status !== 429 || attempt === 3) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter, 20)
      : 3 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
  }
  throw new Error(`تعذر جلب المصدر ${url}`);
}
