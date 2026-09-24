import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  Clock, 
  FileCode2, 
  Layers,
} from 'lucide-react';
import { CountryPricingCalculation } from '../types/ppp';
import { toMinorUnits } from '../lib/paddleTypes';

interface CountryDetailModalProps {
  calculation: CountryPricingCalculation | null;
  onClose: () => void;
  baseCurrency: string;
}

export const CountryDetailModal: React.FC<CountryDetailModalProps> = ({
  calculation,
  onClose,
  baseCurrency,
}) => {
  const [activeTab, setActiveTab] = useState<'economics' | 'code'>('economics');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!calculation) return null;

  const { country } = calculation;
  const isGain = calculation.estimatedProfitLossRatio >= 1.0;

  // Code snippets for developers
  const stripeSnippet = `// Stripe Price configuration for ${country.name} (${country.currency})
const stripePrice = await stripe.prices.create({
  currency: '${country.currency.toLowerCase()}',
  unit_amount: ${toMinorUnits(calculation.finalLocalPrice, country.currency)},
  product: 'prod_YOUR_PRODUCT_ID',
  metadata: {
    country_code: '${country.code}',
    ppp_discount_pct: '${calculation.effectiveDiscountPct.toFixed(0)}%',
    ppp_tier: '${country.incomeGroup}',
    baseline_price: '${calculation.baseAmount} ${baseCurrency}'
  }
});`;

  const jsonConfigSnippet = JSON.stringify({
    countryCode: country.code,
    countryName: country.name,
    currency: country.currency,
    currencySymbol: country.currencySymbol,
    baselinePrice: calculation.baseAmount,
    baselineCurrency: baseCurrency,
    nominalExchangePrice: calculation.nominalLocalPrice,
    pppAdjustedPrice: calculation.finalLocalPrice,
    formattedPrice: `${country.currencySymbol}${calculation.formattedLocalPrice}`,
    effectiveDiscountPercentage: Math.round(calculation.effectiveDiscountPct),
    estimatedProfitLossRatio: Number(calculation.estimatedProfitLossRatio.toFixed(2)),
    estimatedVolumeMultiplier: Number(calculation.estimatedVolumeMultiplier.toFixed(2)),
    breakEvenVolumeMultiplier: Number(calculation.breakEvenVolumeMultiplier.toFixed(2)),
  }, null, 2);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label={country.name}>
              {country.flag}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{country.name}</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {country.currency} ({country.currencySymbol})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {country.region} · {country.incomeGroup} · GDP per capita (PPP): ${country.gdpPerCapitaPPP.toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-950/20 text-xs">
          <button
            onClick={() => setActiveTab('economics')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === 'economics'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Economic & Profit Analysis
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Developer Implementation Snippet</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {activeTab === 'economics' ? (
            <>
              {/* Primary Pricing Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[11px] block">Market Nominal Price</span>
                  <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                    {country.currencySymbol}{calculation.nominalLocalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Straight Forex exchange without PPP
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  calculation.effectiveDiscountPct < -0.5 
                    ? 'bg-sky-950/20 border-sky-500/30' 
                    : 'bg-emerald-950/20 border-emerald-500/30'
                }`}>
                  <span className={`font-semibold text-[11px] block ${
                    calculation.effectiveDiscountPct < -0.5 ? 'text-sky-400' : 'text-emerald-400'
                  }`}>
                    {calculation.effectiveDiscountPct < -0.5 ? 'PPP Adjusted Offer (Premium)' : 'PPP Adjusted Offer'}
                  </span>
                  <div className={`text-xl font-bold font-mono mt-0.5 ${
                    calculation.effectiveDiscountPct < -0.5 ? 'text-sky-300' : 'text-emerald-300'
                  }`}>
                    {country.currencySymbol}{calculation.formattedLocalPrice}
                  </div>
                  <span className={`text-[10px] ${
                    calculation.effectiveDiscountPct < -0.5 ? 'text-sky-400/80' : 'text-emerald-400/80'
                  }`}>
                    ≈ {calculation.finalPriceInBaseCurrency.toFixed(2)} {baseCurrency} ({
                      calculation.effectiveDiscountPct > 0.5 
                        ? `-${calculation.effectiveDiscountPct.toFixed(0)}% discount` 
                        : calculation.effectiveDiscountPct < -0.5 
                        ? `+${Math.abs(calculation.effectiveDiscountPct).toFixed(0)}% premium` 
                        : '0% baseline parity'
                    })
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  isGain ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/20 border-amber-500/30'
                }`}>
                  <span className={`text-[11px] font-semibold block ${isGain ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Est. Profit/Loss Ratio
                  </span>
                  <div className="text-xl font-bold font-mono text-white mt-0.5 flex items-center gap-1">
                    <span className={isGain ? 'text-emerald-400' : 'text-amber-400'}>
                      {calculation.estimatedProfitLossRatio.toFixed(2)}x
                    </span>
                    {isGain ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-amber-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isGain ? '+' : ''}{calculation.estimatedNetProfitGainPct.toFixed(0)}% vs baseline
                  </span>
                </div>
              </div>

              {/* Step-by-Step Mathematical Trace */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Exact Mathematical Calculation Trace
                </h3>

                <div className="space-y-2 text-[11px] font-mono divide-y divide-slate-800/80 pt-1">
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">1. Baseline Price:</span>
                    <span className="text-white">{calculation.baseAmount.toFixed(2)} {baseCurrency}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">2. Country Price Level Index (PLI):</span>
                    <span className="text-white">
                      {country.priceLevelIndex.toFixed(3)} (Living cost is {(country.priceLevelIndex * 100).toFixed(1)}% of US)
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">3. Nominal Forex Rate:</span>
                    <span className="text-white">
                      1 USD ={' '}
                      {country.nominalRatePerUSD.toLocaleString(undefined, { maximumFractionDigits: 12 })}{' '}
                      {country.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">4. PPP Conversion Factor:</span>
                    <span className="text-white">1 Int$ = {country.pppFactorPerUSD.toLocaleString()} {country.currency}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">5. Per-Unit Revenue Ratio:</span>
                    <span className="text-white">
                      {calculation.perUnitRatio.toFixed(3)}x ({(calculation.perUnitRatio * 100).toFixed(1)}% of baseline)
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-slate-400">6. Modeled Demand Uplift Multiplier:</span>
                    <span className="text-emerald-400 font-bold">
                      {calculation.estimatedVolumeMultiplier.toFixed(2)}x orders
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 font-bold">
                    <span className="text-slate-300">7. Net Total Profit Ratio (5 × 6):</span>
                    <span className={isGain ? 'text-emerald-400' : 'text-amber-400'}>
                      {calculation.estimatedProfitLossRatio.toFixed(3)}x
                    </span>
                  </div>
                </div>
              </div>

              {/* Real World Affordability & Break-even */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Affordability Context</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Median monthly income: <strong className="text-white">${country.medianMonthlyIncomeUSD.toLocaleString()} USD</strong>.
                  </p>
                  <div className="text-[11px] text-slate-300 pt-1">
                    At PPP price, a local worker needs <strong className="text-emerald-400 font-mono">{calculation.workHoursToAfford.toFixed(1)} hours</strong> of labor, compared to <strong className="text-amber-400 font-mono">{((calculation.baseAmount / (country.medianMonthlyIncomeUSD / 160))).toFixed(1)} hours</strong> at baseline price.
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    <span>Break-Even Safety Floor</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Minimum volume multiplier to match full-price baseline revenue:
                  </p>
                  <div className="text-sm font-bold font-mono text-sky-400 pt-1">
                    {calculation.breakEvenVolumeMultiplier.toFixed(2)}x sales
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Any conversion lift above {calculation.breakEvenVolumeMultiplier.toFixed(2)}x is net extra profit in your pocket.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Developer Snippet Tab */
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-white">Stripe Price Creation (Node.js SDK)</span>
                  <button
                    onClick={() => handleCopyCode(stripeSnippet)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  {stripeSnippet}
                </pre>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-white">JSON Pricing Payload</span>
                  <button
                    onClick={() => handleCopyCode(jsonConfigSnippet)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {jsonConfigSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Based on World Bank ICP Purchasing Power Parity benchmarks
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
