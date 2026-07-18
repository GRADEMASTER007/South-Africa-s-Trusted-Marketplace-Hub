import React, { useState } from 'react';
import { PlusCircle, Image, Sparkles, MapPin, Tag, Phone, AlertCircle, Sparkle } from 'lucide-react';
import { Listing } from '../types';
import { SOUTH_AFRICAN_PROVINCES, CLASSIFIED_CATEGORIES, PRICING_PACKAGES } from '../data/southAfricaData';
import AdCreationAssistant from './AdCreationAssistant';
import YocoPaymentModal from './YocoPaymentModal';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

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
      latitude: selectedProvinceData?.name === 'Gauteng' ? -26.204 : -33.924,
      longitude: selectedProvinceData?.name === 'Gauteng' ? 28.047 : 18.424,
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

  return (
    <div id="create-listing-form" className="max-w-5xl mx-auto py-6 px-4 space-y-8 animate-fade-in">
      
      {/* Form Header */}
      <div className="flex justify-between items-center border-b border-natural-border pb-4">
        <div>
          <h2 className="text-2xl font-serif font-black text-natural-text tracking-tight">Create Advertisement</h2>
          <p className="text-xs text-natural-muted">Post your classified product, service, vehicle, or local business across South Africa</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-natural-dusty hover:text-natural-text uppercase"
        >
          Cancel
        </button>
      </div>

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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-natural-green hover:bg-natural-green-hover disabled:bg-natural-green/50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all cursor-pointer shadow-md"
          >
            {selectedPackage === 'free' ? 'Publish Advertisement' : `Proceed to Yoco Payment (R${currentPackagePrice})`}
          </button>
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
