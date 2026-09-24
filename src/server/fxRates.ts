import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { missingFxCurrencies, parseFxRates, requiredFxCurrencies } from '../lib/fxRates';

const CACHE_PATH = path.join(process.cwd(), 'data', 'fx-rates.json');
const LATEST_URL = 'https://api.currencyapi.com/v3/latest';

let refreshInFlight: Promise<string> | null = null;

function isErrno(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export async function readFxCache(): Promise<string | null> {
  try {
    return await readFile(CACHE_PATH, 'utf8');
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return null;
    throw error;
  }
}

function assertUsableSnapshot(raw: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Exchange rates are not valid JSON.');
  }

  const snapshot = parseFxRates(parsed);
  const missing = missingFxCurrencies(snapshot);
  if (missing.length > 0) {
    throw new Error(`Exchange rates are missing ${missing.join(', ')}.`);
  }
}

async function writeFxCache(raw: string): Promise<void> {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  const tempPath = `${CACHE_PATH}.${process.pid}.tmp`;
  await writeFile(tempPath, raw, 'utf8');
  try {
    await rm(CACHE_PATH, { force: true });
    await rename(tempPath, CACHE_PATH);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

async function refreshFxRatesOnce(): Promise<string> {
  const apiKey = process.env.CURRENCYAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('CURRENCYAPI_API_KEY is not set.');
  }

  const url = new URL(LATEST_URL);
  url.searchParams.set('base_currency', 'USD');
  url.searchParams.set('currencies', requiredFxCurrencies().join(','));

  const response = await fetch(url, {
    headers: { apikey: apiKey },
    signal: AbortSignal.timeout(20_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    let message = `currencyapi.com returned ${response.status}.`;
    try {
      const parsed = JSON.parse(raw) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.length > 0) {
        message = parsed.message;
      }
    } catch {
      if (raw.trim().length > 0 && raw.length < 300) message = raw.trim();
    }
    throw new Error(message);
  }

  assertUsableSnapshot(raw);
  await writeFxCache(raw);
  return raw;
}

/** Calls currencyapi.com only when the user asks to fetch or re-fetch. */
export function refreshFxRates(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = refreshFxRatesOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function validateFxCache(raw: string): void {
  assertUsableSnapshot(raw);
}
