import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import type { CountryPricingCalculation } from '../types/ppp';
import {
  formatMoneyAmount,
  type CatalogPriceSnapshot,
  type PaddleEnvironment,
} from '../lib/paddleTypes';
import { buildOverrideDiff, buildProposedPriceUpdate, patchBodyFromProposal } from '../lib/pricePayload';

interface ApplyToPaddlePanelProps {
  calculations: CountryPricingCalculation[];
  baseAmount: number;
  baseCurrency: string;
  environment: PaddleEnvironment | null;
}

export const ApplyToPaddlePanel: React.FC<ApplyToPaddlePanelProps> = ({
  calculations,
  baseAmount,
  baseCurrency,
  environment,
}) => {
  const [priceId, setPriceId] = useState('');
  const [current, setCurrent] = useState<CatalogPriceSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showProductionConfirm, setShowProductionConfirm] = useState(false);

  const proposed = useMemo(
    () => buildProposedPriceUpdate(calculations, baseAmount, baseCurrency),
    [calculations, baseAmount, baseCurrency],
  );

  const diff = useMemo(() => buildOverrideDiff(current, proposed), [current, proposed]);

  const patchPreview = useMemo(
    () => patchBodyFromProposal(proposed, diff.mergedOverrides),
    [proposed, diff.mergedOverrides],
  );

  const trimmedPriceId = priceId.trim();

  async function loadPrice(event?: React.FormEvent) {
    event?.preventDefault();
    setLoadError(null);
    setApplyError(null);
    setApplySuccess(null);
    setCurrent(null);

    if (!/^pri_[a-zA-Z0-9]+$/.test(trimmedPriceId)) {
      setLoadError('Enter a Paddle price id starting with pri_.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/prices/${encodeURIComponent(trimmedPriceId)}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? `Could not load price (${response.status})`);
      }
      setCurrent(body as CatalogPriceSnapshot);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load price.');
    } finally {
      setLoading(false);
    }
  }

  async function applyUpdate(confirmProduction: boolean) {
    setApplyError(null);
    setApplySuccess(null);

    if (!proposed.canApply) {
      setApplyError(proposed.applyDisabledReason);
      return;
    }

    if (!current) {
      setApplyError('Load the current Paddle price before applying.');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch(`/api/prices/${encodeURIComponent(current.id)}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitPrice: proposed.unitPrice,
          unitPriceOverrides: proposed.unitPriceOverrides,
          confirmProduction,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? `Apply failed (${response.status})`);
      }
      setCurrent(body.price as CatalogPriceSnapshot);
      setApplySuccess(`Updated ${body.price.id} in ${environment ?? 'Paddle'}.`);
      setShowProductionConfirm(false);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Apply failed.');
    } finally {
      setApplying(false);
    }
  }

  function handleApplyClick() {
    setApplyError(null);
    setApplySuccess(null);
    if (environment === 'production') {
      setShowProductionConfirm(true);
      return;
    }
    void applyUpdate(false);
  }

  const applyDisabled =
    !proposed.canApply || !current || loading || applying || environment == null;

  return (
    <section className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Apply to Paddle
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            PATCH only <code className="font-mono text-emerald-300">unitPrice</code> and{' '}
            <code className="font-mono text-emerald-300">unitPriceOverrides</code>. Other price
            fields stay unchanged. Existing overrides for countries outside this calculator are kept.
          </p>
        </div>
        {environment === 'production' && (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-200 bg-red-950/60 border border-red-500/40 rounded-lg px-3 py-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            Production — this write updates live catalog prices
          </div>
        )}
      </div>

      <form onSubmit={loadPrice} className="flex flex-col sm:flex-row gap-2">
        <input
          value={priceId}
          onChange={(event) => setPriceId(event.target.value)}
          placeholder="pri_..."
          spellCheck={false}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          aria-label="Paddle price id"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load price'}
        </button>
      </form>

      {loadError && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      {current && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Current price</div>
            <div className="font-mono text-white mt-1">{current.id}</div>
            <div className="text-slate-400 mt-1">
              {current.name ?? current.description}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Current base</div>
            <div className="font-mono text-white mt-1">
              {formatMoneyAmount(current.unitPrice)}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-slate-400">Current overrides</div>
            <div className="font-mono text-white mt-1">{current.unitPriceOverrides.length} groups</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="font-semibold text-white">Diff before apply</div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Base unitPrice</span>
            <span className="font-mono text-slate-200 text-right">
              {diff.currentUnitPrice ? formatMoneyAmount(diff.currentUnitPrice) : '—'}
              {' → '}
              {formatMoneyAmount(diff.proposedUnitPrice)}
              {diff.basePriceChanged ? (
                <span className="text-amber-300 ml-1">changed</span>
              ) : (
                <span className="text-slate-500 ml-1">unchanged</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Overrides added</span>
            <span className="font-mono text-emerald-300">{diff.added.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Overrides updated</span>
            <span className="font-mono text-amber-300">{diff.updated.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Overrides kept</span>
            <span className="font-mono text-slate-200">{diff.kept.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Countries skipped</span>
            <span className="font-mono text-slate-200">{diff.skipped.length}</span>
          </div>
          {diff.skipped.length > 0 && (
            <p className="text-[11px] text-slate-500">
              {diff.skipped
                .map((item) => `${item.code} (${item.currency})`)
                .join(', ')}
            </p>
          )}
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="font-semibold text-white">PATCH body (after merge)</div>
          <pre className="max-h-48 overflow-auto font-mono text-[11px] text-slate-300 whitespace-pre">
            {JSON.stringify(patchPreview, null, 2)}
          </pre>
        </div>
      </div>

      {!proposed.canApply && (
        <p className="text-xs text-amber-200 bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-2">
          {proposed.applyDisabledReason}
        </p>
      )}

      {applyError && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
          {applyError}
        </p>
      )}

      {applySuccess && (
        <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          {applySuccess}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleApplyClick}
          disabled={applyDisabled}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 ${
            environment === 'production'
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
          }`}
        >
          {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {environment === 'production' ? 'Apply to production' : 'Apply to sandbox'}
        </button>
      </div>

      {showProductionConfirm && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="bg-slate-900 border border-red-500/40 rounded-2xl w-full max-w-md shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="production-confirm-title"
          >
            <div className="p-4 border-b border-slate-800 flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h3 id="production-confirm-title" className="text-sm font-bold text-white">
                    Apply updates to production
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    This changes live catalog prices. Existing customers keep their current subscription
                    prices; new checkouts use the new amounts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProductionConfirm(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
                aria-label="Cancel production apply"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono text-slate-200">
              <div>environment: production</div>
              <div>priceId: {current.id}</div>
              <div>unitPrice: {formatMoneyAmount(proposed.unitPrice)}</div>
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProductionConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={() => void applyUpdate(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {applying ? 'Applying…' : 'Confirm production update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
