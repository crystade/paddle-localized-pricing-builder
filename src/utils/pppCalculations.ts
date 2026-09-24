import { 
  CountryPPP, 
  CountryPricingCalculation, 
  GlobalSummary, 
  RoundingRule, 
  SimulationParams, 
  StrategyConfig 
} from '../types/ppp';
import { COUNTRIES_PPP } from '../data/pppData';

/**
 * Format psychological prices depending on currency denomination
 */
export function formatPsychologicalPrice(
  rawPrice: number, 
  currency: string, 
  rule: RoundingRule
): { price: number; formatted: string } {
  if (rule === 'exact') {
    const isZeroDecimal = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'HUF', 'UGX'].includes(currency);
    const rounded = isZeroDecimal ? Math.round(rawPrice) : Math.round(rawPrice * 100) / 100;
    return {
      price: rounded,
      formatted: rounded.toLocaleString(undefined, {
        minimumFractionDigits: isZeroDecimal ? 0 : 2,
        maximumFractionDigits: isZeroDecimal ? 0 : 2,
      }),
    };
  }

  // Currencies without decimals (or high nominal value)
  const highValueCurrencies: Record<string, number> = {
    VND: 1000,
    IDR: 1000,
    KRW: 100,
    JPY: 10,
    CLP: 100,
    HUF: 10,
    COP: 1000,
    ARS: 50,
  };

  if (highValueCurrencies[currency]) {
    const step = highValueCurrencies[currency];
    if (rule === 'charm-99') {
      // e.g. 199,000 or 1,490 or 2,900
      if (rawPrice >= 10000) {
        // Round to nearest 10,000 minus 1,000 or round to 9,000
        const thousands = Math.round(rawPrice / 1000);
        let charm = Math.max(1, Math.round(thousands / 10) * 10 - 1) * 1000;
        if (charm < rawPrice * 0.7) charm = Math.round(rawPrice / 1000) * 1000;
        return {
          price: charm,
          formatted: charm.toLocaleString(),
        };
      } else if (rawPrice >= 1000) {
        const charm = Math.max(step, Math.round(rawPrice / 100) * 100 - 10);
        return {
          price: charm,
          formatted: charm.toLocaleString(),
        };
      } else {
        const rounded = Math.round(rawPrice / 10) * 10;
        return {
          price: rounded,
          formatted: rounded.toLocaleString(),
        };
      }
    } else {
      // round-00
      const rounded = Math.round(rawPrice / step) * step;
      return {
        price: rounded,
        formatted: rounded.toLocaleString(),
      };
    }
  }

  // Standard currencies with 2 decimals (USD, EUR, GBP, INR, BRL, etc.)
  if (rule === 'charm-99') {
    if (rawPrice < 2) {
      const p = Math.max(0.49, Math.round(rawPrice * 10) / 10 - 0.01);
      return { price: p, formatted: p.toFixed(2) };
    }
    const intPart = Math.floor(rawPrice);
    const charm = intPart + 0.99;
    return {
      price: charm,
      formatted: charm.toFixed(2),
    };
  } else {
    // round-00
    const rounded = Math.round(rawPrice);
    return {
      price: rounded,
      formatted: rounded.toFixed(2),
    };
  }
}

/**
 * Calculates PPP pricing and estimated profit/loss ratios for a specific country
 */
