import React, { useState } from 'react';
import { PlusCircle, Image, Sparkles, MapPin, Tag, Phone, AlertCircle, Sparkle, Eye, Edit3, ArrowLeft, CheckCircle, Video, MessageCircle, ShieldCheck, Clock, Zap, ExternalLink, Navigation, Search, Loader2, X, Globe } from 'lucide-react';
import { Listing } from '../types';
import { SOUTH_AFRICAN_PROVINCES, CLASSIFIED_CATEGORIES, PRICING_PACKAGES } from '../data/southAfricaData';
import AdCreationAssistant from './AdCreationAssistant';
import YocoPaymentModal from './YocoPaymentModal';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

interface CreateListingProps {
  currentUser: any;
  onAdPublished: () => void;
  onCancel: () => void;
}

export default function CreateListing({ currentUser, onAdPublished, onCancel }: CreateListingProps) {
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [category, setCategory] = useState('Products');
  const [subcategory, setSubcategory] = useState('Electronics');
  const [province, setProvince] = useState('Gauteng');
  const [city, setCity] = useState('Johannesburg');
  const [suburb, setSuburb] = useState('');
  const [condition, setCondition] = useState<'new' | 'used' | 'refurbished'>('used');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');

  // Google Maps Places Auto-Complete & Geolocation state
  const [addressSearch, setAddressSearch] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{
    description: string;
    lat: number;
    lng: number;
    suburb?: string;
    city?: string;
    province?: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Popular SA landmarks for instant suggestions fallback
  const SA_LANDMARKS = [
    { description: 'Sandton City, Sandton, Johannesburg, Gauteng', lat: -26.1075, lng: 28.0528, suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng' },
    { description: 'Menlyn Park, Menlyn, Pretoria, Gauteng', lat: -25.7828, lng: 28.2750, suburb: 'Menlyn', city: 'Pretoria', province: 'Gauteng' },
    { description: 'V&A Waterfront, Sea Point, Cape Town, Western Cape', lat: -33.9036, lng: 18.4206, suburb: 'V&A Waterfront', city: 'Cape Town', province: 'Western Cape' },
    { description: 'Gateway Theatre of Shopping, Umhlanga, Durban, KwaZulu-Natal', lat: -29.7258, lng: 31.0664, suburb: 'Umhlanga', city: 'Durban', province: 'KwaZulu-Natal' },
    { description: 'Centurion Mall, Centurion, Gauteng', lat: -25.8600, lng: 28.1889, suburb: 'Centurion Central', city: 'Centurion', province: 'Gauteng' },
    { description: 'Loch Logan Waterfront, Bloemfontein, Free State', lat: -29.1130, lng: 26.2120, suburb: 'Westdene', city: 'Bloemfontein', province: 'Free State' },
    { description: 'Boardwalk Mall, Summerstrand, Gqeberha, Eastern Cape', lat: -33.9820, lng: 25.6580, suburb: 'Summerstrand', city: 'Gqeberha (Port Elizabeth)', province: 'Eastern Cape' }
  ];

  // Address search change with Google Maps Places / Geocoding predictions
  const handleAddressInputChange = async (val: string) => {
    setAddressSearch(val);
    setIsAddressVerified(false);

    if (!val.trim() || val.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    setShowSuggestions(true);

    try {
      // 1. Try Google Maps Places Autocomplete if available on window
      if ((window as any).google?.maps?.places) {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: val, componentRestrictions: { country: 'za' } },
          (predictions: any[], status: any) => {
            if (status === 'OK' && predictions) {
              const geocoder = new (window as any).google.maps.Geocoder();
              const results: any[] = [];
              let processed = 0;
              predictions.slice(0, 5).forEach((pred) => {
                geocoder.geocode({ placeId: pred.place_id }, (geoRes: any[], geoStatus: any) => {
                  processed++;
                  if (geoStatus === 'OK' && geoRes?.[0]) {
                    const loc = geoRes[0].geometry.location;
                    results.push({
                      description: pred.description,
                      lat: loc.lat(),
                      lng: loc.lng()
                    });
                  }
                  if (processed === Math.min(predictions.length, 5)) {
                    setAddressSuggestions(results);
                    setIsSearchingAddress(false);
                  }
                });
              });
              return;
            }
          }
        );
      }

      // 2. Fallback query to OpenStreetMap Nominatim for South Africa addresses
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=za&q=${encodeURIComponent(val)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const fetched = data.map((item: any) => ({
            description: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }));
          setAddressSuggestions(fetched);
          setIsSearchingAddress(false);
          return;
        }
      }

      // 3. Filter local SA landmarks if online API yields few results
      const filteredLandmarks = SA_LANDMARKS.filter(l => 
        l.description.toLowerCase().includes(val.toLowerCase()) ||
        l.suburb.toLowerCase().includes(val.toLowerCase()) ||
        l.city.toLowerCase().includes(val.toLowerCase())
      );
      setAddressSuggestions(filteredLandmarks.length > 0 ? filteredLandmarks : SA_LANDMARKS.slice(0, 4));
    } catch {
      const filteredLandmarks = SA_LANDMARKS.filter(l => 
        l.description.toLowerCase().includes(val.toLowerCase())
      );
      setAddressSuggestions(filteredLandmarks.length > 0 ? filteredLandmarks : SA_LANDMARKS.slice(0, 4));
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleSelectAddressSuggestion = (item: {
    description: string;
    lat: number;
    lng: number;
    suburb?: string;
    city?: string;
    province?: string;
  }) => {
    setAddressSearch(item.description);
    setLatitude(item.lat);
    setLongitude(item.lng);
    setIsAddressVerified(true);
    setShowSuggestions(false);

    if (item.suburb) setSuburb(item.suburb);
    if (item.city) setCity(item.city);
    if (item.province) setProvince(item.province);

    const parts = item.description.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      if (!item.suburb && parts[0]) setSuburb(parts[0]);
      if (!item.city && parts[1]) setCity(parts[1]);
    }
  };

  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsSearchingAddress(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setIsAddressVerified(true);
        setIsSearchingAddress(false);
        setAddressSearch(`GPS Location (${lat.toFixed(4)}°S, ${lng.toFixed(4)}°E)`);
      },
      (err) => {
        setIsSearchingAddress(false);
        alert(`Could not fetch GPS location: ${err.message}. Please search for your address manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  
  // Custom image urls
  const [imageUrl1, setImageUrl1] = useState('');
  const [imageUrl2, setImageUrl2] = useState('');
  const [imageUrl3, setImageUrl3] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Package & Payments
  const [selectedPackage, setSelectedPackage] = useState<'free' | 'starter' | 'business' | 'premium'>('free');
  const [isYocoOpen, setIsYocoOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview Mode State
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);

  // Selected province cities
  const selectedProvinceData = SOUTH_AFRICAN_PROVINCES.find(p => p.name === province);
  const citiesList = selectedProvinceData ? selectedProvinceData.majorCities : [];

  // Selected category subcategories
  const selectedCategoryData = CLASSIFIED_CATEGORIES.find(c => c.name === category);
  const subcategoriesList = selectedCategoryData ? selectedCategoryData.subcategories : [];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCategory(val);
    const catData = CLASSIFIED_CATEGORIES.find(c => c.name === val);
    if (catData && catData.subcategories.length > 0) {
      setSubcategory(catData.subcategories[0]);
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setProvince(val);
    const provData = SOUTH_AFRICAN_PROVINCES.find(p => p.name === val);
    if (provData && provData.majorCities.length > 0) {
      setCity(provData.majorCities[0]);
    }
  };

  // Callback from Gemini AI Assistant
  const handleApplyAiSuggestions = (suggestions: {
    title: string;
    description: string;
    category: string;
    subcategory: string;
    suggestedPrice: number;
    keywords: string;
  }) => {
    setTitle(suggestions.title);
    setDescription(suggestions.description);
    setCategory(suggestions.category);
    setSubcategory(suggestions.subcategory);
    if (suggestions.suggestedPrice > 0) {
      setPrice(suggestions.suggestedPrice.toString());
    }
  };

  const handlePublishListing = async (referenceNum: string = "FREE") => {
    setIsLoading(true);
    setError(null);

    // Collect images
    const imagesArray = [
      imageUrl1.trim(),
      imageUrl2.trim(),
      imageUrl3.trim()
    ].filter(url => url !== '');

    // Fallback if no image specified
    if (imagesArray.length === 0) {
      imagesArray.push('https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=60');
    }

    // Set expiry
    let expiryDays = 30;
    if (selectedPackage === 'starter') expiryDays = 45;
    if (selectedPackage === 'business') expiryDays = 60;
    if (selectedPackage === 'premium') expiryDays = 90;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const priceValue = parseFloat(price) || 0;

    // Call server AI fraud auditor first to keep listings clean
    let listingStatus: 'active' | 'pending_approval' = 'active';
    try {
      const fraudRes = await fetch('/api/ai/fraud-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, price: priceValue })
      });
      const fraudData = await fraudRes.json();
      if (fraudData.riskLevel === 'high') {
        listingStatus = 'pending_approval';
        alert("Notice: Our Gemini AI safety auditor flagged potential high-risk keywords in your listing. It will be placed in pending admin review before going live.");
      }
    } catch {
      listingStatus = 'active';
    }

    const newAd: Omit<Listing, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      price: priceValue,
      isNegotiable,
      category,
      subcategory,
      province,
      city,
      suburb: suburb.trim() || city,
      condition,
      contactPhone: contactPhone.trim(),
      whatsAppNumber: whatsAppNumber.trim(),
      images: imagesArray,
      videoUrl: videoUrl.trim() || undefined,
      packageType: selectedPackage,
      status: listingStatus,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Seller',
      userPhoto: currentUser.photoURL || '',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isFeatured: selectedPackage !== 'free',
      viewCount: 0,
      latitude: latitude !== null ? latitude : (selectedProvinceData?.name === 'Gauteng' ? -26.204 : -33.924),
      longitude: longitude !== null ? longitude : (selectedProvinceData?.name === 'Gauteng' ? 28.047 : 18.424),
      priceHistory: [{ price: priceValue, date: new Date().toISOString() }]
    };

    try {
      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "listings"), newAd);
      } else {
        const local = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
        local.push({ id: Math.random().toString(36).substring(2, 9), ...newAd });
        localStorage.setItem('samarket_listings', JSON.stringify(local));
      }

      onAdPublished();
    } catch (err: any) {
      setError(err.message || "Failed to publish listing.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !price.trim() || !contactPhone.trim()) {
      setError("Please fill in all core listing details.");
      return;
    }

    if (selectedPackage !== 'free') {
      // Trigger Yoco Payment Gateway
      setIsYocoOpen(true);
    } else {
      // Free listing publish
      handlePublishListing();
    }
  };

  const currentPackagePrice = PRICING_PACKAGES.find(p => p.id === selectedPackage)?.price || 0;

  // Prepare images for preview mode
  const previewImages = [
    imageUrl1.trim(),
    imageUrl2.trim(),
    imageUrl3.trim()
  ].filter(url => url !== '');
  if (previewImages.length === 0) {
    previewImages.push('https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=60');
  }

  const embedVideo = getYoutubeEmbedUrl(videoUrl);

  return (
    <div id="create-listing-form" className="max-w-5xl mx-auto py-6 px-4 space-y-8 animate-fade-in">
      
      {/* Form Header with Edit / Live Preview Switcher */}
      <div className="flex flex-wrap justify-between items-center border-b border-natural-border pb-4 gap-3">
        <div>
          <h2 className="text-2xl font-serif font-black text-natural-text tracking-tight">
            {showPreview ? 'Advertisement Preview' : 'Create Advertisement'}
          </h2>
          <p className="text-xs text-natural-muted">
            {showPreview
              ? 'Review how buyers across South Africa will see your listing before posting'
              : 'Post your classified product, service, vehicle, or local business across South Africa'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle pill */}
          <div className="bg-natural-cream/60 p-1 rounded-xl border border-natural-border flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !showPreview
                  ? 'bg-natural-green text-white shadow-xs'
                  : 'text-natural-dusty hover:text-natural-text'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                showPreview
                  ? 'bg-natural-green text-white shadow-xs'
                  : 'text-natural-dusty hover:text-natural-text'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-bold text-natural-dusty hover:text-natural-text uppercase ml-2 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {showPreview ? (
        /* LIVE PREVIEW MODE */
        <div className="space-y-6 animate-fade-in">
          {/* Top Preview Banner */}
          <div className="bg-natural-cream/40 border border-natural-green/30 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-natural-green/10 text-natural-green rounded-xl">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-black text-sm text-natural-text flex items-center gap-2">
                  <span>Live Listing Preview</span>
                  <span className="text-[10px] font-sans font-bold bg-natural-green/15 text-natural-green px-2 py-0.5 rounded-full uppercase">
                    {selectedPackage === 'free' ? 'Free Standard' : `${selectedPackage} Package`}
                  </span>
                </h3>
                <p className="text-xs text-natural-muted">
                  This mock preview matches your ad's actual appearance on SA Market Hub.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="bg-white hover:bg-natural-cream border border-natural-border text-natural-text font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-natural-dusty" />
                <span>Return to Edit</span>
              </button>

              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isLoading}
                className="bg-natural-green hover:bg-natural-green-hover text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{selectedPackage === 'free' ? 'Confirm & Publish Ad' : `Proceed to Yoco Payment (R${currentPackagePrice})`}</span>
              </button>
            </div>
          </div>

          {/* Main Preview Card Layout */}
          <div className="bg-natural-bg border border-natural-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Image Gallery Preview */}
              <div className="space-y-3">
                <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-natural-cream border border-natural-border group shadow-xs">
                  <img
                    src={previewImages[previewImageIdx] || previewImages[0]}
                    alt={title || 'Listing Preview'}
                    className="w-full h-full object-cover transition-all"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="bg-natural-green text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-xs">
                      {category}
                    </span>
                    <span className="bg-black/60 text-white text-[10px] font-bold capitalize px-2 py-1 rounded-md backdrop-blur-xs">
                      {condition} Condition
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                {previewImages.length > 1 && (
                  <div className="flex items-center gap-2">
                    {previewImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImageIdx(idx)}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          previewImageIdx === idx ? 'border-natural-green ring-2 ring-natural-green/20' : 'border-natural-border opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Embedded Video Preview if available */}
                {embedVideo && (
                  <div className="pt-2">
                    <h5 className="text-[11px] font-bold text-natural-dusty uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-natural-green" />
                      <span>Video Showcase</span>
                    </h5>
                    <div className="aspect-video rounded-xl overflow-hidden border border-natural-border shadow-2xs">
                      <iframe
                        src={embedVideo}
                        title="Listing Video Showcase"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Listing Details & Seller Preview */}
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-xs text-natural-muted font-medium mb-1">
                    <span>{category}</span>
                    <span>&bull;</span>
                    <span>{subcategory}</span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-serif font-black text-natural-text leading-tight">
                    {title || 'Untitled Listing Title'}
                  </h1>
                </div>

                {/* Price & Location */}
                <div className="flex flex-wrap items-baseline gap-3 pb-3 border-b border-natural-border/70">
                  <span className="text-2xl md:text-3xl font-serif font-black text-natural-green">
                    {price ? `R ${Number(price).toLocaleString('en-ZA')}` : 'R 0'}
                  </span>
                  {isNegotiable && (
                    <span className="bg-natural-cream text-natural-dusty text-[10px] font-bold px-2 py-0.5 rounded-md border border-natural-border">
                      Negotiable
                    </span>
                  )}
                  <div className="w-full flex items-center gap-1.5 text-xs text-natural-dusty font-medium pt-1">
                    <MapPin className="w-3.5 h-3.5 text-natural-green shrink-0" />
                    <span>{suburb ? `${suburb}, ` : ''}{city}, {province}</span>
                  </div>
                </div>

                {/* Seller Preview Card */}
                <div className="bg-natural-cream/30 border border-natural-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={currentUser.displayName || 'Seller'}
                      className="w-10 h-10 rounded-full object-cover border border-natural-border shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-natural-text flex items-center gap-1">
                        <span>{currentUser.displayName || 'Seller Name'}</span>
                        <CheckCircle className="w-3.5 h-3.5 text-natural-green" />
                      </h4>
                      <p className="text-[10px] text-natural-muted">Verified South African Seller</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white border border-natural-border rounded-xl p-2.5 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-natural-green shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-natural-muted font-bold block uppercase">Call Seller</span>
                        <span className="text-xs font-bold text-natural-text truncate block">
                          {contactPhone || 'No phone provided'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-natural-border rounded-xl p-2.5 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-natural-muted font-bold block uppercase">WhatsApp</span>
                        <span className="text-xs font-bold text-emerald-700 truncate block">
                          {whatsAppNumber || 'Not available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Package Highlights */}
                <div className="text-xs text-natural-muted space-y-1 bg-white/70 p-3 rounded-xl border border-natural-border/60">
                  <p className="font-bold text-natural-text text-[11px] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-natural-amber" />
                    <span>Package Tier: {selectedPackage.toUpperCase()}</span>
                  </p>
                  <p className="text-[10px] leading-relaxed">
                    {selectedPackage === 'free'
                      ? 'Standard 30-day listing on SA Market Hub.'
                      : `Includes priority search placement & featured carousel highlight.`}
                  </p>
                </div>

              </div>
            </div>

            {/* Description Preview */}
            <div className="pt-4 border-t border-natural-border space-y-2">
              <h3 className="font-serif font-bold text-sm text-natural-text uppercase tracking-wider">Listing Description</h3>
              <div className="text-xs text-natural-text leading-relaxed whitespace-pre-line bg-natural-cream/20 p-4 rounded-2xl border border-natural-border/50">
                {description || 'No description provided yet.'}
              </div>
            </div>

            {/* Bottom Actions in Preview Mode */}
            <div className="pt-4 flex flex-wrap justify-between items-center gap-3 border-t border-natural-border">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="bg-white hover:bg-natural-cream border border-natural-border text-natural-text font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-natural-dusty" />
                <span>Return to Edit Details</span>
              </button>

              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isLoading}
                className="bg-natural-green hover:bg-natural-green-hover disabled:bg-natural-green/50 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{selectedPackage === 'free' ? 'Confirm & Publish Advertisement' : `Proceed to Yoco Payment (R${currentPackagePrice})`}</span>
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* STANDARD EDIT FORM MODE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Core Form Section */}
          <form onSubmit={handleFormSubmit} className="lg:col-span-2 bg-natural-bg rounded-3xl border border-natural-border p-6 md:p-8 shadow-sm space-y-6 text-natural-text">
            
            {error && (
              <div className="text-xs text-red-600 bg-red-50/50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Listing Title *</label>
              <input
                type="text"
                required
                maxLength={70}
                placeholder="e.g. 2018 Toyota Hilux 2.8 GD-6 Bakkie for sale"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green font-medium bg-natural-cream/30 text-natural-text"
              />
            </div>

            {/* Categorization selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                >
                  {CLASSIFIED_CATEGORIES.map(c => (
                    <option key={c.name} value={c.name} className="bg-natural-bg text-natural-text">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Subcategory *</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                >
                  {subcategoriesList.map(sub => (
                    <option key={sub} value={sub} className="bg-natural-bg text-natural-text">{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Google Maps Places Auto-Complete & Geolocation Field */}
            <div className="p-4 bg-natural-cream/40 border border-natural-border rounded-2xl space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <label className="block text-xs font-serif font-black text-natural-text flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-natural-green shrink-0" />
                    <span>Google Maps Address Auto-Complete & Geolocation</span>
                  </label>
                  <p className="text-[11px] text-natural-muted">
                    Type your street address or landmark to pinpoint exact GPS coordinates for map buyers across SA
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUseGpsLocation}
                  className="bg-white hover:bg-natural-cream border border-natural-border text-natural-green font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-natural-green shrink-0" />
                  <span>Use Device GPS</span>
                </button>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-natural-dusty absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search address e.g. 15 Sandton Drive, Johannesburg or Menlyn Mall..."
                    value={addressSearch}
                    onChange={(e) => handleAddressInputChange(e.target.value)}
                    onFocus={() => addressSearch.trim().length >= 2 && setShowSuggestions(true)}
                    className="w-full text-sm border border-natural-border rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green font-medium bg-white text-natural-text"
                  />
                  {addressSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressSearch('');
                        setAddressSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="absolute right-3 text-natural-dusty hover:text-natural-text cursor-pointer p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Auto-complete suggestions dropdown */}
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-natural-border rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-natural-border/60 animate-fade-in">
                    {isSearchingAddress ? (
                      <div className="p-3 text-xs text-natural-dusty flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-natural-green" />
                        <span>Fetching Google Maps predictions...</span>
                      </div>
                    ) : addressSuggestions.length > 0 ? (
                      addressSuggestions.map((item, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectAddressSuggestion(item)}
                          className="w-full text-left p-3 hover:bg-natural-cream/60 transition-colors flex items-start gap-2.5 cursor-pointer"
                        >
                          <MapPin className="w-4 h-4 text-natural-green shrink-0 mt-0.5" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-xs text-natural-text truncate">{item.description}</p>
                            <p className="text-[10px] text-natural-muted font-mono">
                              GPS: {item.lat.toFixed(4)}°S, {item.lng.toFixed(4)}°E
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-natural-dusty text-center">
                        No address predictions found. Select province/city dropdowns below.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Geolocation Verification Badge */}
              {isAddressVerified && latitude !== null && longitude !== null && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Location Verified with Lat/Lng Pinpoint</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <span>Latitude: {latitude.toFixed(5)}</span>
                    <span>|</span>
                    <span>Longitude: {longitude.toFixed(5)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Location cascading dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Province *</label>
                <select
                  value={province}
                  onChange={handleProvinceChange}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                >
                  {SOUTH_AFRICAN_PROVINCES.map(p => (
                    <option key={p.name} value={p.name} className="bg-natural-bg text-natural-text">{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">City / Town *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                >
                  {citiesList.map(c => (
                    <option key={c} value={c} className="bg-natural-bg text-natural-text">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Suburb / Settlement Area</label>
                <input
                  type="text"
                  placeholder="e.g. Pretoria East"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
              </div>
            </div>

            {/* Condition and Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Price (South African Rand) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-natural-dusty text-sm">R</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 145000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full text-sm border border-natural-border rounded-xl pl-8 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green font-bold bg-natural-cream/30 text-natural-text"
                  />
                </div>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-natural-text font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="w-4 h-4 text-natural-green focus:ring-natural-green border-natural-border rounded cursor-pointer"
                  />
                  <span>Price Negotiable (Neg)</span>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Condition *</label>
                <div className="flex gap-1.5 bg-natural-cream/20 p-1 rounded-xl border border-natural-border">
                  {(['new', 'used', 'refurbished'] as const).map(cond => (
                    <button
                      type="button"
                      key={cond}
                      onClick={() => setCondition(cond)}
                      className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-lg cursor-pointer transition-colors ${
                        condition === cond 
                          ? 'bg-natural-green text-white' 
                          : 'text-natural-dusty hover:text-natural-text'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description textarea */}
            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Detailed Ad Description *</label>
              <textarea
                required
                rows={6}
                placeholder="Give specs, reasons for selling, key features, and safe handover meeting details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            {/* Photos image links */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Classified Image URLs</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="url"
                  placeholder="Primary Photo Image Link"
                  value={imageUrl1}
                  onChange={(e) => setImageUrl1(e.target.value)}
                  className="text-xs border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
                <input
                  type="url"
                  placeholder="Photo 2 Link (Optional)"
                  value={imageUrl2}
                  onChange={(e) => setImageUrl2(e.target.value)}
                  className="text-xs border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
                <input
                  type="url"
                  placeholder="Photo 3 Link (Optional)"
                  value={imageUrl3}
                  onChange={(e) => setImageUrl3(e.target.value)}
                  className="text-xs border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
              </div>
            </div>

            {/* Video Link */}
            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Video Tour Link (YouTube or Vimeo) (Optional)</label>
              <input
                type="url"
                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full text-xs border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 082 123 4567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">WhatsApp Chat Link Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +27821234567"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
              </div>
            </div>
          </div>

          {/* Boosting tier packages selection */}
          <div className="pt-4 border-t border-natural-border space-y-4">
            <div>
              <h4 className="font-serif font-bold text-natural-text text-sm">Boost & Feature Your Advertisement</h4>
              <p className="text-[11px] text-natural-dusty">Select an optional upgrade plan. Paid packages are handled securely by Yoco.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {PRICING_PACKAGES.map(pkg => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id as any)}
                  className={`border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all ${
                    selectedPackage === pkg.id 
                      ? 'border-natural-green bg-natural-green/5 ring-2 ring-natural-green' 
                      : 'border-natural-border bg-natural-bg hover:border-natural-muted'
                  }`}
                >
                  <div className="space-y-1">
                    <h5 className="font-serif font-bold text-natural-text text-xs">{pkg.name}</h5>
                    <p className="font-black text-natural-text text-sm">{pkg.priceLabel}</p>
                    <p className="text-[10px] text-natural-muted leading-tight pt-1">{pkg.description}</p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                      selectedPackage === pkg.id ? 'bg-natural-green text-white' : 'bg-natural-cream text-natural-dusty'
                    }`}>
                      {selectedPackage === pkg.id ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex-1 bg-white hover:bg-natural-cream/40 text-natural-text font-bold py-3.5 px-4 rounded-xl border border-natural-border flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-natural-green" />
              <span>Preview Advertisement</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-natural-green hover:bg-natural-green-hover disabled:bg-natural-green/50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-md"
            >
              {selectedPackage === 'free' ? 'Publish Advertisement' : `Proceed to Yoco Payment (R${currentPackagePrice})`}
            </button>
          </div>
        </form>

        {/* Sidebar helper section (AI and safety) */}
        <div className="space-y-6">
          
          {/* Gemini copywriter */}
          <AdCreationAssistant
            draftTitle={title}
            draftDescription={description}
            draftCategory={category}
            onApplySuggestions={handleApplyAiSuggestions}
          />

          {/* Safety tips */}
          <div className="bg-natural-bg border border-natural-border rounded-3xl p-5 space-y-3.5 shadow-xs text-xs text-natural-text">
            <h4 className="font-serif font-bold text-natural-text uppercase tracking-wider text-[10px]">South Africa Security Checklist</h4>
            <ul className="space-y-2 list-disc pl-4 leading-relaxed text-natural-muted">
              <li>Meet in public, well-lit spaces (such as police stations or active shopping center parkings).</li>
              <li>Inspect item condition and verify paperwork thoroughly before releasing any funds.</li>
              <li>Avoid requests for upfront transport deposits or courier fees.</li>
            </ul>
          </div>
        </div>

      </div>
      )}

      {/* Yoco Checkout Integration Modal */}
      {isYocoOpen && (
        <YocoPaymentModal
          isOpen={isYocoOpen}
          onClose={() => setIsYocoOpen(false)}
          packageName={selectedPackage.toUpperCase()}
          amount={currentPackagePrice}
          userId={currentUser.uid}
          userEmail={currentUser.email}
          onPaymentSuccess={(ref) => {
            setIsYocoOpen(false);
            handlePublishListing(ref);
          }}
        />
      )}

    </div>
  );
}
