import { COUNTRIES_PPP } from '../data/pppData';
import type { CountryPPP } from '../types/ppp';

/** currencyapi.com `/v3/latest` payload. `value` is local units per 1 USD, unrounded. */
export interface FxQuote {
  code: string;
  value: number;
}

export interface FxRatesSnapshot {
  meta: {
    last_updated_at: string;
  };
  data: Record<string, FxQuote>;
}

export function requiredFxCurrencies(): string[] {
  return [...new Set(COUNTRIES_PPP.map((country) => country.currency))].sort();
}

export function parseFxRates(value: unknown): FxRatesSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('Exchange rate response was not an object.');
  }

  const record = value as Record<string, unknown>;
  const meta = record.meta;
  if (!meta || typeof meta !== 'object') {
    throw new Error('Exchange rate response is missing meta.');
  }

  const lastUpdatedAt = (meta as Record<string, unknown>).last_updated_at;
  if (typeof lastUpdatedAt !== 'string' || lastUpdatedAt.length === 0) {
    throw new Error('Exchange rate response is missing meta.last_updated_at.');
  }

  const data = record.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Exchange rate response is missing data.');
  }

  const quotes: Record<string, FxQuote> = {};
  for (const [key, quoteValue] of Object.entries(data)) {
    if (!quoteValue || typeof quoteValue !== 'object') {
      throw new Error(`Exchange rate quote for ${key} is invalid.`);
    }
    const quote = quoteValue as Record<string, unknown>;
    if (typeof quote.code !== 'string' || quote.code.length === 0) {
      throw new Error(`Exchange rate quote for ${key} is missing a currency code.`);
    }
    if (typeof quote.value !== 'number' || !Number.isFinite(quote.value) || quote.value <= 0) {
      throw new Error(`Exchange rate quote for ${quote.code} is not a positive number.`);
    }
    quotes[quote.code] = { code: quote.code, value: quote.value };
  }

  return {
    meta: { last_updated_at: lastUpdatedAt },
    data: quotes,
  };
}

export function missingFxCurrencies(snapshot: FxRatesSnapshot): string[] {
  return requiredFxCurrencies().filter((code) => snapshot.data[code] === undefined);
}

/**
 * Overlay currencyapi quotes onto the PPP table.
 * The quote is stored as returned. currencyapi does not round rates for
 * currencies that have minor units, and this function does not either.
 * Billed amounts are rounded later, when a price is formatted.
 */
export function applyFxRates(snapshot: FxRatesSnapshot): CountryPPP[] {
  const missing = missingFxCurrencies(snapshot);
  if (missing.length > 0) {
    throw new Error(`Exchange rates are missing ${missing.join(', ')}.`);
  }

  return COUNTRIES_PPP.map((country) => {
    const nominalRatePerUSD = snapshot.data[country.currency].value;
    return {
      ...country,
      nominalRatePerUSD,
      priceLevelIndex: country.pppFactorPerUSD / nominalRatePerUSD,
    };
  });
}

export function formatFxTimestamp(lastUpdatedAt: string): string {
  const parsed = new Date(lastUpdatedAt);
  if (Number.isNaN(parsed.getTime())) return lastUpdatedAt;
  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
