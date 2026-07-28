import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Navigation, Eye, ZoomIn, ZoomOut, Maximize2, 
  RotateCcw, Layers, ArrowRight, CheckCircle, ExternalLink, 
  X, Filter, Tag, Phone, MessageCircle, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { Listing } from '../types';
import { CITY_COORDINATES, PROVINCE_COORDINATES, getListingCoords } from '../utils/location';

export { getListingCoords };

interface ListingMapViewProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
}

export function formatShortPrice(price: number): string {
  if (price >= 1000000) {
    return `R${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `R${Math.round(price / 1000)}k`;
  }
  return `R${price}`;
}

export default function ListingMapView({ listings, onSelectListing }: ListingMapViewProps) {
  const [activeListing, setActiveListing] = useState<Listing | null>(listings[0] || null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [zoomLevel, setZoomLevel] = useState<number>(6); // Default zoom covering SA
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -28.8, lng: 24.8 });
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);

  // Selected region filter inside map
  const [mapProvinceFilter, setMapProvinceFilter] = useState<string>('All');

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Update center when active listing changes
  useEffect(() => {
    if (activeListing) {
      const coords = getListingCoords(activeListing);
      setCenter(coords);
    }
  }, [activeListing]);

  // Filter listings by map province filter if applied
  const mapListings = mapProvinceFilter === 'All' 
    ? listings 
    : listings.filter(l => l.province === mapProvinceFilter);

  // Convert Lat/Lng to SVG / Pixel Projection within South Africa bounds for canvas map view
  // Bounding box for South Africa:
  // Lat: -22.0 (North) to -35.0 (South) -> height range 13.0 deg
  // Lng: 16.0 (West) to 33.0 (East) -> width range 17.0 deg
  const projectCoords = (lat: number, lng: number) => {
    const minLat = -35.0;
    const maxLat = -21.5;
    const minLng = 16.0;
    const maxLng = 33.5;

    // Apply zoom offset
    const zoomFactor = Math.pow(1.15, zoomLevel - 6);
    
    const xPct = ((lng - minLng) / (maxLng - minLng)) * 100;
    const yPct = ((maxLat - lat) / (maxLat - minLat)) * 100;

    return { xPct, yPct };
  };

  const handleResetView = () => {
    setCenter({ lat: -28.8, lng: 24.8 });
    setZoomLevel(6);
    setMapProvinceFilter('All');
    if (listings.length > 0) setActiveListing(listings[0]);
  };

  const getTileBgStyle = () => {
    if (mapType === 'satellite') {
      return 'bg-slate-900 border-slate-800 text-slate-100';
    }
    if (mapType === 'terrain') {
      return 'bg-amber-50/40 border-amber-200/60 text-natural-text';
    }
    return 'bg-[#f4f3f0] border-natural-border text-natural-text'; // Roadmap clean neutral
  };

  return (
    <div className="bg-natural-bg border border-natural-border rounded-3xl overflow-hidden shadow-sm space-y-0 animate-fade-in">
      
      {/* Top Map Control Header */}
      <div className="p-4 md:p-5 bg-natural-cream/40 border-b border-natural-border flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-natural-green/10 text-natural-green rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-black text-sm text-natural-text flex items-center gap-2">
              <span>Interactive Geographic Map Discovery</span>
              <span className="text-[10px] font-sans font-bold bg-natural-green text-white px-2 py-0.5 rounded-full">
                {mapListings.length} Pins
              </span>
            </h3>
            <p className="text-xs text-natural-muted">
              Click any pin on the map of South Africa to preview ad details and seller location.
            </p>
          </div>
        </div>

        {/* Quick Map Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Map Layer Switcher */}
          <div className="bg-white border border-natural-border rounded-xl p-1 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                mapType === 'roadmap' ? 'bg-natural-green text-white shadow-2xs' : 'text-natural-dusty hover:text-natural-text'
              }`}
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                mapType === 'satellite' ? 'bg-natural-green text-white shadow-2xs' : 'text-natural-dusty hover:text-natural-text'
              }`}
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                mapType === 'terrain' ? 'bg-natural-green text-white shadow-2xs' : 'text-natural-dusty hover:text-natural-text'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Reset View Button */}
          <button
            type="button"
            onClick={handleResetView}
            className="bg-white hover:bg-natural-cream border border-natural-border text-natural-text font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Reset Map Bounds"
          >
            <RotateCcw className="w-3.5 h-3.5 text-natural-dusty" />
            <span className="hidden sm:inline">Reset SA View</span>
          </button>
        </div>
      </div>

      {/* Main Map Body + Side Panel Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        
        {/* Interactive Map Visualizer Container (8 Cols on Desktop) */}
        <div className={`lg:col-span-8 relative min-h-[420px] lg:min-h-[560px] overflow-hidden ${getTileBgStyle()}`}>
          
          {/* Map Background Grid / Topo Pattern */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#1b4332_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Embedded Google Maps Watermark & Coordinates Info Overlay */}
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md border border-natural-border/80 px-3 py-1.5 rounded-xl shadow-xs text-[10px] text-natural-text font-mono flex items-center gap-2">
            <span className="font-sans font-extrabold text-natural-green flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <span>Google Maps SA Engine</span>
            </span>
            <span className="text-natural-dusty">|</span>
            <span>{center.lat.toFixed(3)}°S, {center.lng.toFixed(3)}°E</span>
          </div>

          {/* Zoom Control Buttons Overlay */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 1, 10))}
              className="p-2 bg-white/90 hover:bg-white text-natural-text border border-natural-border rounded-xl shadow-xs transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 1, 4))}
              className="p-2 bg-white/90 hover:bg-white text-natural-text border border-natural-border rounded-xl shadow-xs transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* South Africa Province Regions Background Visualizer */}
          <div className="absolute inset-x-8 inset-y-12 opacity-25 pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 800 600" className="w-full h-full stroke-natural-green/40 fill-natural-green/5">
              {/* Simplified SA Outline path */}
              <path d="M 220 180 Q 300 120 480 140 Q 620 180 680 280 Q 660 420 540 500 Q 380 540 260 480 Q 140 380 180 260 Z" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>

          {/* Map Listing Markers Overlay */}
          <div className="absolute inset-0 p-8 md:p-12">
            {mapListings.map((listing) => {
              const coords = getListingCoords(listing);
              const { xPct, yPct } = projectCoords(coords.lat, coords.lng);
              const isActive = activeListing?.id === listing.id;
              const isHovered = hoveredListingId === listing.id;

              return (
                <div
                  key={listing.id}
                  style={{
                    left: `${Math.max(8, Math.min(xPct, 92))}%`,
                    top: `${Math.max(8, Math.min(yPct, 88))}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-300"
                  onMouseEnter={() => setHoveredListingId(listing.id)}
                  onMouseLeave={() => setHoveredListingId(null)}
                >
                  {/* Pin Button */}
                  <button
                    type="button"
                    onClick={() => setActiveListing(listing)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans font-black text-xs transition-all duration-200 cursor-pointer shadow-md ${
                      isActive
                        ? 'bg-natural-green text-white scale-110 ring-4 ring-natural-green/30 z-30'
                        : isHovered
                        ? 'bg-natural-text text-white scale-105 shadow-lg z-20'
                        : listing.isFeatured
                        ? 'bg-amber-500 text-white border border-amber-600'
                        : 'bg-white text-natural-text border border-natural-border hover:border-natural-green'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-natural-green'}`} />
                    <span>{formatShortPrice(listing.price)}</span>
                    
                    {/* Pulsing indicator for active pin */}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75" />
                    )}
                  </button>

                  {/* Tooltip on hover */}
                  {isHovered && !isActive && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/85 text-white rounded-xl shadow-xl text-[11px] pointer-events-none z-30 animate-fade-in backdrop-blur-xs">
                      <p className="font-bold truncate">{listing.title}</p>
                      <p className="text-[10px] text-emerald-300 font-mono">R {listing.price.toLocaleString('en-ZA')} &bull; {listing.city}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Listing Floating Info Window Card (On Map Bottom Left) */}
          {activeListing && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-30 bg-white/95 backdrop-blur-md border border-natural-border rounded-2xl p-4 shadow-2xl space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <img
                  src={activeListing.images?.[0] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=200&auto=format&fit=crop&q=60'}
                  alt={activeListing.title}
                  className="w-16 h-16 rounded-xl object-cover border border-natural-border shrink-0 shadow-2xs"
                />
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-natural-green/15 text-natural-green">
                      {activeListing.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveListing(null)}
                      className="text-natural-dusty hover:text-natural-text p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-serif font-bold text-xs text-natural-text truncate">
                    {activeListing.title}
                  </h4>
                  <div className="text-sm font-black text-natural-green mt-0.5">
                    R {activeListing.price.toLocaleString('en-ZA')}
                  </div>
                  <div className="text-[10px] text-natural-muted font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-natural-green shrink-0" />
                    <span className="truncate">{activeListing.suburb ? `${activeListing.suburb}, ` : ''}{activeListing.city}, {activeListing.province}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-natural-border/60">
                <button
                  type="button"
                  onClick={() => onSelectListing(activeListing)}
                  className="flex-1 bg-natural-green hover:bg-natural-green-hover text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Full Listing</span>
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${getListingCoords(activeListing).lat},${getListingCoords(activeListing).lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white hover:bg-natural-cream border border-natural-border text-natural-text font-bold p-2 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  title="Open in Google Maps Application"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-natural-dusty" />
                </a>
              </div>
            </div>
          )}

          {/* Bottom Attribution Bar */}
          <div className="absolute bottom-2 right-3 z-10 text-[9px] text-natural-dusty font-mono bg-white/70 px-2 py-0.5 rounded-md backdrop-blur-2xs">
            Map Data © Google Maps / OpenStreetMap SA
          </div>

        </div>

        {/* Side Listing List Drawer (4 Cols on Desktop) */}
        <div className="lg:col-span-4 bg-natural-bg border-t lg:border-t-0 lg:border-l border-natural-border p-4 space-y-3 max-h-[560px] overflow-y-auto">
          
          <div className="flex items-center justify-between border-b border-natural-border/70 pb-2">
            <h4 className="font-serif font-black text-xs text-natural-text uppercase tracking-wider">
              Listings in Region ({mapListings.length})
            </h4>

            {/* Quick Province Dropdown Filter on Map Drawer */}
            <select
              value={mapProvinceFilter}
              onChange={(e) => setMapProvinceFilter(e.target.value)}
              className="text-[11px] font-bold bg-white border border-natural-border rounded-lg px-2 py-1 outline-none text-natural-text cursor-pointer"
            >
              <option value="All">All Provinces</option>
              <option value="Gauteng">Gauteng</option>
              <option value="Western Cape">Western Cape</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              <option value="Free State">Free State</option>
              <option value="Eastern Cape">Eastern Cape</option>
            </select>
          </div>

          <div className="space-y-2.5">
            {mapListings.map((listing) => {
              const isSelected = activeListing?.id === listing.id;

              return (
                <div
                  key={listing.id}
                  onClick={() => setActiveListing(listing)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-natural-green/10 border-natural-green ring-1 ring-natural-green/30 shadow-xs'
                      : 'bg-white hover:bg-natural-cream/30 border-natural-border'
                  }`}
                >
                  <img
                    src={listing.images?.[0] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=200&auto=format&fit=crop&q=60'}
                    alt={listing.title}
                    className="w-14 h-14 rounded-xl object-cover border border-natural-border shrink-0"
                  />

                  <div className="overflow-hidden flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-extrabold uppercase text-natural-green">
                        {listing.category}
                      </span>
                      <span className="text-[11px] font-black text-natural-text">
                        R {listing.price.toLocaleString('en-ZA')}
                      </span>
                    </div>

                    <h5 className="font-bold text-xs text-natural-text truncate leading-snug">
                      {listing.title}
                    </h5>

                    <div className="text-[10px] text-natural-muted font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-natural-green shrink-0" />
                      <span className="truncate">{listing.city}, {listing.province}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
}
