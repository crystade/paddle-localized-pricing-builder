import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  BarChart3,
  Download,
  Scale,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import { STRATEGY_PRESETS } from './data/pppData';
import { CountryPricingCalculation, StrategyConfig } from './types/ppp';
import { calculateCountryPricing, calculateGlobalSummary } from './utils/pppCalculations';
import { applyFxRates, parseFxRates, type FxRatesSnapshot } from './lib/fxRates';
import { Header } from './components/Header';
import { FxRatesBar, FxRatesBlocked } from './components/FxRatesPanel';
import { StrategyControls } from './components/StrategyControls';
import { PricingTable } from './components/PricingTable';
import { ProfitScatterChart } from './components/ProfitScatterChart';
import { ElasticitySimulator } from './components/ElasticitySimulator';
import { CountryDetailModal } from './components/CountryDetailModal';
import { ExportModal } from './components/ExportModal';
import { ApplyToPaddlePanel } from './components/ApplyToPaddlePanel';
import { isPaddleEnvironment, type PaddleEnvironment } from './lib/paddleTypes';

type FxState =
  | { status: 'loading' }
  | { status: 'absent'; message: string }
  | { status: 'ready'; snapshot: FxRatesSnapshot; refreshError: string | null };

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(text.trim() || `Request failed (${response.status})`);
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && body.error.length > 0) {
    return body.error;
  }
  return fallback;
}

