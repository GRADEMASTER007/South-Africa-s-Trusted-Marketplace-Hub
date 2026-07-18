import React from 'react';
import { Tag, MapPin, Search, Star, HelpCircle, ShieldCheck } from 'lucide-react';
import { Listing } from '../types';

interface LandingPageProps {
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  onPostAd: () => void;
}

interface SEOPage {
  slug: string;
  title: string;
  metaDesc: string;
  heading: string;
  subheading: string;
  province: string | null;
  city: string | null;
  category: string | null;
  subcategory: string | null;
  faqs: { q: string; a: string }[];
}

const SEO_LANDING_PAGES: SEOPage[] = [
  {
    slug: 'buy-and-sell-gauteng',
    title: 'Classified Advertisements in Gauteng | SA Market Hub',
    metaDesc: 'Discover cars, properties, products, and professional plumbing or electrical services for sale in Johannesburg, Pretoria, and across Gauteng on SA Market Hub.',
    heading: 'Classified Ads & Local Businesses in Gauteng',
    subheading: 'Johannesburg, Pretoria, Midrand, and Centurion\'s trusted buy and sell marketplace',
    province: 'Gauteng',
    city: null,
    category: null,
    subcategory: null,
    faqs: [
      { q: "Is SA Market Hub free to use in Gauteng?", a: "Yebo! Anyone can post free classified advertisements with up to 5 images for 30 days." },
      { q: "Where can I meet buyers safely in Johannesburg or Pretoria?", a: "We strongly advise meeting in highly visible public zones like shopping mall security parking lots, local police stations, or community centers." }
    ]
  },
  {
    slug: 'farm-equipment-south-africa',
    title: 'Farming Equipment & Tractors for Sale South Africa | SA Market Hub',
    metaDesc: 'Buy used and refurbished tractors, livestock, plows, harvesters, and irrigation equipment across Free State, North West, and Mpumalanga agricultural areas.',
    heading: 'Farming Equipment, Tractors & Agri Supplies',
    subheading: 'Powering South Africa\'s farmers with cheap tools, bakkies, and machinery',
    province: null,
    city: null,
    category: 'Products',
    subcategory: 'Farm equipment',
    faqs: [
      { q: "Can I list livestock on the marketplace?", a: "Yes, you can list livestock under the agricultural products subcategory. Please ensure adherence to South African agricultural transport and health laws." },
      { q: "What is the best boost package for high-value agricultural machinery?", a: "We recommend our Premium Elite (R299) or Business Pro (R99) package. These slots get highest search visibility and stay active for up to 90 days." }
    ]
  },
  {
    slug: 'plumbers-in-durban',
    title: 'Top Plumbing Services in Durban | Professional Directory',
    metaDesc: 'Looking for a plumber in Durban, Umhlanga, or Hillcrest? Compare local commercial and residential plumbing services with verified customer reviews on SA Market Hub.',
    heading: 'Verified Plumbers & Plumbing Companies in Durban',
    subheading: 'Find 24/7 emergency drain cleaning, pipe repairs, and geyser installations',
    province: 'KwaZulu-Natal',
    city: 'Durban',
    category: 'Services',
    subcategory: 'Plumbers',
    faqs: [
      { q: "How do I find a certified plumber in Durban?", a: "Look for listings marked with our verified business shield, indicating they have supplied standard business registry numbers." },
      { q: "Are emergency plumber quotes free?", a: "Many local Durban plumbing businesses offer free diagnostic quotes during standard business hours. Connect via WhatsApp directly on their ad to confirm." }
    ]
  }
];

