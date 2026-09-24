import toSmallestUnit, { display, fromSmallestUnit } from 'zero-decimal-currencies';

export const PADDLE_CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CLP',
  'HKD',
  'SGD',
  'SEK',
  'ARS',
  'BRL',
  'CNY',
  'COP',
  'CZK',
  'DKK',
  'HUF',
  'ILS',
  'INR',
  'KRW',
  'MXN',
  'NOK',
  'NZD',
  'PEN',
  'PLN',
  'RUB',
  'THB',
  'TRY',
  'TWD',
  'UAH',
  'VND',
  'ZAR',
] as const;

export type PaddleCurrencyCode = (typeof PADDLE_CURRENCY_CODES)[number];

export type PaddleEnvironment = 'sandbox' | 'production';

export interface MoneyAmount {
  amount: string;
  currencyCode: PaddleCurrencyCode;
}

export interface UnitPriceOverridePayload {
  countryCodes: string[];
  unitPrice: MoneyAmount;
}

export interface SkippedCountry {
  code: string;
  name: string;
  currency: string;
  reason: string;
}

export interface ProposedPriceUpdate {
  unitPrice: MoneyAmount;
  unitPriceOverrides: UnitPriceOverridePayload[];
  skipped: SkippedCountry[];
  canApply: boolean;
  applyDisabledReason: string | null;
}

export interface CatalogPriceSnapshot {
  id: string;
  productId: string;
  name: string | null;
  description: string;
  status: string;
  unitPrice: MoneyAmount;
  unitPriceOverrides: UnitPriceOverridePayload[];
}

export interface OverrideDiff {
  basePriceChanged: boolean;
  currentUnitPrice: MoneyAmount | null;
  proposedUnitPrice: MoneyAmount;
  added: UnitPriceOverridePayload[];
  updated: Array<{
    previous: UnitPriceOverridePayload;
    next: UnitPriceOverridePayload;
  }>;
  kept: UnitPriceOverridePayload[];
  skipped: SkippedCountry[];
  mergedOverrides: UnitPriceOverridePayload[];
}

const PADDLE_CURRENCY_SET = new Set<string>(PADDLE_CURRENCY_CODES);

export function isPaddleCurrency(currency: string): currency is PaddleCurrencyCode {
  return PADDLE_CURRENCY_SET.has(currency);
}

export function isPaddleEnvironment(value: string): value is PaddleEnvironment {
  return value === 'sandbox' || value === 'production';
}

/** ISO 4217 minor units. Zero-decimal (JPY, VND, …) stay whole; others scale by 10^exponent. */
export function toMinorUnits(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return '0';
  return toSmallestUnit(amount, currency);
}

export function fromMinorUnits(amount: string, currency: string): number {
  if (!Number.isFinite(Number(amount))) return 0;
  return fromSmallestUnit(amount, currency);
}

export function formatMoneyAmount(money: MoneyAmount, locale = 'en-US'): string {
  return display(money.amount, money.currencyCode, { locale });
}

/** Minor-unit amounts are whole numbers. Stay under 1 so adjacent prices stay distinct. */
const MONEY_EPSILON = 1e-6;

export function numbersClose(a: number, b: number, epsilon = MONEY_EPSILON): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon;
}

export function moneyEquals(a: MoneyAmount, b: MoneyAmount): boolean {
  return a.currencyCode === b.currencyCode && numbersClose(Number(a.amount), Number(b.amount));
}