export default function App() {
  const [baseAmount, setBaseAmount] = useState<number>(10);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [environment, setEnvironment] = useState<PaddleEnvironment | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [fx, setFx] = useState<FxState>({ status: 'loading' });
  const [fxBusy, setFxBusy] = useState(false);

  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>({
    id: STRATEGY_PRESETS['standard-saas'].id,
    name: STRATEGY_PRESETS['standard-saas'].name,
    description: STRATEGY_PRESETS['standard-saas'].description,
    maxDiscount: STRATEGY_PRESETS['standard-saas'].maxDiscount,
    minDiscount: STRATEGY_PRESETS['standard-saas'].minDiscount,
    allowSurcharge: STRATEGY_PRESETS['standard-saas'].allowSurcharge,
    maxSurcharge: STRATEGY_PRESETS['standard-saas'].maxSurcharge,
    rounding: STRATEGY_PRESETS['standard-saas'].rounding,
  });

  const [elasticity, setElasticity] = useState<number>(1.8);
  const baseVolume = 100;

  const [activeTab, setActiveTab] = useState<'table' | 'charts' | 'simulation'>('table');
  const [selectedCountryForDetail, setSelectedCountryForDetail] = useState<CountryPricingCalculation | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? `Config request failed (${response.status})`);
        }
        if (!isPaddleEnvironment(body.environment)) {
          throw new Error('Server did not return a Paddle environment.');
        }
        if (!cancelled) {
          setEnvironment(body.environment);
          setEnvironmentError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setEnvironment(null);
          setEnvironmentError(error instanceof Error ? error.message : 'Could not load Paddle environment.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/fx-rates')
      .then(async (response) => {
        const body = await readJson(response);
        if (!response.ok) {
          throw new Error(errorMessage(body, `Could not read exchange rates (${response.status})`));
        }
        return parseFxRates(body);
      })
      .then((snapshot) => {
        if (!cancelled) setFx({ status: 'ready', snapshot, refreshError: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFx({
            status: 'absent',
            message: error instanceof Error ? error.message : 'Could not read exchange rates.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchRates() {
    setFxBusy(true);
    try {
      const response = await fetch('/api/fx-rates', { method: 'POST' });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(errorMessage(body, `Could not fetch exchange rates (${response.status})`));
      }
      const snapshot = parseFxRates(body);
      applyFxRates(snapshot);
      setFx({ status: 'ready', snapshot, refreshError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not fetch exchange rates.';
      setFx((current) =>
        current.status === 'ready' ? { ...current, refreshError: message } : { status: 'absent', message },
      );
    } finally {
      setFxBusy(false);
    }
  }

  const pricedCountries = useMemo(() => {
    if (fx.status !== 'ready') return null;
    try {
      return applyFxRates(fx.snapshot);
    } catch (error) {
      return error instanceof Error ? error.message : 'Exchange rates could not be applied.';
    }
  }, [fx]);

  const availableCurrencies = useMemo(() => {
    const map = new Map<string, { code: string; symbol: string; name: string; flag: string }>();
    const source = Array.isArray(pricedCountries) ? pricedCountries : [];
    source.forEach((c) => {
      if (!map.has(c.currency)) {
        map.set(c.currency, {
          code: c.currency,
          symbol: c.currencySymbol,
          name: c.currencyName,
          flag: c.flag,
        });
      }
    });
    const priority = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SGD', 'INR', 'BRL'];
    const list = Array.from(map.values());
    return list.sort((a, b) => {
      const idxA = priority.indexOf(a.code);
      const idxB = priority.indexOf(b.code);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.code.localeCompare(b.code);
    });
  }, [pricedCountries]);

  const calculations = useMemo(() => {
    if (!Array.isArray(pricedCountries)) return [];
    return pricedCountries.map((country) =>
      calculateCountryPricing(country, baseAmount, baseCurrency, strategyConfig, {
        elasticity,
        baselineVisitorsOrSales: baseVolume,
      }, pricedCountries),
    );
  }, [pricedCountries, baseAmount, baseCurrency, strategyConfig, elasticity, baseVolume]);

  const summary = useMemo(() => {
    return calculateGlobalSummary(calculations);
  }, [calculations]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="sticky top-0 z-40">
        {environment === 'production' && (
          <div className="bg-red-600 text-white text-center text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            PRODUCTION environment — applying updates changes live Paddle prices
          </div>
        )}

        {fx.status === 'ready' && Array.isArray(pricedCountries) && (
          <Header
            baseAmount={baseAmount}
            setBaseAmount={setBaseAmount}
            baseCurrency={baseCurrency}
            setBaseCurrency={setBaseCurrency}
            summary={summary}
            availableCurrencies={availableCurrencies}
            environment={environment}
            environmentError={environmentError}
          />
        )}
      </div>

      {fx.status !== 'ready' || !Array.isArray(pricedCountries) ? (
        <FxRatesBlocked
          message={
            fx.status === 'absent'
              ? fx.message
              : typeof pricedCountries === 'string'
                ? pricedCountries
                : 'Exchange rates have not been fetched yet.'
          }
          checking={fx.status === 'loading'}
          busy={fxBusy}
          onFetch={() => {
            void fetchRates();
          }}
        />
      ) : (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <FxRatesBar
          lastUpdatedAt={fx.snapshot.meta.last_updated_at}
          busy={fxBusy}
          error={fx.refreshError}
          onRefresh={() => {
            void fetchRates();
          }}
        />

        <StrategyControls
          strategyConfig={strategyConfig}
          setStrategyConfig={setStrategyConfig}
          elasticity={elasticity}
          setElasticity={setElasticity}
        />

        <ApplyToPaddlePanel
          calculations={calculations}
          baseAmount={baseAmount}
          baseCurrency={baseCurrency}
          environment={environment}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'table'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Pricing & Profit Ratio Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'charts'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Profit Rankings & Charts</span>
            </button>

            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'simulation'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Elasticity Simulator</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV / JSON / Coupons</span>
            </button>
          </div>
        </div>

        {activeTab === 'table' && (
          <div className="space-y-6">
            <PricingTable
              calculations={calculations}
              baseCurrency={baseCurrency}
              onSelectCountry={(calc) => setSelectedCountryForDetail(calc)}
            />

            <ElasticitySimulator
              calculations={calculations}
              baseAmount={baseAmount}
              baseCurrency={baseCurrency}
            />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="space-y-6">
            <ProfitScatterChart
              calculations={calculations}
              onSelectCountry={(calc) => setSelectedCountryForDetail(calc)}
            />

            <PricingTable
              calculations={calculations}
              baseCurrency={baseCurrency}
              onSelectCountry={(calc) => setSelectedCountryForDetail(calc)}
            />
          </div>
        )}

        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <ElasticitySimulator
              calculations={calculations}
              baseAmount={baseAmount}
              baseCurrency={baseCurrency}
            />

            <ProfitScatterChart
              calculations={calculations}
              onSelectCountry={(calc) => setSelectedCountryForDetail(calc)}
            />
          </div>
        )}

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-400 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Why Parity Pricing Drives Net Profit Gains (Digital & SaaS Economics)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-400 leading-relaxed">
            <div>
              <strong className="text-slate-200 block mb-1">Zero Marginal Cost</strong>
              Selling an additional license or subscription in India, Brazil, or Vietnam costs essentially $0. When you
              offer a 60% discount, any revenue is nearly 100% gross profit.
            </div>
            <div>
              <strong className="text-slate-200 block mb-1">The Affordability Chasm</strong>
              At $10 USD nominal price, buying software in Nigeria takes ~7.5 hours of median labor; in the US, it takes
              15 minutes. Unadjusted pricing leads to 99%+ bounce rates and rampant piracy.
            </div>
            <div>
              <strong className="text-slate-200 block mb-1">Volume Uplift Outweighs Price Cuts</strong>
              Empirical data from Steam, Spotify, and ParityDeals confirms that a 50%-70% discount typically yields a 3x
              to 5x conversion surge, generating{' '}
              <strong className="text-emerald-400 font-mono">+20% to +80% higher net total revenue</strong>.
            </div>
          </div>
        </div>
      </main>
      )}

      {selectedCountryForDetail && (
        <CountryDetailModal
          calculation={selectedCountryForDetail}
          onClose={() => setSelectedCountryForDetail(null)}
          baseCurrency={baseCurrency}
        />
      )}

      {showExportModal && (
        <ExportModal
          calculations={calculations}
          onClose={() => setShowExportModal(false)}
          baseCurrency={baseCurrency}
          baseAmount={baseAmount}
        />
      )}
    </div>
  );
}
