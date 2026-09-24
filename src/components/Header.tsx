import React from 'react';
import { Globe2, DollarSign, TrendingUp, Sparkles, Percent, ShieldAlert } from 'lucide-react';
import { GlobalSummary } from '../types/ppp';
import type { PaddleEnvironment } from '../lib/paddleTypes';

interface HeaderProps {
  baseAmount: number;
  setBaseAmount: (amount: number) => void;
  baseCurrency: string;
  setBaseCurrency: (currency: string) => void;
  summary: GlobalSummary;
  availableCurrencies: { code: string; symbol: string; name: string; flag: string }[];
  environment: PaddleEnvironment | null;
  environmentError: string | null;
}

const PRESET_AMOUNTS = [5, 10, 20, 29, 49, 99, 199];

export const Header: React.FC<HeaderProps> = ({
  baseAmount,
  setBaseAmount,
  baseCurrency,
  setBaseCurrency,
  summary,
  availableCurrencies,
  environment,
  environmentError,
}) => {
  const currentCurrencyObj = availableCurrencies.find(c => c.code === baseCurrency) || availableCurrencies[0];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top brand & core inputs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Globe2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                  ParityScale
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  PPP Pricing
                </span>
                {environment === 'production' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wide">
                    <ShieldAlert className="w-3 h-3" />
                    production
                  </span>
                ) : environment === 'sandbox' ? (
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                    sandbox
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                    {environmentError ? 'environment unavailable' : 'connecting…'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Purchasing Power Parity pricing & profit ratio calculator for global sales (World Bank ICP & OECD)
              </p>
            </div>
          </div>

          {/* Core Input: Baseline Amount & Currency */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            {/* Currency selector */}
            <div className="flex items-center pl-2 pr-1 gap-1.5 border-r border-slate-800">
              <span className="text-base" role="img" aria-label="flag">
                {currentCurrencyObj?.flag || '🌐'}
              </span>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer py-1.5 pr-2"
                aria-label="Select baseline currency"
              >
                {availableCurrencies.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.code} ({c.symbol}) - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount input */}
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-sm font-medium text-slate-400">
                {currentCurrencyObj?.symbol || '$'}
              </span>
              <input
                type="number"
                min="0.5"
                step="any"
                value={baseAmount || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBaseAmount(isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="w-24 bg-transparent text-lg font-bold text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
                placeholder="10"
                aria-label="Baseline amount"
              />
            </div>

            {/* Quick preset chips */}
            <div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBaseAmount(amt)}
                  className={`px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
                    baseAmount === amt
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Baseline Benchmark</span>
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-base font-bold font-mono text-white">
              {currentCurrencyObj?.symbol}{baseAmount.toFixed(2)} <span className="text-xs font-normal text-slate-400">{baseCurrency}</span>
            </div>
          </div>

          <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Avg Parity Discount</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {summary.averageDiscountPct.toFixed(1)}%
              <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
                ({summary.countriesWithDiscount} mkts)
              </span>
            </div>
            <div className="text-[10px] text-sky-400 font-medium truncate mt-0.5">
              {summary.countriesWithSurcharge > 0 
                ? `+ ${summary.countriesWithSurcharge} high-PPP premium mkts` 
                : 'High-PPP at baseline cap'}
            </div>
          </div>

          <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Blended Profit/Loss Ratio</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono flex items-center gap-1.5">
              <span className={summary.blendedProfitLossRatio >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}>
                {summary.blendedProfitLossRatio.toFixed(2)}x
              </span>
              <span className={`text-xs px-1.5 py-0.2 rounded font-sans font-medium ${
                summary.blendedProfitLossRatio >= 1.0 
                  ? 'bg-emerald-500/10 text-emerald-300' 
                  : 'bg-amber-500/10 text-amber-300'
              }`}>
                {summary.blendedProfitLossRatio >= 1.0 ? '+' : ''}
                {((summary.blendedProfitLossRatio - 1) * 100).toFixed(0)}% net
              </span>
            </div>
          </div>

          <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Top Profit Opportunity</span>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-base font-bold text-white truncate flex items-center gap-1.5">
              {summary.maxProfitableCountry ? (
                <>
                  <span>{summary.maxProfitableCountry.country.flag}</span>
                  <span className="truncate">{summary.maxProfitableCountry.country.name}</span>
                  <span className="text-xs font-mono text-emerald-400 shrink-0">
                    +{summary.maxProfitableCountry.estimatedNetProfitGainPct.toFixed(0)}%
                  </span>
                </>
              ) : (
                '--'
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
