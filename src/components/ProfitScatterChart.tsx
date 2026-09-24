import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { CountryPricingCalculation } from '../types/ppp';

interface ProfitScatterChartProps {
  calculations: CountryPricingCalculation[];
  onSelectCountry: (calc: CountryPricingCalculation) => void;
}

export const ProfitScatterChart: React.FC<ProfitScatterChartProps> = ({
  calculations,
  onSelectCountry,
}) => {
  const [viewMode, setViewMode] = useState<'ranking' | 'scatter'>('ranking');
  const [hoveredCountry, setHoveredCountry] = useState<CountryPricingCalculation | null>(null);

  // Sort top 15 by profit/loss ratio
  const topProfitOpportunities = [...calculations]
    .sort((a, b) => b.estimatedProfitLossRatio - a.estimatedProfitLossRatio)
    .slice(0, 14);

  // Max ratio for bar scaling
  const maxRatio = Math.max(...topProfitOpportunities.map(c => c.estimatedProfitLossRatio), 1.6);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Chart Header & View Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Profit Ratio Visual Analytics & Opportunity Ranking
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify which global territories yield the highest estimated revenue expansion under PPP
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('ranking')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'ranking'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Top Market Rankings
          </button>
          <button
            onClick={() => setViewMode('scatter')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'scatter'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Price Level vs Profit Ratio
          </button>
        </div>
      </div>

      {viewMode === 'ranking' ? (
        /* Top 14 Countries Bar Chart */
        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-xs text-slate-400 px-1">
            <span>Market & Effective Parity Offer</span>
            <div className="flex items-center gap-4">
              <span>Est. Volume Lift</span>
              <span className="w-28 text-right font-semibold text-slate-300">Profit/Loss Ratio</span>
            </div>
          </div>

          <div className="space-y-2">
            {topProfitOpportunities.map((item, idx) => {
              const widthPct = Math.min(100, Math.max(15, (item.estimatedProfitLossRatio / maxRatio) * 100));
              const isProfitGain = item.estimatedProfitLossRatio >= 1.0;

              return (
                <div
                  key={item.country.code}
                  onClick={() => onSelectCountry(item)}
                  className="group bg-slate-950/40 hover:bg-slate-800/60 p-2.5 rounded-lg border border-slate-800/60 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 text-[10px] w-4">{idx + 1}</span>
                      <span className="text-base" role="img" aria-label={item.country.name}>
                        {item.country.flag}
                      </span>
                      <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {item.country.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({item.country.currencySymbol}{item.formattedLocalPrice} {item.country.currency})
                      </span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-xs">
                      <span className="text-slate-300 font-medium">
                        {item.estimatedVolumeMultiplier.toFixed(1)}x volume
                      </span>
                      <div className="w-28 text-right flex items-center justify-end gap-1.5">
                        <span className={`text-[10px] font-sans ${
                          item.effectiveDiscountPct < -0.5 ? 'text-sky-400 font-medium' : 'text-slate-400'
                        }`}>
                          {item.effectiveDiscountPct > 0.5 
                            ? `-${item.effectiveDiscountPct.toFixed(0)}%` 
                            : item.effectiveDiscountPct < -0.5 
                            ? `+${Math.abs(item.effectiveDiscountPct).toFixed(0)}%` 
                            : '0%'}
                        </span>
                        <span className={`font-bold ${isProfitGain ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {item.estimatedProfitLossRatio.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal visual ratio bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex items-center relative">
                    {/* 1.0x baseline reference marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-500/80 z-10" 
                      style={{ left: `${(1.0 / maxRatio) * 100}%` }}
                      title="1.0x Baseline Break-Even"
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isProfitGain
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-600 to-amber-400'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-slate-500/80 rounded-xs"></span>
              Vertical marker indicates 1.0x (Baseline equivalent revenue)
            </span>
            <span>Click any market to explore pricing mechanics</span>
          </div>
        </div>
      ) : (
        /* Scatter Plot View (Price Level vs Profit Ratio) */
        <div className="pt-2 space-y-3">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>X-Axis: Country Price Level Index (Living Cost vs US)</span>
            <span>Y-Axis: Modeled Profit/Loss Ratio</span>
          </div>

          <div className="relative h-64 bg-slate-950/60 rounded-lg border border-slate-800 p-4 overflow-hidden">
            {/* 1.0x horizontal baseline line */}
            <div 
              className="absolute left-10 right-4 border-b border-dashed border-slate-600/70 z-0" 
              style={{ bottom: '35%' }}
            >
              <span className="absolute right-0 -top-5 text-[10px] text-slate-400 font-mono">
                1.0x Baseline Breakeven
              </span>
            </div>

            {/* Grid labels */}
            <div className="absolute left-2 top-3 text-[10px] font-mono text-slate-500">1.6x</div>
            <div className="absolute left-2 bottom-[35%] text-[10px] font-mono text-slate-400">1.0x</div>
            <div className="absolute left-2 bottom-3 text-[10px] font-mono text-slate-500">0.5x</div>

            {/* Data points */}
            <div className="absolute inset-0 left-10 bottom-6 top-3 right-4">
              {calculations.map((calc) => {
                // X: Price Level Index from 0.15 to 1.35
                const xPct = Math.max(5, Math.min(95, ((calc.country.priceLevelIndex - 0.18) / (1.30 - 0.18)) * 100));
                // Y: Profit ratio from 0.5 to 1.6
                const yPct = Math.max(5, Math.min(95, ((calc.estimatedProfitLossRatio - 0.5) / (1.6 - 0.5)) * 100));

                return (
                  <button
                    key={calc.country.code}
                    onClick={() => onSelectCountry(calc)}
                    onMouseEnter={() => setHoveredCountry(calc)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    style={{ left: `${xPct}%`, bottom: `${yPct}%` }}
                    className="absolute -translate-x-1/2 translate-y-1/2 p-1 rounded-full transition-transform hover:scale-150 z-10 focus:outline-none"
                    aria-label={`${calc.country.name}: ${calc.estimatedProfitLossRatio.toFixed(2)}x`}
                  >
                    <span className="text-sm select-none drop-shadow" role="img" aria-label={calc.country.name}>
                      {calc.country.flag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tooltip on hover */}
            {hoveredCountry && (
              <div className="absolute top-3 right-3 bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs z-20 pointer-events-none">
                <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                  <span>{hoveredCountry.country.flag}</span>
                  <span>{hoveredCountry.country.name}</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                  <div>PPP Price: {hoveredCountry.country.currencySymbol}{hoveredCountry.formattedLocalPrice}</div>
                  <div>Parity Discount: -{hoveredCountry.effectiveDiscountPct.toFixed(0)}%</div>
                  <div className="font-bold text-emerald-400">
                    Profit/Loss Ratio: {hoveredCountry.estimatedProfitLossRatio.toFixed(2)}x
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-mono px-2">
            <span>← Lower Living Costs (High Elasticity Lift)</span>
            <span>Higher Living Costs (Baseline Surcharge / Parity) →</span>
          </div>
        </div>
      )}
    </div>
  );
};
