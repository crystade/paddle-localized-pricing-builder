import React, { useState } from 'react';
import { Sliders, Zap, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RoundingRule, StrategyConfig } from '../types/ppp';
import { STRATEGY_PRESETS } from '../data/pppData';

interface StrategyControlsProps {
  strategyConfig: StrategyConfig;
  setStrategyConfig: React.Dispatch<React.SetStateAction<StrategyConfig>>;
  elasticity: number;
  setElasticity: (val: number) => void;
}

export const StrategyControls: React.FC<StrategyControlsProps> = ({
  strategyConfig,
  setStrategyConfig,
  elasticity,
  setElasticity,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSelectPreset = (presetKey: string) => {
    const preset = STRATEGY_PRESETS[presetKey];
    if (preset) {
      setStrategyConfig({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        maxDiscount: preset.maxDiscount,
        minDiscount: preset.minDiscount,
        allowSurcharge: preset.allowSurcharge,
        maxSurcharge: preset.maxSurcharge,
        rounding: preset.rounding,
      });
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Strategy Selector Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Pricing Strategy Presets
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure how purchasing power gaps translate to consumer discounts & profit models
          </p>
        </div>

        {/* Strategy Presets as clean segmented button controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
          {Object.entries(STRATEGY_PRESETS).map(([key, preset]) => {
            const isActive = strategyConfig.id === preset.id;
            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{preset.name.split(' ')[0]}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-sans ${
                  isActive ? 'bg-slate-900/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {preset.badge}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => {
              setStrategyConfig(prev => ({
                ...prev,
                id: 'custom',
                name: 'Custom Calibration',
                description: 'User-defined discount caps, price surcharges, and rounding mechanics.',
              }));
              setShowAdvanced(true);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              strategyConfig.id === 'custom'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Preset description card */}
      <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white mr-1.5">{strategyConfig.name}:</span>
            <span className="text-slate-300">{strategyConfig.description}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400 shrink-0">
          <div>
            <span>Max Parity Discount: </span>
            <span className="font-mono font-bold text-emerald-400">
              {(strategyConfig.maxDiscount * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span>High-PPP Pricing: </span>
            <span className={`font-mono font-semibold ${strategyConfig.allowSurcharge ? 'text-sky-400' : 'text-slate-400'}`}>
              {strategyConfig.allowSurcharge ? `+${(strategyConfig.maxSurcharge * 100).toFixed(0)}% Premium Cap` : 'Frozen at 100% Baseline'}
            </span>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-slate-300 hover:text-white underline font-medium"
          >
            <span>{showAdvanced ? 'Hide Fine-tuning' : 'Fine-tune'}</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Advanced Fine-Tuning Panel (Collapsible) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Max Discount Slider */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
            <div className="flex justify-between items-center text-slate-300">
              <label htmlFor="max-discount-slider" className="font-medium">Max Discount Cap</label>
              <span className="font-mono font-bold text-emerald-400">
                {(strategyConfig.maxDiscount * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="max-discount-slider"
              type="range"
              min="0.20"
              max="0.90"
              step="0.05"
              value={strategyConfig.maxDiscount}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setStrategyConfig(prev => ({ ...prev, id: 'custom', maxDiscount: val }));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Ceiling discount for highest living-cost disparity countries (e.g. India, Nigeria).
            </p>
          </div>

          {/* Surcharge Toggle & Cap */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">High-PPP Parity Premium</span>
              <button
                onClick={() => {
                  setStrategyConfig(prev => ({
                    ...prev,
                    id: 'custom',
                    allowSurcharge: !prev.allowSurcharge,
                    maxSurcharge: !prev.allowSurcharge && prev.maxSurcharge === 0 ? 0.35 : prev.maxSurcharge,
                  }));
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  strategyConfig.allowSurcharge
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {strategyConfig.allowSurcharge ? 'Two-Way (Enabled)' : 'Cap at 100%'}
              </button>
            </div>
            {strategyConfig.allowSurcharge ? (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Max Premium Cap</span>
                  <span className="font-mono text-sky-400 font-bold">
                    +{(strategyConfig.maxSurcharge * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.50"
                  step="0.05"
                  value={strategyConfig.maxSurcharge}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setStrategyConfig(prev => ({ ...prev, id: 'custom', maxSurcharge: val }));
                  }}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 pt-0.5">
                  Applies purchasing power premium to high-cost markets (e.g. Switzerland CHF, Norway NOK) to capture higher willingness-to-pay.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 pt-1">
                When capped at 100%, high-PPP markets (Switzerland, Norway, US) never pay above standard baseline.
              </p>
            )}
          </div>

          {/* Demand Elasticity Factor */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
            <div className="flex justify-between items-center text-slate-300">
              <div className="flex items-center gap-1">
                <span className="font-medium">Price Elasticity (ε)</span>
                <span title="Controls the modeled sales volume uplift multiplier based on discount depth">
                  <HelpCircle className="w-3 h-3 text-slate-500" />
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-400">
                {elasticity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.8"
              step="0.1"
              value={elasticity}
              onChange={(e) => setElasticity(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              {elasticity >= 2.0 
                ? 'High elasticity: Massive volume uplift on digital discounts' 
                : elasticity <= 1.3 
                ? 'Low elasticity: Conservative enterprise SaaS assumptions' 
                : 'Balanced SaaS/digital content elasticity (standard ~1.8x)'}
            </p>
          </div>

          {/* Psychological Rounding Rule */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
            <div className="text-slate-300 font-medium">Psychological Rounding</div>
            <div className="grid grid-cols-3 gap-1 pt-0.5">
              {(['charm-99', 'round-00', 'exact'] as RoundingRule[]).map((rule) => (
                <button
                  key={rule}
                  onClick={() => {
                    setStrategyConfig(prev => ({ ...prev, rounding: rule }));
                  }}
                  className={`py-1 px-1.5 text-center text-[11px] font-mono rounded transition-colors ${
                    strategyConfig.rounding === rule
                      ? 'bg-slate-700 text-white font-semibold border border-slate-600'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {rule === 'charm-99' ? '.99 / 990' : rule === 'round-00' ? '.00 / 1000' : 'Exact'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Formats clean pricing endings for local consumer habits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
