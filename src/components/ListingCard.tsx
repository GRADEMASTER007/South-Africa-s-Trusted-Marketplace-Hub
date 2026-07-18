import React from 'react';
import { MapPin, Tag, Eye, MessageSquare, ShieldCheck, Heart, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Listing } from '../types';

interface ListingCardProps {
  key?: string | number;
  listing: Listing;
  onClick: (listing: Listing) => void;
  onToggleSaved?: (id: string, e: React.MouseEvent) => void;
  isSaved?: boolean;
}

export default function ListingCard({ listing, onClick, onToggleSaved, isSaved = false }: ListingCardProps) {
  const getPriceTrend = () => {
    if (!listing.priceHistory || listing.priceHistory.length <= 1) return null;
    const original = listing.priceHistory[0].price;
    const current = listing.price;
    if (current < original) {
      const pct = Math.round(((original - current) / original) * 100);
      return { type: 'down', percent: pct };
    }
    if (current > original) {
      const pct = Math.round(((current - original) / original) * 100);
      return { type: 'up', percent: pct };
    }
    return null;
  };

  const trend = getPriceTrend();

  const isPremium = listing.packageType === 'premium';
  const isStarter = listing.packageType === 'starter';
  const isBusiness = listing.packageType === 'business';
  const isFeatured = isPremium || isStarter || isBusiness;

  const getBadgeColor = () => {
    if (isPremium) return 'bg-gradient-to-r from-natural-amber to-amber-700 text-white border-natural-amber/50';
    if (isBusiness) return 'bg-natural-amber/95 text-white border-natural-amber-hover/50';
    if (isStarter) return 'bg-natural-green text-white border-natural-green/30';
    return 'bg-natural-cream text-natural-text border-natural-border';
  };

  const getCardBorder = () => {
    if (isPremium) return 'ring-2 ring-natural-amber shadow-xl border-natural-amber/30';
    if (isBusiness) return 'ring-1.5 ring-natural-amber/30 shadow-lg border-natural-amber/20';
    if (isStarter) return 'ring-1.5 ring-natural-green/30 shadow-md border-natural-green/20';
    return 'border-natural-border hover:shadow-lg';
  };

  return (
    <div
      id={`listing-card-${listing.id}`}
      onClick={() => onClick(listing)}
      className={`relative bg-natural-bg rounded-2xl border overflow-hidden flex flex-col group cursor-pointer transition-all duration-300 hover:-translate-y-1 ${getCardBorder()}`}
    >
      {/* Featured Banner Accent */}
      {isPremium && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-natural-amber via-amber-500 to-natural-amber z-10" />
      )}

      {/* Image Container */}
      <div className="relative aspect-4/3 w-full bg-natural-cream overflow-hidden">
        <img
          src={listing.images?.[0] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=60'}
          alt={listing.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Condition & Package Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-xs">
            {listing.condition}
          </span>
          {isFeatured && (
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border flex items-center gap-1 shadow-sm backdrop-blur-xs ${getBadgeColor()}`}>
              <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
              {listing.packageType}
            </span>
          )}
        </div>

        {/* Saved Listings Toggle */}
        {onToggleSaved && (
          <button
            onClick={(e) => onToggleSaved(listing.id, e)}
            className="absolute top-3 right-3 p-2 bg-natural-bg/90 hover:bg-natural-bg rounded-full text-red-500 shadow-md transition-all duration-300 hover:scale-110 cursor-pointer z-10"
          >
            <Heart className={`w-4 h-4 transition-all ${isSaved ? 'fill-red-500 text-red-500' : 'text-natural-dusty hover:text-red-500'}`} />
          </button>
        )}

        {/* Pricing tag */}
        <div className="absolute bottom-3 left-3 bg-natural-green text-white px-3 py-1.5 rounded-xl font-extrabold text-sm shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-natural-green/20">
          <span>R {listing.price.toLocaleString('en-ZA')}</span>
          {listing.isNegotiable && (
            <span className="text-[9px] text-yellow-300 font-bold uppercase">Neg</span>
          )}
          {trend && (
            <span 
              className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                trend.type === 'down' 
                  ? 'bg-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/30 text-rose-300'
              }`}
              title={`Original: R${listing.priceHistory?.[0].price.toLocaleString('en-ZA')}`}
            >
              {trend.type === 'down' ? (
                <TrendingDown className="w-2.5 h-2.5 shrink-0" />
              ) : (
                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
              )}
              {trend.percent}%
            </span>
          )}
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-natural-text">
        <div className="space-y-1.5">
          {/* Subcategory */}
          <span className="text-[10px] font-bold text-natural-green uppercase tracking-wider">
            {listing.category} &bull; {listing.subcategory}
          </span>
          {/* Title */}
          <h4 className="font-serif font-bold text-natural-text text-sm line-clamp-1 group-hover:text-natural-green-hover transition-colors">
            {listing.title}
          </h4>
          {/* Description Snippet */}
          <p className="text-xs text-natural-muted line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-natural-border">
          {/* Location details */}
          <div className="flex items-center gap-1.5 text-natural-muted text-[11px] font-medium">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="line-clamp-1">{listing.suburb}, {listing.city} ({listing.province})</span>
          </div>

          {/* User badge and views */}
          <div className="flex items-center justify-between text-[10px] text-natural-dusty font-medium">
            <div className="flex items-center gap-1.5">
              <img 
                src={listing.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}
                alt={listing.userName}
                className="w-5 h-5 rounded-full border border-natural-border"
              />
              <span className="line-clamp-1 text-natural-muted max-w-[80px]">{listing.userName}</span>
              {listing.hasLogo && (
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" title="Verified business seller" />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                {listing.viewCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