export default function LandingPages({ listings, onSelectListing, onPostAd }: LandingPageProps) {
  const [selectedSlug, setSelectedSlug] = React.useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('slug') || 'buy-and-sell-gauteng';
    } catch {
      return 'buy-and-sell-gauteng';
    }
  });

  // Keep URL search query in sync when slug changes
  const handleSelectSlug = (slug: string) => {
    setSelectedSlug(slug);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'seo');
      url.searchParams.set('slug', slug);
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.warn("Could not sync URL slug parameter", e);
    }
  };

  const currentPage = SEO_LANDING_PAGES.find(p => p.slug === selectedSlug) || SEO_LANDING_PAGES[0];

  // Dynamically filter listings for this landing page
  const filteredListings = listings.filter(l => {
    let matches = true;
    if (currentPage.province && l.province !== currentPage.province) matches = false;
    if (currentPage.city && l.city !== currentPage.city) matches = false;
    if (currentPage.category && l.category !== currentPage.category) matches = false;
    if (currentPage.subcategory && l.subcategory !== currentPage.subcategory) matches = false;
    return matches;
  });

  return (
    <div id="seo-landing-container" className="max-w-6xl mx-auto py-6 px-4 space-y-8 animate-fade-in text-natural-text">
      
      {/* Landing Selector bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-natural-border pb-4">
        <span className="text-[10px] font-bold text-natural-dusty uppercase tracking-widest mr-2">SEO Portals:</span>
        {SEO_LANDING_PAGES.map((page) => (
          <button
            key={page.slug}
            onClick={() => handleSelectSlug(page.slug)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              selectedSlug === page.slug
                ? 'bg-natural-green text-white'
                : 'bg-natural-cream text-natural-muted hover:bg-natural-border/60'
            }`}
          >
            {page.heading.replace('Classified Ads & ', '').replace('Verified ', '')}
          </button>
        ))}
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#1E3F1B] to-[#122610] p-6 md:p-8 rounded-3xl text-white shadow-lg space-y-4 border border-[#2D5A27]/20">
        <div className="inline-flex items-center gap-1.5 bg-white/10 text-natural-cream px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5" />
          <span>{currentPage.province || 'National'} {currentPage.city ? `> ${currentPage.city}` : ''}</span>
        </div>
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight">{currentPage.heading}</h1>
          <p className="text-natural-cream/80 text-xs md:text-sm leading-relaxed font-sans">{currentPage.subheading}</p>
        </div>
        
        {/* Dynamic SEO Meta tag simulation info */}
        <div className="bg-black/15 p-3.5 rounded-2xl border border-white/10 text-[11px] text-natural-cream max-w-md space-y-1.5">
          <p className="font-bold text-white uppercase tracking-wider text-[10px]">&bull; Google Search SEO Parameters</p>
          <p><span className="text-natural-cream/75 font-semibold">Title:</span> {currentPage.title}</p>
          <p><span className="text-natural-cream/75 font-semibold">Description:</span> {currentPage.metaDesc}</p>
        </div>
      </div>

      {/* Listing Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Listings Display */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-serif font-black text-natural-text flex items-center justify-between">
            <span>Filtered Listings ({filteredListings.length})</span>
            {currentPage.category && <span className="text-xs text-natural-green font-bold uppercase font-sans">{currentPage.category}</span>}
          </h3>

          {filteredListings.length === 0 ? (
            <div className="text-center py-12 bg-natural-bg border border-natural-border rounded-2xl p-6 space-y-3">
              <Search className="w-10 h-10 text-natural-dusty mx-auto" />
              <p className="font-serif font-bold text-natural-text text-xs">No Matching Classifieds Right Now</p>
              <p className="text-[11px] text-natural-muted max-w-xs mx-auto">Be the first to list items or services on our {currentPage.heading} landing page!</p>
              <button
                onClick={onPostAd}
                className="bg-natural-green hover:bg-natural-green-hover text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
              >
                Post Listing Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredListings.map((l) => (
                <div
                  key={l.id}
                  onClick={() => onSelectListing(l)}
                  className="bg-natural-bg border border-natural-border rounded-2xl overflow-hidden flex flex-col hover:shadow-md cursor-pointer transition-all"
                >
                  <img
                    src={l.images?.[0] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=60'}
                    alt={l.title}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-16/9 object-cover bg-natural-cream/20 border-b border-natural-border"
                  />
                  <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-natural-text text-sm line-clamp-1">{l.title}</h4>
                      <p className="text-[10px] text-natural-green font-bold uppercase tracking-wider">{l.category} &bull; {l.subcategory}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-black text-natural-green pt-2 border-t border-natural-border">
                      <span>R {l.price.toLocaleString('en-ZA')}</span>
                      <span className="text-[10px] text-natural-muted font-medium font-sans">{l.suburb}, {l.city}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEO Sidebar and FAQs */}
        <div className="space-y-6">
          {/* Why list section */}
          <div className="bg-natural-cream/20 border border-natural-border rounded-3xl p-5 space-y-3 shadow-xs">
            <h4 className="font-serif font-extrabold text-natural-text text-sm">Need to Sell in this Category?</h4>
            <p className="text-xs text-natural-muted leading-relaxed font-sans">
              Our landing pages are actively scanned by Google Crawler bots. When you post a listing on SA Market Hub under this category, your ad is indexed near-instantly, getting you maximum exposure!
            </p>
            <button
              onClick={onPostAd}
              className="w-full bg-natural-amber hover:opacity-90 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
            >
              Post My Ad Here
            </button>
          </div>

          {/* FAQs structured data mockup */}
          <div className="bg-natural-bg border border-natural-border rounded-3xl p-5 space-y-4">
            <div>
              <h4 className="font-serif font-bold text-natural-text text-xs uppercase tracking-wider">Frequently Asked Questions</h4>
              <p className="text-[10px] text-natural-dusty font-sans">Injected as JSON-LD Structured Schema</p>
            </div>

            <div className="space-y-3.5 divide-y divide-natural-border">
              {currentPage.faqs.map((faq, idx) => (
                <div key={idx} className={`space-y-1 ${idx > 0 ? 'pt-3' : ''}`}>
                  <div className="flex gap-1.5 items-start">
                    <HelpCircle className="w-4 h-4 text-natural-green shrink-0" />
                    <p className="text-xs font-bold text-natural-text leading-snug">{faq.q}</p>
                  </div>
                  <p className="text-xs text-natural-muted leading-relaxed pl-5 font-sans">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
