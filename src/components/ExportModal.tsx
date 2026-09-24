import React, { useState } from 'react';
import { X, Download, Copy, Check, FileSpreadsheet, FileJson, Tag } from 'lucide-react';
import { CountryPricingCalculation } from '../types/ppp';

interface ExportModalProps {
  calculations: CountryPricingCalculation[];
  onClose: () => void;
  baseCurrency: string;
  baseAmount: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  calculations,
  onClose,
  baseCurrency,
  baseAmount,
}) => {
  const [activeFormat, setActiveFormat] = useState<'csv' | 'json' | 'coupons'>('csv');
  const [copied, setCopied] = useState(false);

  // Generate CSV
  const generateCSV = () => {
    const headers = [
      'Country Code',
      'Country Name',
      'Region',
      'Currency',
      'Currency Symbol',
      'Base Price',
      'Base Currency',
      'Nominal Local Price',
      'PPP Adjusted Local Price',
      'Adjustment Type',
      'Adjustment %',
      'Per Unit Ratio',
      'Est Volume Multiplier',
      'Est Profit Loss Ratio',
      'Break Even Multiplier',
      'Price Level Index'
    ];

    const rows = calculations.map(c => {
      const type = c.effectiveDiscountPct > 0.5 ? 'discount' : c.effectiveDiscountPct < -0.5 ? 'premium' : 'baseline';
      const adjPct = c.effectiveDiscountPct > 0.5 ? -c.effectiveDiscountPct : Math.abs(c.effectiveDiscountPct);
      return [
        c.country.code,
        `"${c.country.name}"`,
        `"${c.country.region}"`,
        c.country.currency,
        `"${c.country.currencySymbol}"`,
        c.baseAmount,
        c.baseCurrency,
        c.nominalLocalPrice.toFixed(2),
        c.finalLocalPrice,
        type,
        adjPct.toFixed(1),
        c.perUnitRatio.toFixed(3),
        c.estimatedVolumeMultiplier.toFixed(2),
        c.estimatedProfitLossRatio.toFixed(3),
        c.breakEvenVolumeMultiplier.toFixed(2),
        c.country.priceLevelIndex.toFixed(3)
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  // Generate JSON
  const generateJSON = () => {
    const data = calculations.map(c => ({
      code: c.country.code,
      country: c.country.name,
      region: c.country.region,
      currency: c.country.currency,
      symbol: c.country.currencySymbol,
      baseline: {
        amount: c.baseAmount,
        currency: c.baseCurrency,
      },
      nominalPrice: Number(c.nominalLocalPrice.toFixed(2)),
      pppPrice: c.finalLocalPrice,
      formattedPrice: `${c.country.currencySymbol}${c.formattedLocalPrice}`,
      adjustmentType: c.effectiveDiscountPct > 0.5 ? 'discount' : c.effectiveDiscountPct < -0.5 ? 'premium' : 'baseline',
      adjustmentPercentage: Math.round(c.effectiveDiscountPct > 0.5 ? c.effectiveDiscountPct : Math.abs(c.effectiveDiscountPct)),
      perUnitRatio: Number(c.perUnitRatio.toFixed(3)),
      volumeMultiplier: Number(c.estimatedVolumeMultiplier.toFixed(2)),
      profitLossRatio: Number(c.estimatedProfitLossRatio.toFixed(3)),
      breakEvenVolumeMultiplier: Number(c.breakEvenVolumeMultiplier.toFixed(2)),
    }));
    return JSON.stringify(data, null, 2);
  };

  // Generate Coupon codes (e.g. for Stripe, Gumroad, Lemon Squeezy)
  const generateCoupons = () => {
    const discounted = calculations.filter(c => c.effectiveDiscountPct >= 5);
    return discounted.map(c => {
      const code = `PARITY-${c.country.code}-${Math.round(c.effectiveDiscountPct)}`;
      return `${c.country.flag} ${c.country.code} (${c.country.name}): Code: ${code} → ${Math.round(c.effectiveDiscountPct)}% discount (PPP price ≈ ${c.country.currencySymbol}${c.formattedLocalPrice})`;
    }).join('\n');
  };

  const currentContent = 
    activeFormat === 'csv' 
      ? generateCSV() 
      : activeFormat === 'json' 
      ? generateJSON() 
      : generateCoupons();

  const handleDownload = () => {
    const blob = new Blob([currentContent], { 
      type: activeFormat === 'json' ? 'application/json' : 'text/plain;charset=utf-8;' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parityscale-pricing-${baseAmount}${baseCurrency}-${activeFormat}.${activeFormat === 'coupons' ? 'txt' : activeFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Export Global Pricing Matrix ({calculations.length} Currencies)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selectors */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 text-xs">
          <button
            onClick={() => setActiveFormat('csv')}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeFormat === 'csv'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Spreadsheet</span>
          </button>
          <button
            onClick={() => setActiveFormat('json')}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeFormat === 'json'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON Payload</span>
          </button>
          <button
            onClick={() => setActiveFormat('coupons')}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeFormat === 'coupons'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Parity Discount Codes</span>
          </button>
        </div>

        {/* Preview box */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
            <span>Preview ({activeFormat.toUpperCase()}):</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors"
              >
                <Download className="w-3 h-3 text-slate-950" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 overflow-auto whitespace-pre">
            {currentContent}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
