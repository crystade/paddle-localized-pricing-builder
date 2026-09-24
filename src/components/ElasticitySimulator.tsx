import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { CountryPricingCalculation } from '../types/ppp';

interface ElasticitySimulatorProps {
  calculations: CountryPricingCalculation[];
  baseAmount: number;
  baseCurrency: string;
}

export const ElasticitySimulator: React.FC<ElasticitySimulatorProps> = ({
  calculations,
  baseAmount,
  baseCurrency,
}) => {
  // Let user pick a spotlight country to simulate
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('IN');
  const [customBaselineUnits, setCustomBaselineUnits] = useState<number>(100);

  const selectedCalc = calculations.find(c => c.country.code === selectedCountryCode) || calculations[0];

  if (!selectedCalc) return null;

  // Simulate unit economics
  const baselineRevenue = customBaselineUnits * baseAmount;
  const noUpliftPPPRevenue = customBaselineUnits * selectedCalc.finalPriceInBaseCurrency;
  const simulatedSalesUnits = Math.round(customBaselineUnits * selectedCalc.estimatedVolumeMultiplier);
  const simulatedTotalPPPRevenue = simulatedSalesUnits * selectedCalc.finalPriceInBaseCurrency;
  const netDeltaRevenue = simulatedTotalPPPRevenue - baselineRevenue;
  const isNetProfitGain = selectedCalc.estimatedProfitLossRatio >= 1.0;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Profit/Loss Ratio Mechanics & Volume Elasticity
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Formula:</span>
          <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px] border border-slate-800">
            Ratio = (Price_PPP / Price_Base) × Volume_Multiplier
          </code>
        </div>
      </div>

      {/* Interactive walkthrough */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Country Selector & Scenario inputs */}
        <div className="lg:col-span-4 space-y-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/70 text-xs">
          <div className="font-semibold text-slate-300 flex items-center justify-between">
            <span>Spotlight Simulation</span>
            <span className="text-[11px] text-slate-500">Pick any market</span>
          </div>

          <div>
            <label htmlFor="country-sim-select" className="text-slate-400 block mb-1">Select Market to Inspect:</label>
            <select
              id="country-sim-select"
              value={selectedCountryCode}
              onChange={(e) => setSelectedCountryCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {calculations.map((c) => (
                <option key={c.country.code} value={c.country.code}>
                  {c.country.flag} {c.country.name} ({c.country.currency}) - {c.effectiveDiscountPct > 0 ? `-${c.effectiveDiscountPct.toFixed(0)}%` : 'Base'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <label htmlFor="baseline-sales-input">Baseline Monthly Sales (at full price):</label>
              <span className="font-mono text-white font-bold">{customBaselineUnits} units</span>
            </div>
            <input
              id="baseline-sales-input"
              type="range"
              min="10"
              max="1000"
              step="10"
              value={customBaselineUnits}
              onChange={(e) => setCustomBaselineUnits(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Quick summary stats for this market */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-400">
              <span>Nominal Market Exchange Price:</span>
              <span className="font-mono text-slate-200">
                {selectedCalc.country.currencySymbol}{selectedCalc.nominalLocalPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>PPP Adjusted Offer:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {selectedCalc.country.currencySymbol}{selectedCalc.formattedLocalPrice}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Base Currency Equivalent:</span>
              <span className="font-mono text-slate-200">
                {selectedCalc.finalPriceInBaseCurrency.toFixed(2)} {baseCurrency} (Per-unit: {(selectedCalc.perUnitRatio * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right: The 3 Comparative Stages (Baseline vs PPP Static vs Volume Adjusted) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Stage 1: Baseline at full price */}
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Scenario A: Full Price
              </span>
              <div className="text-base font-bold text-white font-mono">
                {baseAmount.toFixed(2)} {baseCurrency}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                No parity adjustment. Expensive for local buyers.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sales:</span>
                <span className="font-mono font-medium text-white">{customBaselineUnits} orders</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Revenue:</span>
                <span className="font-mono font-bold text-white">{baselineRevenue.toFixed(0)} {baseCurrency}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Ratio:</span>
                <span className="font-mono">1.00x (Benchmark)</span>
              </div>
            </div>
          </div>

          {/* Stage 2: Without Volume Uplift (Per-unit concession) */}
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-1">
                Per-Unit Price Delta
              </span>
              <div className="text-base font-bold text-amber-300 font-mono">
                {selectedCalc.finalPriceInBaseCurrency.toFixed(2)} {baseCurrency}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Per-unit revenue concession is{' '}
                <span className="font-mono text-amber-400 font-semibold">
                  {selectedCalc.effectiveDiscountPct > 0 ? `-${selectedCalc.effectiveDiscountPct.toFixed(0)}%` : '0%'}
                </span>.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Static (No Uplift):</span>
                <span className="font-mono font-medium text-amber-400">{noUpliftPPPRevenue.toFixed(0)} {baseCurrency}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Break-Even Req:</span>
                <span className="font-mono font-semibold text-sky-400">
                  {selectedCalc.breakEvenVolumeMultiplier.toFixed(2)}x volume
                </span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Break-Even Sales:</span>
                <span className="font-mono text-slate-300">
                  {Math.ceil(customBaselineUnits * selectedCalc.breakEvenVolumeMultiplier)} orders
                </span>
              </div>
            </div>
          </div>

          {/* Stage 3: Modeled Total Revenue & Profit/Loss Ratio */}
          <div className={`p-3.5 rounded-lg border flex flex-col justify-between ${
            isNetProfitGain 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                  Scenario B: Modeled PPP
                </span>
                {isNetProfitGain ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1.5">
                <span className={isNetProfitGain ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedCalc.estimatedProfitLossRatio.toFixed(2)}x
                </span>
                <span className="text-xs font-sans text-slate-400 font-normal">
                  ({isNetProfitGain ? '+' : ''}{selectedCalc.estimatedNetProfitGainPct.toFixed(0)}% net)
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                Uplift: <span className="font-mono font-bold text-white">{selectedCalc.estimatedVolumeMultiplier.toFixed(1)}x</span> orders
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Modeled Sales:</span>
                <span className="font-mono font-bold text-white">{simulatedSalesUnits} orders</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Net Total Revenue:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {simulatedTotalPPPRevenue.toFixed(0)} {baseCurrency}
                </span>
              </div>
              <div className="flex justify-between font-medium text-[11px]">
                <span className="text-slate-400">Estimated Net Delta:</span>
                <span className={`font-mono ${netDeltaRevenue >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {netDeltaRevenue >= 0 ? '+' : ''}{netDeltaRevenue.toFixed(0)} {baseCurrency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