export function calculateCountryPricing(
  country: CountryPPP,
  baseAmount: number,
  baseCurrencyCode: string,
  strategyConfig: StrategyConfig,
  simParams: SimulationParams,
  countries: readonly CountryPPP[] = COUNTRIES_PPP,
): CountryPricingCalculation {
  const baseCountry = countries.find(c => c.currency === baseCurrencyCode) ||
                      countries.find(c => c.code === 'US') ||
                      countries[0];

  // Baseline exchange rate relative to USD
  const baseRateToUSD = baseCountry.nominalRatePerUSD;
  const basePLI = baseCountry.priceLevelIndex;

  // Target country nominal rate relative to base currency
  // 1 BaseCurrency = (country.nominalRatePerUSD / baseRateToUSD) TargetCurrency
  const nominalRateRelToBase = country.nominalRatePerUSD / baseRateToUSD;

  // Price Level Index relative to base currency
  // < 1 means target country has lower purchasing power than base country
  const relPLI = country.priceLevelIndex / basePLI;

  // Nominal market price in target currency
  const nominalLocalPrice = baseAmount * nominalRateRelToBase;
  const nominalPriceInBaseCurrency = baseAmount; // Baseline nominal is 100%

  // Raw theoretical PPP price
  const rawPPPLocalPrice = nominalLocalPrice * relPLI;
  const rawPPPPriceInBaseCurrency = baseAmount * relPLI;

  // Determine final pricing multiplier according to Strategy
  let adjustmentMultiplier = 1.0;

  if (relPLI < 1.0) {
    // Discount zone (emerging markets, lower price levels)
    const rawDiscount = 1 - relPLI;
    if (strategyConfig.id === 'pure-economic') {
      adjustmentMultiplier = relPLI;
    } else {
      if (rawDiscount < strategyConfig.minDiscount) {
        // Below threshold: keep full price unless standard threshold is met
        adjustmentMultiplier = 1.0;
      } else {
        const clampedDiscount = Math.min(rawDiscount, strategyConfig.maxDiscount);
        adjustmentMultiplier = 1.0 - clampedDiscount;
      }
    }
  } else if (relPLI > 1.0) {
    // Surcharge / High-PPP Premium zone (e.g. Switzerland, Norway, or high-income markets relative to base)
    if (strategyConfig.id === 'pure-economic') {
      // Pure economic parity directly follows the relative price level index
      adjustmentMultiplier = relPLI;
    } else if (strategyConfig.allowSurcharge) {
      const rawSurcharge = relPLI - 1.0;
      const clampedSurcharge = Math.min(rawSurcharge, strategyConfig.maxSurcharge);
      adjustmentMultiplier = 1.0 + clampedSurcharge;
    } else {
      adjustmentMultiplier = 1.0;
    }
  }

  // Calculate unrounded target local price
  const unroundedLocalPrice = nominalLocalPrice * adjustmentMultiplier;

  // Apply psychological rounding rule
  const { price: finalLocalPrice, formatted: formattedLocalPrice } = formatPsychologicalPrice(
    unroundedLocalPrice,
    country.currency,
    strategyConfig.rounding
  );

  // Convert back to base currency to calculate effective discount and ratios
  const finalPriceInBaseCurrency = finalLocalPrice / nominalRateRelToBase;
  const perUnitRatio = finalPriceInBaseCurrency / baseAmount;
  const effectiveDiscountPct = ((baseAmount - finalPriceInBaseCurrency) / baseAmount) * 100;

  // --- Profit & Loss Ratio Modeling ---
  // Marginal cost of digital goods is negligible (~0%).
  // Price elasticity of demand (epsilon): Q_ppp / Q_base = (P_ppp / P_base) ^ (-epsilon)
  // When price is discounted, sales volume expands.
  const elasticity = simParams.elasticity;
  let estimatedVolumeMultiplier: number;

  if (perUnitRatio < 1.0) {
    // Standard demand elasticity power curve with realistic empirical bounds
    // A 70% discount (ratio 0.30) with elasticity 1.8 gives ~3.0x to 4.5x conversion lift
    const theoreticalMultiplier = Math.pow(1 / Math.max(perUnitRatio, 0.15), elasticity * 0.7);
    // Smooth dampening to keep realistic SaaS conversion lifts (max 6.5x)
    estimatedVolumeMultiplier = Math.min(Math.max(theoreticalMultiplier, 1.05), 6.5);
  } else if (perUnitRatio > 1.0) {
    // High-PPP markets have lower price sensitivity for digital goods (inelastic demand: epsilon ~0.35-0.5)
    // A +28% premium (1.28x price) only causes a minor ~5-12% volume reduction, capturing consumer surplus!
    const effectiveSurchargeElasticity = Math.min(elasticity * 0.35, 0.65);
    estimatedVolumeMultiplier = Math.max(0.80, Math.pow(1 / perUnitRatio, effectiveSurchargeElasticity));
  } else {
    estimatedVolumeMultiplier = 1.0;
  }

  // Break-even volume uplift required: 1 / perUnitRatio
  // e.g. at 50% discount (perUnitRatio 0.5), you need 2.0x volume to make same total profit
  const breakEvenVolumeMultiplier = perUnitRatio > 0 ? 1 / perUnitRatio : 999;

  // Estimated Total Profit/Loss Ratio compared to baseline:
  // Ratio = (P_ppp / P_base) * (Q_ppp / Q_base)
  // Ratio > 1.0 means net profit gain! Ratio < 1.0 means net loss/concession.
  const estimatedProfitLossRatio = perUnitRatio * estimatedVolumeMultiplier;
  const estimatedNetProfitGainPct = (estimatedProfitLossRatio - 1) * 100;

  // Affordability metrics: hours of median labor
  // Median hourly wage in USD = monthly / 160 hours
  const hourlyWageUSD = country.medianMonthlyIncomeUSD / 160;
  const finalPriceInUSD = (finalPriceInBaseCurrency / baseRateToUSD);
  const workHoursToAfford = hourlyWageUSD > 0 ? finalPriceInUSD / hourlyWageUSD : 0;

  return {
    country,
    baseAmount,
    baseCurrency: baseCurrencyCode,
    nominalLocalPrice,
    nominalPriceInBaseCurrency,
    rawPPPLocalPrice,
    rawPPPPriceInBaseCurrency,
    finalLocalPrice,
    finalPriceInBaseCurrency,
    formattedLocalPrice,
    effectiveDiscountPct,
    perUnitRatio,
    estimatedVolumeMultiplier,
    breakEvenVolumeMultiplier,
    estimatedProfitLossRatio,
    estimatedNetProfitGainPct,
    workHoursToAfford,
  };
}

