import React, { useState, useEffect } from 'react';
import { Briefcase, Building, MapPin, Phone, MessageSquare, Globe, Clock, ShieldCheck, Star } from 'lucide-react';
import { BusinessProfile } from '../types';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

interface BusinessProfilePageProps {
  currentUser: any;
  onSelectBusiness: (business: BusinessProfile) => void;
}

export default function BusinessProfilePage({ currentUser, onSelectBusiness }: BusinessProfilePageProps) {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [website, setWebsite] = useState('');
  const [openingHours, setOpeningHours] = useState('Mon - Fri: 08:00 - 17:00, Sat: 08:00 - 13:00');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseAvailable && db) {
        const snap = await getDocs(collection(db, "businesses"));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusinessProfile));
        setBusinesses(list);
      } else {
        const local = JSON.parse(localStorage.getItem('samarket_businesses') || '[]');
        setBusinesses(local);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError("Please sign in to register a business.");
      return;
    }
    if (!companyName.trim() || !description.trim() || !address.trim() || !phone.trim() || !whatsApp.trim()) {
      setError("Please fill in all required physical details.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const logoOptions = [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=200&auto=format&fit=crop&q=60'
    ];
    const finalLogo = logoUrl.trim() || logoOptions[Math.floor(Math.random() * logoOptions.length)];

    const newBusiness: Omit<BusinessProfile, 'id'> = {
      ownerId: currentUser.uid,
      companyName: companyName.trim(),
      description: description.trim(),
      address: address.trim(),
      phone: phone.trim(),
      whatsApp: whatsApp.trim().replace(/\s/g, ''),
      website: website.trim(),
      openingHours: openingHours.trim(),
      logoUrl: finalLogo,
      rating: 5,
      reviewsCount: 0
    };

    try {
      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "businesses"), newBusiness);
      } else {
        const local = JSON.parse(localStorage.getItem('samarket_businesses') || '[]');
        local.push({ id: Math.random().toString(36).substring(2, 9), ...newBusiness });
        localStorage.setItem('samarket_businesses', JSON.stringify(local));
      }

      setCompanyName('');
      setDescription('');
      setAddress('');
      setPhone('');
      setWhatsApp('');
      setWebsite('');
      setIsRegistering(false);
      fetchBusinesses();
    } catch (err: any) {
      setError(err.message || "Failed to register business.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="business-directory-page" className="max-w-6xl mx-auto py-6 px-4 space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-natural-green to-natural-green-hover p-6 md:p-8 rounded-3xl text-white shadow-xl border border-natural-green-hover">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            <Briefcase className="w-4 h-4 text-natural-amber" />
            <span className="text-natural-bg">SA Business Directory</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-black tracking-tight">Discover Verified South African Businesses</h2>
          <p className="text-natural-bg/90 text-xs md:text-sm leading-relaxed">
            Support local enterprises! Connect directly with builders, restaurants, accountants, guest houses, and digital agencies near you.
          </p>
        </div>

        {!isRegistering && (
          <button
            onClick={() => setIsRegistering(true)}
            className="bg-natural-amber hover:opacity-90 active:scale-95 text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-md cursor-pointer shrink-0"
          >
            <Building className="w-4 h-4" />
            Register My Business
          </button>
        )}
      </div>

      {isRegistering ? (
        <form onSubmit={handleRegister} className="bg-natural-bg rounded-3xl border border-natural-border p-6 md:p-8 shadow-sm space-y-6 max-w-2xl mx-auto text-natural-text">
          <div className="flex items-center justify-between border-b border-natural-border pb-3">
            <div>
              <h3 className="font-serif font-extrabold text-natural-text text-lg">List Your Business</h3>
              <p className="text-xs text-natural-muted">Create a high-visibility company profile</p>
            </div>
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="text-xs text-natural-dusty hover:text-natural-text font-bold uppercase"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50/50 p-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Company / Trading Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Pretoria Solar Installers"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Company Description *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe your services, products, and what makes your South African business unique..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Physical Address *</label>
              <input
                type="text"
                required
                placeholder="e.g. 14 Loop St, Cape Town, 8000"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Contact Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 021 555 4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">WhatsApp Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. +27821234567"
                value={whatsApp}
                onChange={(e) => setWhatsApp(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Website URL (Optional)</label>
              <input
                type="url"
                placeholder="e.g. https://mybusiness.co.za"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Opening Hours</label>
              <input
                type="text"
                placeholder="Mon - Fri: 08:00 - 17:00"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Business Logo Image URL (Optional)</label>
              <input
                type="url"
                placeholder="Paste logo image link"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full text-sm border border-natural-border rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-natural-green hover:bg-natural-green-hover disabled:bg-natural-green/50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all cursor-pointer shadow-md"
          >
            {isLoading ? "Saving business profile..." : "Register My Business Profile"}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-natural-text border-b border-natural-border pb-2">Active Business Directories</h3>
          
          {isLoading ? (
            <div className="text-center py-10 text-xs text-natural-muted">Searching active directory...</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-natural-border rounded-2xl bg-natural-bg p-6 space-y-2">
              <Briefcase className="w-12 h-12 text-natural-green mx-auto" />
              <p className="font-serif font-bold text-natural-text text-sm">No Registered Businesses Yet</p>
              <p className="text-xs text-natural-muted max-w-sm mx-auto">Be the first to list your agency, shop, or service company on SA Market Hub!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-natural-text">
              {businesses.map((b) => (
                <div
                  key={b.id}
                  className="bg-natural-bg border border-natural-border rounded-3xl p-5 md:p-6 flex gap-4 hover:shadow-xl hover:border-natural-muted transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-natural-green/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-500" />
                  
                  {/* Logo */}
                  <img
                    src={b.logoUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=60'}
                    alt={b.companyName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover border border-natural-border shrink-0 bg-natural-cream/20"
                  />

                  {/* Body details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-serif font-extrabold text-natural-text text-sm line-clamp-1 group-hover:text-natural-green transition-colors">
                          {b.companyName}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-natural-muted font-bold uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5 text-natural-dusty" />
                          <span className="line-clamp-1">{b.openingHours}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 bg-natural-cream text-natural-amber font-bold px-1.5 py-0.5 rounded-lg border border-natural-border text-[10px]">
                        <Star className="w-3 h-3 fill-natural-amber text-natural-amber" />
                        <span>{b.rating || '5.0'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-natural-muted line-clamp-2 leading-relaxed font-sans">
                      {b.description}
                    </p>

                    <div className="pt-2 border-t border-natural-border flex items-center justify-between text-[11px] text-natural-muted gap-2">
                      <div className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-natural-amber" />
                        <span>{b.address}</span>
                      </div>
                      
                      <button
                        onClick={() => onSelectBusiness(b)}
                        className="text-xs font-bold text-natural-green hover:text-natural-green-hover cursor-pointer flex items-center shrink-0"
                      >
                        Details &rarr;
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
