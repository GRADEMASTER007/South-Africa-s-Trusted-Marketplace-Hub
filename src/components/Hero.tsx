import React, { useState, useEffect } from 'react';
import { Search, MapPin, Tag, Landmark, Sparkles, Car, Home, Wrench, Briefcase, Compass, ShoppingBag, SlidersHorizontal, Clock, X } from 'lucide-react';
import { SOUTH_AFRICAN_PROVINCES, CLASSIFIED_CATEGORIES } from '../data/southAfricaData';
import DualRangeSlider from './DualRangeSlider';

interface HeroProps {
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;
  selectedProvince: string;
  setSelectedProvince: (val: string) => void;
  selectedCity: string;
  setSelectedCity: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (val: string) => void;
  priceMin: string;
  setPriceMin: (val: string) => void;
  priceMax: string;
  setPriceMax: (val: string) => void;
  availableCities: string[];
  availableSubcategories: string[];
  onPostAd: () => void;
}

export default function Hero({
  searchKeyword,
  setSearchKeyword,
  selectedProvince,
  setSelectedProvince,
  selectedCity,
  setSelectedCity,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  availableCities,
  availableSubcategories,
  onPostAd
}: HeroProps) {

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_classified_searches');
      return saved ? JSON.parse(saved) : ['Toyota Hilux', 'Campground', 'Farm Equipment'];
    } catch {
      return ['Toyota Hilux', 'Campground', 'Farm Equipment'];
    }
  });

  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 3);
      try {
        localStorage.setItem('recent_classified_searches', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== termToRemove);
      try {
        localStorage.setItem('recent_classified_searches', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!searchKeyword || searchKeyword.trim().length < 2) return;
    const timer = setTimeout(() => {
      addRecentSearch(searchKeyword);
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag': return ShoppingBag;
      case 'Car': return Car;
      case 'Home': return Home;
      case 'Wrench': return Wrench;
      case 'Briefcase': return Briefcase;
      case 'Compass': return Compass;
      default: return ShoppingBag;
    }
  };

  return (
    <div id="hero-banner" className="bg-gradient-to-br from-natural-green via-natural-green-hover to-[#1a3817] text-white relative overflow-hidden py-10 md:py-14 px-4 border-b border-natural-border shadow-md">
      
      {/* Background Graphic Accents */}
      <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200&auto=format&fit=crop&q=80')" }} />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-natural-amber/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-natural-green/20 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Welcome Tagline */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-natural-amber/20 text-natural-amber px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-4 h-4 text-natural-amber animate-pulse" />
            <span>AI-Powered Classifieds</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight leading-tight text-white">
            South Africa's Trusted Marketplace Hub
          </h2>
          <p className="text-natural-cream/90 text-xs md:text-sm leading-relaxed max-w-lg mx-auto">
            Buy, sell, rent properties, search local plumbers, list farming tractors, and discover campgrounds using normal or AI smart search!
          </p>
        </div>

        {/* SEARCH BOX FILTERS PANEL */}
        <div className="bg-natural-bg rounded-3xl border border-natural-border p-5 md:p-6 shadow-2xl space-y-4 max-w-5xl mx-auto text-natural-text">
          
          {/* Row 1: Keyword, Province, City */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            {/* Keyword Search */}
            <div className="relative">
              <span className="absolute left-3 top-3"><Search className="w-4 h-4 text-natural-dusty" /></span>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onBlur={(e) => addRecentSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addRecentSearch(searchKeyword);
                  }
                }}
                placeholder="What are you searching for today, boet?"
                className="w-full text-xs border border-natural-border rounded-xl pl-9 pr-3 py-3 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green font-medium bg-natural-cream/30 text-natural-text"
              />
            </div>

            {/* Province selection */}
            <div className="relative">
              <span className="absolute left-3 top-3"><MapPin className="w-4 h-4 text-natural-amber" /></span>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full text-xs border border-natural-border rounded-xl pl-9 pr-3 py-3 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text font-medium appearance-none"
              >
                <option value="All Provinces">All Provinces (South Africa)</option>
                {SOUTH_AFRICAN_PROVINCES.map(p => (
                  <option key={p.name} value={p.name} className="text-natural-text bg-natural-bg">{p.name}</option>
                ))}
              </select>
            </div>

            {/* City selection (dependent on selected province) */}
            <div className="relative">
              <span className="absolute left-3 top-3"><Landmark className="w-4 h-4 text-natural-dusty" /></span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={selectedProvince === 'All Provinces'}
                className="w-full text-xs border border-natural-border rounded-xl pl-9 pr-3 py-3 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 disabled:bg-natural-bg disabled:text-natural-muted text-natural-text font-medium appearance-none"
              >
                <option value="All Cities">All Cities / Towns</option>
                {availableCities.map(city => (
                  <option key={city} value={city} className="text-natural-text bg-natural-bg">{city}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Recent Searches Pills */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5 pb-1">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-natural-dusty uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-natural-amber" />
                <span>Recent Searches:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {recentSearches.map((term) => {
                  const isActive = searchKeyword.toLowerCase() === term.toLowerCase();
                  return (
                    <div
                      key={term}
                      onClick={() => setSearchKeyword(term)}
                      className={`group flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-natural-green text-white border-natural-green shadow-xs'
                          : 'bg-natural-cream/50 text-natural-text border-natural-border hover:bg-natural-cream hover:border-natural-green/50'
                      }`}
                    >
                      <span>{term}</span>
                      <button
                        type="button"
                        onClick={(e) => removeRecentSearch(e, term)}
                        title="Remove from recent searches"
                        className="opacity-50 hover:opacity-100 hover:text-red-500 rounded-full p-0.5 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setRecentSearches([]);
                    try { localStorage.removeItem('recent_classified_searches'); } catch {}
                  }}
                  className="text-[10px] text-natural-muted hover:text-red-500 font-bold hover:underline ml-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Row 2: Category & Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            
            {/* Category */}
            <div className="relative">
              <span className="absolute left-3 top-3"><Tag className="w-4 h-4 text-natural-dusty" /></span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs border border-natural-border rounded-xl pl-9 pr-3 py-3 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text font-medium appearance-none cursor-pointer"
              >
                <option value="All Categories">All Categories</option>
                {CLASSIFIED_CATEGORIES.map(c => (
                  <option key={c.name} value={c.name} className="text-natural-text bg-natural-bg">{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subcategory (dependent) */}
            <div className="relative">
              <span className="absolute left-3 top-3"><Tag className="w-4 h-4 text-natural-dusty/40" /></span>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                disabled={selectedCategory === 'All Categories'}
                className="w-full text-xs border border-natural-border rounded-xl pl-9 pr-3 py-3 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 disabled:bg-natural-bg disabled:text-natural-muted text-natural-text font-medium appearance-none cursor-pointer"
              >
                <option value="All Subcategories">All Subcategories</option>
                {availableSubcategories.map(sub => (
                  <option key={sub} value={sub} className="text-natural-text bg-natural-bg">{sub}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Interactive Dual-Range Slider & Price Filter Section */}
          <div className="pt-2 border-t border-natural-border/60 flex flex-col gap-2.5 bg-natural-cream/20 p-3.5 rounded-2xl">
            <div className="flex justify-between items-center text-[11px] font-bold text-natural-dusty">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-natural-green" />
                <span>Dual-Range Price Filter:</span>
                <span className="text-natural-green font-extrabold">
                  {!priceMin && !priceMax && "Any Price (All Listings)"}
                  {priceMin && !priceMax && `From R${Number(priceMin).toLocaleString('en-ZA')}+`}
                  {!priceMin && priceMax && `Up to R${Number(priceMax).toLocaleString('en-ZA')}`}
                  {priceMin && priceMax && `R${Number(priceMin).toLocaleString('en-ZA')} – R${Number(priceMax).toLocaleString('en-ZA')}`}
                </span>
              </span>
              {(priceMin || priceMax) && (
                <button
                  type="button"
                  onClick={() => { setPriceMin(''); setPriceMax(''); }}
                  className="text-[10px] text-red-500 hover:underline font-bold cursor-pointer"
                >
                  Clear Price
                </button>
              )}
            </div>

            {/* Dual Range Slider */}
            <DualRangeSlider
              min={0}
              max={250000}
              step={2500}
              priceMin={priceMin}
              setPriceMin={setPriceMin}
              priceMax={priceMax}
              setPriceMax={setPriceMax}
            />

            {/* Range Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-natural-muted font-medium">Quick Presets:</span>
              {[
                { label: 'Under R1k', min: '', max: '1000' },
                { label: 'R1k - R10k', min: '1000', max: '10000' },
                { label: 'R10k - R50k', min: '10000', max: '50000' },
                { label: 'R50k - R200k', min: '50000', max: '200000' },
                { label: 'R200k+', min: '200000', max: '' },
              ].map(preset => {
                const isActive = priceMin === preset.min && priceMax === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setPriceMin('');
                        setPriceMax('');
                      } else {
                        setPriceMin(preset.min);
                        setPriceMax(preset.max);
                      }
                    }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-natural-green text-white border-natural-green shadow-xs'
                        : 'bg-natural-bg text-natural-text border-natural-border hover:bg-natural-cream hover:border-natural-green/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick reset actions */}
          <div className="flex justify-between items-center pt-1 text-[11px] font-bold text-natural-dusty">
            <button
              onClick={() => {
                setSearchKeyword('');
                setSelectedProvince('All Provinces');
                setSelectedCity('All Cities');
                setSelectedCategory('All Categories');
                setSelectedSubcategory('All Subcategories');
                setPriceMin('');
                setPriceMax('');
              }}
              className="hover:text-natural-green cursor-pointer text-left transition-colors"
            >
              Clear all filters
            </button>
            <span className="text-natural-muted hidden sm:inline">| Tip: Try our AI assistant chatbot in the bottom corner for smart natural searches!</span>
          </div>

        </div>

        {/* HORIZONTAL CATEGORIES QUICK SELECTORS (Bento Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          {CLASSIFIED_CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            const isSelected = selectedCategory === cat.name;
            return (
              <div
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(isSelected ? 'All Categories' : cat.name);
                  setSelectedSubcategory('All Subcategories');
                }}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all duration-300 hover:scale-[1.03] ${
                  isSelected 
                    ? 'bg-natural-amber text-white border border-natural-amber/50 shadow-md font-bold' 
                    : 'bg-natural-cream/10 border border-natural-cream/20 hover:bg-natural-cream/20 text-white'
                }`}
              >
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-natural-amber/70' : 'bg-natural-green/40'}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">{cat.name}</span>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