/**
 * Calculates global statistics and summary across all countries
 */
export function calculateGlobalSummary(calculations: CountryPricingCalculation[]): GlobalSummary {
  if (calculations.length === 0) {
    return {
      totalCountries: 0,
      averageDiscountPct: 0,
      blendedProfitLossRatio: 1.0,
      countriesWithProfitGain: 0,
      countriesWithLoss: 0,
      countriesWithSurcharge: 0,
      countriesWithDiscount: 0,
      maxProfitableCountry: null,
      highestDiscountCountry: null,
      highestSurchargeCountry: null,
    };
  }

  let totalDiscount = 0;
  let totalProfitRatio = 0;
  let profitGains = 0;
  let losses = 0;
  let surcharges = 0;
  let discounts = 0;

  let maxProfitable: CountryPricingCalculation = calculations[0];
  let highestDiscount: CountryPricingCalculation = calculations[0];
  let highestSurcharge: CountryPricingCalculation = calculations[0];

  calculations.forEach(calc => {
    if (calc.effectiveDiscountPct > 0.5) {
      totalDiscount += calc.effectiveDiscountPct;
      discounts++;
      if (calc.effectiveDiscountPct > highestDiscount.effectiveDiscountPct) {
        highestDiscount = calc;
      }
    } else if (calc.effectiveDiscountPct < -0.5) {
      surcharges++;
      if (calc.effectiveDiscountPct < highestSurcharge.effectiveDiscountPct) {
        highestSurcharge = calc;
      }
    }

    totalProfitRatio += calc.estimatedProfitLossRatio;

    if (calc.estimatedProfitLossRatio > 1.02) {
      profitGains++;
    } else if (calc.estimatedProfitLossRatio < 0.98) {
      losses++;
    }

    if (calc.estimatedProfitLossRatio > maxProfitable.estimatedProfitLossRatio) {
      maxProfitable = calc;
    }
  });

  return {
    totalCountries: calculations.length,
    averageDiscountPct: discounts > 0 ? totalDiscount / discounts : 0,
    blendedProfitLossRatio: totalProfitRatio / calculations.length,
    countriesWithProfitGain: profitGains,
    countriesWithLoss: losses,
    countriesWithSurcharge: surcharges,
    countriesWithDiscount: discounts,
    maxProfitableCountry: maxProfitable,
    highestDiscountCountry: discounts > 0 ? highestDiscount : null,
    highestSurchargeCountry: surcharges > 0 ? highestSurcharge : null,
  };
}
