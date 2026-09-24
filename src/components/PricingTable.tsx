import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Info, 
  Copy, 
  Check, 
  ChevronRight,
  Percent,
  Sparkles
} from 'lucide-react';
import { CountryPricingCalculation } from '../types/ppp';

interface PricingTableProps {
  calculations: CountryPricingCalculation[];
  baseCurrency: string;
  onSelectCountry: (calculation: CountryPricingCalculation) => void;
}

type SortField = 
  | 'country' 
  | 'currency' 
  | 'nominalPrice' 
  | 'pppPrice' 
  | 'discount' 
  | 'perUnitRatio' 
  | 'volumeMultiplier' 
  | 'profitLossRatio' 
  | 'breakEven' 
  | 'workHours';

export const PricingTable: React.FC<PricingTableProps> = ({
  calculations,
  baseCurrency,
  onSelectCountry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [profitFilter, setProfitFilter] = useState<'all' | 'gain' | 'concession' | 'premium' | 'discount'>('all');
  const [sortField, setSortField] = useState<SortField>('profitLossRatio');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Sensible defaults
      if (field === 'country' || field === 'currency') {
        setSortAsc(true);
      } else {
        setSortAsc(false); // higher profit / discount first
      }
    }
  };

  // Filter & Search
  const filteredCalculations = useMemo(() => {
    return calculations.filter((item) => {
      // Region filter
      if (selectedRegion !== 'All' && item.country.region !== selectedRegion) {
        return false;
      }

      // Profit filter
      if (profitFilter === 'gain' && item.estimatedProfitLossRatio <= 1.02) {
        return false;
      }
      if (profitFilter === 'concession' && item.estimatedProfitLossRatio >= 0.98) {
        return false;
      }
      if (profitFilter === 'premium' && item.effectiveDiscountPct >= -0.5) {
        return false;
      }
      if (profitFilter === 'discount' && item.effectiveDiscountPct <= 0.5) {
        return false;
      }

      // Text search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = item.country.name.toLowerCase().includes(query);
        const matchesCode = item.country.code.toLowerCase().includes(query);
        const matchesCurrency = item.country.currency.toLowerCase().includes(query);
        const matchesCurrencyName = item.country.currencyName.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesCurrency || matchesCurrencyName;
      }

      return true;
    });
  }, [calculations, selectedRegion, profitFilter, searchQuery]);

  // Sort
  const sortedCalculations = useMemo(() => {
    return [...filteredCalculations].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'country':
          comparison = a.country.name.localeCompare(b.country.name);
          break;
        case 'currency':
          comparison = a.country.currency.localeCompare(b.country.currency);
          break;
        case 'nominalPrice':
          comparison = a.nominalPriceInBaseCurrency - b.nominalPriceInBaseCurrency;
          break;
        case 'pppPrice':
          comparison = a.finalPriceInBaseCurrency - b.finalPriceInBaseCurrency;
          break;
        case 'discount':
          comparison = a.effectiveDiscountPct - b.effectiveDiscountPct;
          break;
        case 'perUnitRatio':
          comparison = a.perUnitRatio - b.perUnitRatio;
          break;
        case 'volumeMultiplier':
          comparison = a.estimatedVolumeMultiplier - b.estimatedVolumeMultiplier;
          break;
        case 'profitLossRatio':
          comparison = a.estimatedProfitLossRatio - b.estimatedProfitLossRatio;
          break;
        case 'breakEven':
          comparison = a.breakEvenVolumeMultiplier - b.breakEvenVolumeMultiplier;
          break;
        case 'workHours':
          comparison = a.workHoursToAfford - b.workHoursToAfford;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredCalculations, sortField, sortAsc]);

  const regions: string[] = ['All', 'Asia-Pacific', 'Europe', 'Latin America', 'Middle East & Africa', 'North America'];

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-emerald-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-400" />
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm space-y-3">
      {/* Table Toolbar: Search, Region filter, Status filter */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country, currency code (e.g. INR, BRL, Japan)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Outcome Filter Segmented Control */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs shrink-0">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Outcome:</span>
            <button
              onClick={() => setProfitFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                profitFilter === 'all'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({calculations.length})
            </button>
            <button
              onClick={() => setProfitFilter('gain')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                profitFilter === 'gain'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Profit Gains</span>
            </button>
            <button
              onClick={() => setProfitFilter('discount')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                profitFilter === 'discount'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <Percent className="w-3 h-3 text-emerald-400" />
              <span>Discounts ({calculations.filter(c => c.effectiveDiscountPct > 0.5).length})</span>
            </button>
            <button
              onClick={() => setProfitFilter('premium')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                profitFilter === 'premium'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                  : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>High-PPP Premiums ({calculations.filter(c => c.effectiveDiscountPct < -0.5).length})</span>
            </button>
            <button
              onClick={() => setProfitFilter('concession')}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                profitFilter === 'concession'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <TrendingDown className="w-3 h-3 text-amber-400" />
              <span>Concessions</span>
            </button>
          </div>
        </div>

        {/* Region Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-500 text-[11px] font-medium mr-1 shrink-0">Region:</span>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-1 rounded-md transition-colors shrink-0 ${
                selectedRegion === region
                  ? 'bg-slate-800 text-white font-medium border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <th 
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('country')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Country & Region</span>
                  {renderSortIndicator('country')}
                </div>
              </th>

              <th 
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('currency')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Currency</span>
                  {renderSortIndicator('currency')}
                </div>
              </th>

              <th 
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('nominalPrice')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Market Nominal</span>
                  {renderSortIndicator('nominalPrice')}
                </div>
              </th>

              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors bg-emerald-500/5"
                onClick={() => handleSort('pppPrice')}
              >
                <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                  <span>PPP Adjusted Price</span>
                  {renderSortIndicator('pppPrice')}
                </div>
              </th>

              <th 
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('discount')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Parity Adjustment</span>
                  {renderSortIndicator('discount')}
                </div>
              </th>

              <th 
                className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('volumeMultiplier')}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Est. Volume Uplift</span>
                  {renderSortIndicator('volumeMultiplier')}
                </div>
              </th>

              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors bg-slate-950/80"
                onClick={() => handleSort('profitLossRatio')}
              >
                <div className="flex items-center justify-end gap-1.5 font-bold">
                  <span>Est. Profit/Loss Ratio</span>
                  {renderSortIndicator('profitLossRatio')}
                </div>
              </th>

              <th 
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors hidden xl:table-cell"
                onClick={() => handleSort('breakEven')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Break-Even Req</span>
                  {renderSortIndicator('breakEven')}
                </div>
              </th>

              <th 
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
                onClick={() => handleSort('workHours')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Median Labor</span>
                  {renderSortIndicator('workHours')}
                </div>
              </th>

              <th className="py-3 px-3 text-center w-24">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-sans">
            {sortedCalculations.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No countries match your search or filter criteria.
                </td>
              </tr>
            ) : (
              sortedCalculations.map((item) => {
                const isGain = item.estimatedProfitLossRatio >= 1.02;
                const isConcession = item.estimatedProfitLossRatio < 0.98;

                return (
                  <tr
                    key={item.country.code}
                    onClick={() => onSelectCountry(item)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Country & Region */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0" role="img" aria-label={item.country.name}>
                          {item.country.flag}
                        </span>
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 flex-wrap">
                            <span>{item.country.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{item.country.code}</span>
                            {item.effectiveDiscountPct < -0.5 && (
                              <span className="inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-sans font-medium">
                                💎 High PPP
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>{item.country.region}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.country.incomeGroup}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Currency */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-medium text-slate-200">
                        {item.country.currency}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[100px]">
                        {item.country.currencyName}
                      </div>
                    </td>

                    {/* Nominal Market Price (without PPP) */}
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      <div>
                        {item.country.currencySymbol}{item.nominalLocalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.effectiveDiscountPct < -0.5 ? 'nominal forex' : '100% baseline'}
                      </div>
                    </td>

                    {/* PPP Adjusted Price */}
                    <td className="py-3 px-4 text-right bg-emerald-500/5 font-mono">
                      <div className={`text-sm font-bold ${item.effectiveDiscountPct < -0.5 ? 'text-sky-400' : 'text-emerald-400'}`}>
                        {item.country.currencySymbol}{item.formattedLocalPrice}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ≈ {item.finalPriceInBaseCurrency.toFixed(2)} {baseCurrency}
                      </div>
                    </td>

                    {/* Parity Adjustment */}
                    <td className="py-3 px-3 text-right font-mono">
                      {item.effectiveDiscountPct > 0.5 ? (
                        <div>
                          <span className="font-semibold text-emerald-400">
                            -{item.effectiveDiscountPct.toFixed(0)}%
                          </span>
                          <div className="text-[10px] text-slate-500">
                            discount ({item.perUnitRatio.toFixed(2)}x)
                          </div>
                        </div>
                      ) : item.effectiveDiscountPct < -0.5 ? (
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            <span className="font-semibold text-sky-400">
                              +{(Math.abs(item.effectiveDiscountPct)).toFixed(0)}%
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-sans font-semibold">
                              Premium
                            </span>
                          </div>
                          <div className="text-[10px] text-sky-400/80">
                            premium ({item.perUnitRatio.toFixed(2)}x)
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          <span className="text-slate-300 font-medium">0%</span>
                          <div className="text-[10px] text-slate-500">baseline parity</div>
                        </div>
                      )}
                    </td>

                    {/* Modeled Volume Uplift */}
                    <td className="py-3 px-3 text-center font-mono">
                      <div className="font-semibold text-slate-200">
                        {item.estimatedVolumeMultiplier.toFixed(1)}x
                      </div>
                      <div className="text-[10px] text-slate-500">
                        est. conversions
                      </div>
                    </td>

                    {/* Estimated Profit/Loss Ratio */}
                    <td className="py-3 px-4 text-right bg-slate-950/60 font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        {isGain ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isConcession ? (
                          <TrendingDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : null}

                        <span className={`text-sm font-bold ${
                          isGain 
                            ? 'text-emerald-400' 
                            : isConcession 
                            ? 'text-amber-400' 
                            : 'text-slate-300'
                        }`}>
                          {item.estimatedProfitLossRatio.toFixed(2)}x
                        </span>
                      </div>
                      <div className={`text-[10px] font-sans font-medium ${
                        isGain 
                          ? 'text-emerald-400/90' 
                          : isConcession 
                          ? 'text-amber-400/90' 
                          : 'text-slate-500'
                      }`}>
                        {item.estimatedNetProfitGainPct >= 0 ? '+' : ''}
                        {item.estimatedNetProfitGainPct.toFixed(0)}% vs baseline
                      </div>
                    </td>

                    {/* Break-Even Volume Uplift Req */}
                    <td className="py-3 px-3 text-right font-mono text-slate-400 hidden xl:table-cell">
                      <div className="font-medium text-slate-300">
                        {item.breakEvenVolumeMultiplier.toFixed(2)}x
                      </div>
                      <div className="text-[10px] text-slate-500">
                        to equal base rev
                      </div>
                    </td>

                    {/* Median Labor Hours */}
                    <td className="py-3 px-3 text-right font-mono text-slate-400 hidden lg:table-cell">
                      <div className="flex items-center justify-end gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{item.workHoursToAfford.toFixed(1)}h</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        median labor
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => handleCopy(e, `${item.country.currencySymbol}${item.formattedLocalPrice} ${item.country.currency}`, item.country.code)}
                          title="Copy formatted price"
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          {copiedCode === item.country.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => onSelectCountry(item)}
                          title="View detailed calculations & Stripe snippet"
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="p-3 bg-slate-950/40 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>
            Showing <strong className="text-white">{sortedCalculations.length}</strong> of {calculations.length} international markets. Click any row for in-depth breakdown & checkout code.
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            Ratio &gt; 1.0x (Net profit expansion)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Ratio &lt; 1.0x (Concession)
          </span>
        </div>
      </div>
    </div>
  );
};
