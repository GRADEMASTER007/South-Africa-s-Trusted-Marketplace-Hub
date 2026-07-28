import React, { useState } from 'react';

interface DualRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  priceMin: string;
  setPriceMin: (val: string) => void;
  priceMax: string;
  setPriceMax: (val: string) => void;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min = 0,
  max = 250000,
  step = 1000,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
}) => {
  const [isDraggingMin, setIsDraggingMin] = useState(false);
  const [isDraggingMax, setIsDraggingMax] = useState(false);
  const [isHoverMin, setIsHoverMin] = useState(false);
  const [isHoverMax, setIsHoverMax] = useState(false);

  // Convert current state values to numeric values for slider thumbs
  const currentMin = priceMin !== '' ? Math.max(min, Math.min(Number(priceMin), max)) : min;
  const currentMax = priceMax !== '' ? Math.max(min, Math.min(Number(priceMax), max)) : max;

  const minPercent = Math.min(100, Math.max(0, Math.round(((currentMin - min) / (max - min)) * 100)));
  const maxPercent = Math.min(100, Math.max(0, Math.round(((currentMax - min) / (max - min)) * 100)));

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), currentMax - step);
    if (value <= min) {
      setPriceMin('');
    } else {
      setPriceMin(value.toString());
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), currentMin + step);
    if (value >= max) {
      setPriceMax('');
    } else {
      setPriceMax(value.toString());
    }
  };

  // Tooltip visibility check
  const showMinTooltip = isDraggingMin || isHoverMin || isDraggingMax;
  const showMaxTooltip = isDraggingMax || isHoverMax || isDraggingMin;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Embedded scope style for double thumb styling */}
      <style>{`
        .dual-range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background-color: #2e5b3c;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: transform 0.1s ease, background-color 0.15s ease;
        }
        .dual-range-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          background-color: #244830;
        }
        .dual-range-thumb::-webkit-slider-thumb:active {
          transform: scale(1.25);
        }
        .dual-range-thumb::-moz-range-thumb {
          pointer-events: auto;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background-color: #2e5b3c;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: transform 0.1s ease, background-color 0.15s ease;
        }
        .dual-range-thumb::-moz-range-thumb:hover {
          transform: scale(1.15);
          background-color: #244830;
        }
      `}</style>

      {/* Value Badges / Editable Display */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 bg-natural-cream/40 border border-natural-border rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Min</span>
          <div className="flex items-center text-xs font-extrabold text-natural-text">
            <span className="text-natural-dusty mr-0.5">R</span>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
              className="w-16 text-right bg-transparent outline-none font-extrabold text-natural-green focus:border-b focus:border-natural-green"
            />
          </div>
        </div>

        <div className="text-natural-dusty font-bold text-xs shrink-0">–</div>

        <div className="flex-1 bg-natural-cream/40 border border-natural-border rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Max</span>
          <div className="flex items-center text-xs font-extrabold text-natural-text">
            <span className="text-natural-dusty mr-0.5">R</span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Any"
              className="w-16 text-right bg-transparent outline-none font-extrabold text-natural-green focus:border-b focus:border-natural-green"
            />
          </div>
        </div>
      </div>

      {/* Dual Range Track Container */}
      <div className="relative w-full h-10 flex items-center select-none pt-4 pb-1 px-1">
        {/* Floating Tooltip - Min Thumb */}
        <div
          className={`absolute top-0 transition-all duration-150 pointer-events-none z-40 ${
            showMinTooltip || isDraggingMin ? 'opacity-100 scale-100' : 'opacity-85 hover:opacity-100'
          }`}
          style={{
            left: `calc(10px + (${minPercent} / 100) * (100% - 20px))`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-natural-green text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap relative flex items-center gap-0.5">
            <span>R{currentMin.toLocaleString('en-ZA')}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-natural-green rotate-45" />
          </div>
        </div>

        {/* Floating Tooltip - Max Thumb */}
        <div
          className={`absolute top-0 transition-all duration-150 pointer-events-none z-40 ${
            showMaxTooltip || isDraggingMax ? 'opacity-100 scale-100' : 'opacity-85 hover:opacity-100'
          }`}
          style={{
            left: `calc(10px + (${maxPercent} / 100) * (100% - 20px))`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-natural-green text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap relative flex items-center gap-0.5">
            <span>{currentMax >= max && priceMax === '' ? 'R250k+' : `R${currentMax.toLocaleString('en-ZA')}`}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-natural-green rotate-45" />
          </div>
        </div>

        {/* Background Track */}
        <div className="absolute left-1 right-1 h-2.5 bg-natural-border/50 rounded-full" />

        {/* Active Selected Range Highlight */}
        <div
          className="absolute h-2.5 bg-natural-green rounded-full shadow-xs transition-all duration-75"
          style={{
            left: `calc(4px + ${minPercent}% * (1 - 8px / 100))`,
            width: `calc(${maxPercent - minPercent}% * (1 - 8px / 100))`,
          }}
        />

        {/* Min Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMin}
          onChange={handleMinChange}
          onMouseDown={() => setIsDraggingMin(true)}
          onMouseUp={() => setIsDraggingMin(false)}
          onTouchStart={() => setIsDraggingMin(true)}
          onTouchEnd={() => setIsDraggingMin(false)}
          onMouseEnter={() => setIsHoverMin(true)}
          onMouseLeave={() => setIsHoverMin(false)}
          className="dual-range-thumb absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none outline-none z-20"
        />

        {/* Max Input Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMax}
          onChange={handleMaxChange}
          onMouseDown={() => setIsDraggingMax(true)}
          onMouseUp={() => setIsDraggingMax(false)}
          onTouchStart={() => setIsDraggingMax(true)}
          onTouchEnd={() => setIsDraggingMax(false)}
          onMouseEnter={() => setIsHoverMax(true)}
          onMouseLeave={() => setIsHoverMax(false)}
          className="dual-range-thumb absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none outline-none z-30"
        />
      </div>
    </div>
  );
};

export default DualRangeSlider;
