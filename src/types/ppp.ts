export type Region = 
  | 'North America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Latin America'
  | 'Middle East & Africa';

export type IncomeGroup = 
  | 'High income'
  | 'Upper middle'
  | 'Lower middle'
  | 'Low income';

export interface CountryPPP {
  code: string; // ISO 2 (e.g. US, IN, BR)
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  currencyName: string;
  // Local currency units per 1 USD at nominal market exchange rate
  nominalRatePerUSD: number;
  // Local currency units per 1 International Dollar (PPP factor from World Bank / IMF)
  pppFactorPerUSD: number;
  // Price Level Index relative to US (PLI = pppFactorPerUSD / nominalRatePerUSD)
  // E.g., if US = 1.0, India is ~0.285 (meaning price level is 28.5% of US)
  priceLevelIndex: number;
  // Economic metrics for contextual insights
  gdpPerCapitaPPP: number;
  medianMonthlyIncomeUSD: number;
  region: Region;
  incomeGroup: IncomeGroup;
  bigMacPriceUSD?: number; // Big mac index price in USD for relatable comparison
}

export type PricingStrategy = 
  | 'standard-saas'    // Two-way parity with balanced high-PPP premium
  | 'pure-economic'    // 100% proportional to Price Level Index (full float)
  | 'steam-aggressive' // Deep discounts up to 85% for maximum volume
  | 'conservative'     // Capped at 35% discount with premium protection
  | 'discount-only'    // Asymmetric: discounts emerging markets, caps high-PPP at 100%
  | 'custom';

export type RoundingRule = 
  | 'charm-99'    // e.g., $9.99, ₹299, ¥1,490
  | 'round-00'    // e.g., $10.00, ₹300, ¥1,500
  | 'exact';      // e.g., $9.42

export interface StrategyConfig {
  id: PricingStrategy;
  name: string;
  description: string;
  maxDiscount: number; // e.g., 0.75 (75%)
  minDiscount: number; // e.g., 0.15 (15%)
  allowSurcharge: boolean; // allow charging > 1.0 in higher PLI countries (Switzerland, Norway)
  maxSurcharge: number; // e.g., 0.20 (20%)
  rounding: RoundingRule;
}

export interface SimulationParams {
  elasticity: number; // Price elasticity of demand (typically 1.5 - 2.5 for digital goods)
  baselineVisitorsOrSales: number; // Default base units sold at full price
}

export interface CountryPricingCalculation {
  country: CountryPPP;
  
  // Baseline price in chosen base currency (e.g. $10 USD)
  baseAmount: number;
  baseCurrency: string;
  
  // Market exchange rate equivalent in local currency without PPP
  nominalLocalPrice: number;
  nominalPriceInBaseCurrency: number;
  
  // Pure economic PPP price in local currency
  rawPPPLocalPrice: number;
  rawPPPPriceInBaseCurrency: number;
  
  // Final calculated/strategy price in local currency
  finalLocalPrice: number;
  finalPriceInBaseCurrency: number;
  formattedLocalPrice: string;
  
  // Effective discount / adjustment vs full baseline price
  effectiveDiscountPct: number; // Positive = discount (e.g. 60%), negative = surcharge
  perUnitRatio: number; // P_ppp / P_base (e.g. 0.40)
  
  // Profit & Loss Ratio modeling
  estimatedVolumeMultiplier: number; // Demand expansion from lower price (e.g. 3.2x)
  breakEvenVolumeMultiplier: number; // 1 / perUnitRatio (e.g. 2.5x needed to break even)
  estimatedProfitLossRatio: number; // (finalPriceInBase / baseAmount) * volumeMultiplier
  estimatedNetProfitGainPct: number; // (estimatedProfitLossRatio - 1) * 100 (e.g. +28%)
  
  // Affordability metrics
  workHoursToAfford: number; // Hours of median labor required to purchase
}

export interface GlobalSummary {
  totalCountries: number;
  averageDiscountPct: number;
  blendedProfitLossRatio: number;
  countriesWithProfitGain: number;
  countriesWithLoss: number;
  countriesWithSurcharge: number;
  countriesWithDiscount: number;
  maxProfitableCountry: CountryPricingCalculation | null;
  highestDiscountCountry: CountryPricingCalculation | null;
  highestSurchargeCountry: CountryPricingCalculation | null;
}
