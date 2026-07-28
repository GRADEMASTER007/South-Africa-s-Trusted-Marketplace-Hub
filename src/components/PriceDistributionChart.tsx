import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { BarChart3, ChevronDown, ChevronUp, DollarSign, Tag, TrendingUp, Info } from 'lucide-react';
import { Listing } from '../types';

interface PriceDistributionChartProps {
  listings: Listing[];
  priceMin: string;
  setPriceMin: (val: string) => void;
  priceMax: string;
  setPriceMax: (val: string) => void;
}

interface BucketData {
  rangeLabel: string;
  minVal: number;
  maxVal: number | null; // null means unbounded upper
  count: number;
  avgPriceInBucket: number;
}

export const PriceDistributionChart: React.FC<PriceDistributionChartProps> = ({
  listings,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Compute price statistics & histogram buckets
  const stats = useMemo(() => {
    if (listings.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        median: 0,
        buckets: [] as BucketData[],
      };
    }

    const prices = listings.map((l) => l.price).sort((a, b) => a - b);
    const min = prices[0];
    const max = prices[prices.length - 1];
    const sum = prices.reduce((acc, curr) => acc + curr, 0);
    const avg = Math.round(sum / prices.length);

    const midIdx = Math.floor(prices.length / 2);
    const median = prices.length % 2 !== 0 ? prices[midIdx] : Math.round((prices[midIdx - 1] + prices[midIdx]) / 2);

    // Dynamic bucket thresholds based on current listing max price
    let bucketRanges: { label: string; min: number; max: number | null }[] = [];

    if (max <= 5000) {
      bucketRanges = [
        { label: '< R500', min: 0, max: 500 },
        { label: 'R500-R1k', min: 500, max: 1000 },
        { label: 'R1k-R2k', min: 1000, max: 2000 },
        { label: 'R2k-R3.5k', min: 2000, max: 3500 },
        { label: 'R3.5k-R5k', min: 3500, max: 5000 },
        { label: 'R5k+', min: 5000, max: null },
      ];
    } else if (max <= 50000) {
      bucketRanges = [
        { label: '< R2.5k', min: 0, max: 2500 },
        { label: 'R2.5k-R5k', min: 2500, max: 5000 },
        { label: 'R5k-R10k', min: 5000, max: 10000 },
        { label: 'R10k-R20k', min: 10000, max: 20000 },
        { label: 'R20k-R35k', min: 20000, max: 35000 },
        { label: 'R35k-R50k', min: 35000, max: 50000 },
        { label: 'R50k+', min: 50000, max: null },
      ];
    } else if (max <= 500000) {
      bucketRanges = [
        { label: '< R10k', min: 0, max: 10000 },
        { label: 'R10k-R25k', min: 10000, max: 25000 },
        { label: 'R25k-R50k', min: 25000, max: 50000 },
        { label: 'R50k-R100k', min: 50000, max: 100000 },
        { label: 'R100k-R250k', min: 100000, max: 250000 },
        { label: 'R250k+', min: 250000, max: null },
      ];
    } else {
      bucketRanges = [
        { label: '< R25k', min: 0, max: 25000 },
        { label: 'R25k-R100k', min: 25000, max: 100000 },
        { label: 'R100k-R300k', min: 100000, max: 300000 },
        { label: 'R300k-R750k', min: 300000, max: 750000 },
        { label: 'R750k-R1.5M', min: 750000, max: 1500000 },
        { label: 'R1.5M+', min: 1500000, max: null },
      ];
    }

    const buckets: BucketData[] = bucketRanges.map((range) => {
      const matched = prices.filter((p) => {
        if (range.max === null) return p >= range.min;
        return p >= range.min && p < range.max;
      });
      const bSum = matched.reduce((a, b) => a + b, 0);
      return {
        rangeLabel: range.label,
        minVal: range.min,
        maxVal: range.max,
        count: matched.length,
        avgPriceInBucket: matched.length > 0 ? Math.round(bSum / matched.length) : 0,
      };
    });

    return {
      count: listings.length,
      min,
      max,
      avg,
      median,
      buckets,
    };
  }, [listings]);

  if (listings.length === 0) return null;

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: BucketData = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs border border-natural-border shadow-md rounded-xl p-3 text-xs space-y-1">
          <p className="font-extrabold text-natural-text text-xs border-b border-natural-border/60 pb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-natural-green" />
            <span>Range: {data.rangeLabel}</span>
          </p>
          <div className="text-natural-dusty font-medium pt-0.5 space-y-0.5">
            <p>
              Listings Count: <span className="font-extrabold text-natural-green">{data.count}</span>
            </p>
            {data.count > 0 && (
              <p>
                Avg Price: <span className="font-bold text-natural-text">R{data.avgPriceInBucket.toLocaleString('en-ZA')}</span>
              </p>
            )}
          </div>
          <p className="text-[10px] text-natural-muted font-bold italic pt-1 border-t border-natural-border/40">
            Click bar to filter by this price range
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data: BucketData) => {
    const isMinMatching = (priceMin === '' && data.minVal === 0) || priceMin === data.minVal.toString();
    const isMaxMatching = (priceMax === '' && data.maxVal === null) || (data.maxVal !== null && priceMax === data.maxVal.toString());

    if (isMinMatching && isMaxMatching) {
      // Toggle off
      setPriceMin('');
      setPriceMax('');
    } else {
      setPriceMin(data.minVal > 0 ? data.minVal.toString() : '');
      setPriceMax(data.maxVal !== null ? data.maxVal.toString() : '');
    }
  };

  return (
    <div className="bg-natural-cream/30 border border-natural-border/80 rounded-2xl p-4 space-y-3.5 shadow-xs transition-all">
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-natural-green/10 text-natural-green rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-black text-xs uppercase tracking-wide text-natural-text flex items-center gap-1.5">
              <span>Price Distribution Analytics</span>
              <span className="text-[10px] font-sans font-bold bg-natural-green/15 text-natural-green px-2 py-0.5 rounded-full border border-natural-green/20">
                {stats.count} {stats.count === 1 ? 'Ad' : 'Ads'}
              </span>
            </h4>
            <p className="text-[11px] text-natural-muted font-medium">
              Interactive price histogram for current search selection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 text-xs font-bold text-natural-dusty hover:text-natural-green bg-white/70 hover:bg-white border border-natural-border rounded-lg px-2.5 py-1.5 transition-all cursor-pointer shadow-2xs"
          >
            {isCollapsed ? (
              <>
                <span>Show Chart</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Collapse Chart</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-white/80 border border-natural-border/60 rounded-xl p-2">
          <span className="text-[10px] font-bold uppercase text-natural-dusty block">Average Price</span>
          <span className="font-extrabold text-natural-text text-xs">R{stats.avg.toLocaleString('en-ZA')}</span>
        </div>
        <div className="bg-white/80 border border-natural-border/60 rounded-xl p-2">
          <span className="text-[10px] font-bold uppercase text-natural-dusty block">Median Price</span>
          <span className="font-extrabold text-natural-text text-xs">R{stats.median.toLocaleString('en-ZA')}</span>
        </div>
        <div className="bg-white/80 border border-natural-border/60 rounded-xl p-2">
          <span className="text-[10px] font-bold uppercase text-natural-dusty block">Lowest Price</span>
          <span className="font-extrabold text-natural-green text-xs">R{stats.min.toLocaleString('en-ZA')}</span>
        </div>
        <div className="bg-white/80 border border-natural-border/60 rounded-xl p-2">
          <span className="text-[10px] font-bold uppercase text-natural-dusty block">Highest Price</span>
          <span className="font-extrabold text-natural-text text-xs">R{stats.max.toLocaleString('en-ZA')}</span>
        </div>
      </div>

      {/* Recharts Bar Chart Area */}
      {!isCollapsed && (
        <div className="pt-1">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.buckets}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <XAxis
                  dataKey="rangeLabel"
                  tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(46, 91, 60, 0.08)', radius: 8 }} />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                >
                  {stats.buckets.map((entry, index) => {
                    const isMinMatch = (priceMin === '' && entry.minVal === 0) || priceMin === entry.minVal.toString();
                    const isMaxMatch = (priceMax === '' && entry.maxVal === null) || (entry.maxVal !== null && priceMax === entry.maxVal.toString());
                    const isSelected = (priceMin !== '' || priceMax !== '') && isMinMatch && isMaxMatch;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        onClick={() => handleBarClick(entry)}
                        fill={isSelected ? '#1f3e29' : entry.count > 0 ? '#2e5b3c' : '#D1D5DB'}
                        opacity={isSelected ? 1 : entry.count > 0 ? 0.85 : 0.4}
                        className="cursor-pointer hover:opacity-100 transition-opacity"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] font-medium text-natural-muted pt-1 px-1">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-natural-green" />
              <span>Click any bar to quickly isolate that price bracket</span>
            </span>
            {(priceMin || priceMax) && (
              <span className="text-natural-green font-bold">
                Filtered: {priceMin ? `R${Number(priceMin).toLocaleString('en-ZA')}` : 'R0'} – {priceMax ? `R${Number(priceMax).toLocaleString('en-ZA')}` : 'Any'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceDistributionChart;
