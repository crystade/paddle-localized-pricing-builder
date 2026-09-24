import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { formatFxTimestamp } from '../lib/fxRates';

interface FxRatesBlockedProps {
  message: string;
  checking: boolean;
  busy: boolean;
  onFetch: () => void;
}

export const FxRatesBlocked: React.FC<FxRatesBlockedProps> = ({ message, checking, busy, onFetch }) => {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-xl border border-red-500/40 bg-red-500/10 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-white">Exchange rates are unavailable</h2>
            <p className="text-sm text-red-100">{checking ? 'Checking the local exchange-rate cache…' : message}</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pricing stays blocked until a rate file exists on this machine. Fetching downloads the latest snapshot
              from currencyapi.com and uses your API quota. It runs only when you click the button.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onFetch}
          disabled={checking || busy}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {busy ? 'Fetching…' : 'Fetch exchange rates'}
        </button>
      </div>
    </div>
  );
};

interface FxRatesBarProps {
  lastUpdatedAt: string;
  busy: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const FxRatesBar: React.FC<FxRatesBarProps> = ({ lastUpdatedAt, busy, error, onRefresh }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-200">
          Nominal rates from currencyapi.com
          <span className="text-slate-400"> · updated {formatFxTimestamp(lastUpdatedAt)}</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Re-fetch downloads a new snapshot and replaces the local file. It runs only when you click.
        </p>
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
        {busy ? 'Fetching…' : 'Re-fetch rates'}
      </button>
    </div>
  );
};
