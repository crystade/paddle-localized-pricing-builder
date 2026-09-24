import { COUNTRIES_PPP } from '../data/pppData';
import type { CountryPricingCalculation } from '../types/ppp';
import {
  type MoneyAmount,
  type OverrideDiff,
  type ProposedPriceUpdate,
  type UnitPriceOverridePayload,
  isPaddleCurrency,
  moneyEquals,
  toMinorUnits,
} from './paddleTypes';

export function getManagedCountryCodes(): Set<string> {
  return new Set(
    COUNTRIES_PPP.filter((country) => isPaddleCurrency(country.currency)).map((country) => country.code),
  );
}

export function buildProposedPriceUpdate(
  calculations: CountryPricingCalculation[],
  baseAmount: number,
  baseCurrency: string,
): ProposedPriceUpdate {
  if (!isPaddleCurrency(baseCurrency)) {
    return {
      unitPrice: { amount: '0', currencyCode: 'USD' },
      unitPriceOverrides: [],
      skipped: calculations.map((calc) => ({
        code: calc.country.code,
        name: calc.country.name,
        currency: calc.country.currency,
        reason: `${baseCurrency} is not a Paddle billing currency`,
      })),
      canApply: false,
      applyDisabledReason: `${baseCurrency} is not a Paddle billing currency. Choose a supported base currency to apply.`,
    };
  }

  const unitPrice: MoneyAmount = {
    amount: toMinorUnits(baseAmount, baseCurrency),
    currencyCode: baseCurrency,
  };

  const skipped: ProposedPriceUpdate['skipped'] = [];
  const groups = new Map<string, UnitPriceOverridePayload>();

  for (const calc of calculations) {
    if (!isPaddleCurrency(calc.country.currency)) {
      skipped.push({
        code: calc.country.code,
        name: calc.country.name,
        currency: calc.country.currency,
        reason: `${calc.country.currency} is not billed by Paddle`,
      });
      continue;
    }

    const amount = toMinorUnits(calc.finalLocalPrice, calc.country.currency);
    if (moneyEquals({ amount, currencyCode: calc.country.currency }, unitPrice)) {
      continue;
    }

    const key = `${amount}:${calc.country.currency}`;
    const existing = groups.get(key);
    if (existing) {
      existing.countryCodes.push(calc.country.code);
    } else {
      groups.set(key, {
        countryCodes: [calc.country.code],
        unitPrice: {
          amount,
          currencyCode: calc.country.currency,
        },
      });
    }
  }

  const unitPriceOverrides = Array.from(groups.values()).map((override) => ({
    ...override,
    countryCodes: [...override.countryCodes].sort(),
  }));

  unitPriceOverrides.sort((a, b) => {
    const currencyCompare = a.unitPrice.currencyCode.localeCompare(b.unitPrice.currencyCode);
    if (currencyCompare !== 0) return currencyCompare;
    return a.unitPrice.amount.localeCompare(b.unitPrice.amount);
  });

  return {
    unitPrice,
    unitPriceOverrides,
    skipped,
    canApply: true,
    applyDisabledReason: null,
  };
}

export function mergeOverrides(
  existing: UnitPriceOverridePayload[],
  proposed: UnitPriceOverridePayload[],
  managedCountryCodes: Set<string>,
): UnitPriceOverridePayload[] {
  const preserved: UnitPriceOverridePayload[] = [];

  for (const override of existing) {
    const remaining = override.countryCodes.filter((code) => !managedCountryCodes.has(code));
    if (remaining.length > 0) {
      preserved.push({
        countryCodes: [...remaining].sort(),
        unitPrice: override.unitPrice,
      });
    }
  }

  return [...preserved, ...proposed];
}

function countriesKey(override: UnitPriceOverridePayload): string {
  return [...override.countryCodes].sort().join(',');
}

export function buildOverrideDiff(
  current: { unitPrice: MoneyAmount; unitPriceOverrides: UnitPriceOverridePayload[] } | null,
  proposed: ProposedPriceUpdate,
): OverrideDiff {
  const managedCountryCodes = getManagedCountryCodes();
  const currentOverrides = current?.unitPriceOverrides ?? [];
  const mergedOverrides = mergeOverrides(currentOverrides, proposed.unitPriceOverrides, managedCountryCodes);
  const kept = mergeOverrides(currentOverrides, [], managedCountryCodes);

  const currentByCountries = new Map(currentOverrides.map((override) => [countriesKey(override), override]));
  const added: UnitPriceOverridePayload[] = [];
  const updated: OverrideDiff['updated'] = [];

  for (const next of proposed.unitPriceOverrides) {
    const previous = currentByCountries.get(countriesKey(next));
    if (!previous) {
      added.push(next);
    } else if (!moneyEquals(previous.unitPrice, next.unitPrice)) {
      updated.push({ previous, next });
    }
  }

  return {
    basePriceChanged: current ? !moneyEquals(current.unitPrice, proposed.unitPrice) : true,
    currentUnitPrice: current?.unitPrice ?? null,
    proposedUnitPrice: proposed.unitPrice,
    added,
    updated,
    kept,
    skipped: proposed.skipped,
    mergedOverrides,
  };
}

export function patchBodyFromProposal(proposed: ProposedPriceUpdate, mergedOverrides: UnitPriceOverridePayload[]) {
  return {
    unitPrice: proposed.unitPrice,
    unitPriceOverrides: mergedOverrides,
  };
}
