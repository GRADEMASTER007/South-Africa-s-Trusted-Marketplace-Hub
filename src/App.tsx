import React, { useState, useEffect } from 'react';
import { 
  MapPin, Tag, Search, Car, Home, Wrench, Briefcase, Compass, 
  ShoppingBag, PlusCircle, User, LogIn, LogOut, Menu, X, 
  Sparkles, AlertTriangle, ShieldCheck, Star, Heart, Map, 
  Phone, HelpCircle, Building2, BookOpen, Layers
} from 'lucide-react';

import { Listing, UserProfile, BusinessProfile } from './types';
import { SOUTH_AFRICAN_PROVINCES, CLASSIFIED_CATEGORIES, PRICING_PACKAGES } from './data/southAfricaData';
import { auth, db, isFirebaseAvailable, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Component imports
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ListingCard from './components/ListingCard';
import ListingDetail from './components/ListingDetail';
import CreateListing from './components/CreateListing';
import BusinessProfilePage from './components/BusinessProfilePage';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import LandingPages from './components/LandingPages';
import AiSearchChatbot from './components/AiSearchChatbot';
import ReviewsSection from './components/ReviewsSection';
import PwaInstallBanner from './components/PwaInstallBanner';
import Helmet from './components/Helmet';

// INITIAL PRE-POPULATED REALISTIC SOUTH AFRICAN CLASSIFIED ADS
const INITIAL_LISTINGS: Listing[] = [
  {
    id: 'list-1',
    title: '2015 Toyota Hilux 3.0 D-4D Legend 45 Double Cab Bakkie',
    description: 'Lekker Hilux Legend 45 for sale! Perfect mechanical condition, full service history with agents. Canopy included, tow bar, leather seats, and dual-battery system. Selling because I upgraded. Clean bakkie, well looked after, ready for farming or daily drives. Price slightly negotiable.',
    price: 245000,
    isNegotiable: true,
    category: 'Vehicles',
    subcategory: 'Bakkies',
    province: 'Gauteng',
    city: 'Pretoria',
    suburb: 'Pretoria East',
    condition: 'used',
    contactPhone: '082 555 1234',
    whatsAppNumber: '+27825551234',
    images: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=60'
    ],
    packageType: 'premium',
    status: 'active',
    userId: 'user-toyota-dealer',
    userName: 'Kobus van der Merwe',
    userPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    isFeatured: true,
    viewCount: 142,
    latitude: -25.747,
    longitude: 28.229,
    priceHistory: [
      { price: 260000, date: '2026-06-15T10:00:00.000Z' },
      { price: 250000, date: '2026-07-01T12:00:00.000Z' },
      { price: 245000, date: '2026-07-15T09:00:00.000Z' }
    ]
  },
  {
    id: 'list-2',
    title: 'Stunning 2-Bedroom Rental Apartment in Sea Point',
    description: 'Fully furnished, high-contrast modern apartment available for 12-month lease. Spectacular side-sea views, walking distance to Sea Point Promenade, woolworths, and trendy cafes. Secure undercover parking bay, 24-hour security guards, fiber internet-ready. No pets allowed.',
    price: 18500,
    isNegotiable: false,
    category: 'Property',
    subcategory: 'Rentals',
    province: 'Western Cape',
    city: 'Cape Town',
    suburb: 'Sea Point',
    condition: 'new',
    contactPhone: '021 444 8822',
    whatsAppNumber: '+27214448822',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=60'
    ],
    packageType: 'business',
    status: 'active',
    userId: 'user-capetown-rentals',
    userName: 'Sarah Jenkins',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isFeatured: true,
    viewCount: 95,
    latitude: -33.921,
    longitude: 18.384,
    priceHistory: [
      { price: 17500, date: '2026-06-01T08:00:00.000Z' },
      { price: 18500, date: '2026-06-20T14:30:00.000Z' }
    ]
  },
  {
    id: 'list-3',
    title: 'Emergency 24/7 Plumbers Durban North & Umhlanga',
    description: 'SAB-registered emergency plumber. Fast arrival for blocked drains, leaking burst geysers, pipe relocations, bathroom renovations, and solar geyser installations. Commercial and residential jobs. Yebo! Call us now for competitive rates and guaranteed local South African craft.',
    price: 450,
    isNegotiable: true,
    category: 'Services',
    subcategory: 'Plumbers',
    province: 'KwaZulu-Natal',
    city: 'Durban',
    suburb: 'Durban North',
    condition: 'new',
    contactPhone: '083 111 9876',
    whatsAppNumber: '+27831119876',
    images: [
      'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600&auto=format&fit=crop&q=60'
    ],
    packageType: 'starter',
    status: 'active',
    userId: 'user-durban-plumber',
    userName: 'Sipho Ndlovu',
    userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    isFeatured: true,
    viewCount: 61,
    latitude: -29.779,
    longitude: 31.029,
    priceHistory: [
      { price: 450, date: '2026-07-10T11:00:00.000Z' }
    ]
  },
  {
    id: 'list-4',
    title: 'Massey Ferguson 290 Tractor - Fully Refurbished',
    description: 'Refurbished Massey Ferguson 290 farming tractor. Engine overhauled, new clutch, brand new rear tires fitted. Hydraulics tested and certified. Great workhorse for medium to large farms. Ready to go to work in Free State or surrounding farming community districts.',
    price: 139000,
    isNegotiable: true,
    category: 'Products',
    subcategory: 'Farm equipment',
    province: 'Free State',
    city: 'Bethlehem',
    suburb: 'Bethlehem Rural',
    condition: 'refurbished',
    contactPhone: '058 333 4411',
    whatsAppNumber: '+27583334411',
    images: [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=60'
    ],
    packageType: 'free',
    status: 'active',
    userId: 'user-freestate-machinery',
    userName: 'Andries Botha',
    userPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isFeatured: false,
    viewCount: 38,
    latitude: -28.231,
    longitude: 28.314,
    priceHistory: [
      { price: 145000, date: '2026-06-20T09:00:00.000Z' },
      { price: 139000, date: '2026-07-12T15:00:00.000Z' }
    ]
  },
  {
    id: 'list-5',
    title: 'Serene Caravan & Camping Resort near Drakensberg',
    description: 'Escape to a tranquil caravan camping resort framed by the rolling Drakensberg mountains. 50 grassed stands with 15A electrical connection points, clean ablution blocks, kiddies swimming pool, and hiking trails starting right from rest stops. Perfect family holiday road trip destination.',
    price: 320,
    isNegotiable: false,
    category: 'Tourism & Leisure',
    subcategory: 'Caravan parks',
    province: 'KwaZulu-Natal',
    city: 'Pietermaritzburg',
    suburb: 'Drakensberg Foothills',
    condition: 'new',
    contactPhone: '033 999 1234',
    whatsAppNumber: '+27339991234',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=600&auto=format&fit=crop&q=60'
    ],
    packageType: 'premium',
    status: 'active',
    userId: 'user-resort-owner',
    userName: 'Pieter Gouws',
    userPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    isFeatured: true,
    viewCount: 110,
    latitude: -29.601,
    longitude: 30.379,
    priceHistory: [
      { price: 320, date: '2026-07-10T10:00:00.000Z' }
    ]
  }
];

export default function App() {
  // Navigation
  const [currentView, setCurrentView] = useState<'home' | 'detail' | 'create' | 'directory' | 'dashboard' | 'admin' | 'seo'>('home');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Classified Ads State
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);

  // Search/Filter State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All Provinces');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All Subcategories');
  const [priceMax, setPriceMax] = useState('');

  // Active cities list for the selected province
  const availableCities = selectedProvince === 'All Provinces' 
    ? [] 
    : SOUTH_AFRICAN_PROVINCES.find(p => p.name === selectedProvince)?.majorCities || [];

  // Active subcategories list for the selected category
  const availableSubcategories = selectedCategory === 'All Categories'
    ? []
    : CLASSIFIED_CATEGORIES.find(c => c.name === selectedCategory)?.subcategories || [];

  // Synchronize Auth state with Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If logged in, fetch or set standard profile in Firestore
        let profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'SA Advertiser',
          photoURL: user.photoURL || '',
          role: user.email === 'nglinn975@gmail.com' ? 'admin' : 'user', // Set as admin if matches user's email
          createdAt: new Date().toISOString()
        };

        if (isFirebaseAvailable && db) {
          try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              profile = { ...profile, ...docSnap.data() } as UserProfile;
            } else {
              await setDoc(docRef, profile);
            }
          } catch (e) {
            console.warn("Could not load/write Firestore user profile", e);
          }
        } else {
          // Local fallback database
          const localUsers = JSON.parse(localStorage.getItem('samarket_users') || '[]');
          const existing = localUsers.find((u: any) => u.uid === user.uid);
          if (existing) {
            profile = existing;
          } else {
            localUsers.push(profile);
            localStorage.setItem('samarket_users', JSON.stringify(localUsers));
          }
        }
        setCurrentUser(profile);
        setSavedListingIds(JSON.parse(localStorage.getItem(`samarket_saved_${user.uid}`) || '[]'));
      } else {
        setCurrentUser(null);
        setSavedListingIds([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync listings from Firestore if available
  const syncListings = async () => {
    if (isFirebaseAvailable && db) {
      try {
        const querySnapshot = await getDocs(collection(db, "listings"));
        const fbListings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
        if (fbListings.length > 0) {
          setListings(fbListings);
        }
      } catch (err) {
        console.warn("Could not retrieve Firestore listings. Falling back to pre-populated dataset.", err);
      }
    } else {
      // Load local storage listings
      const local = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
      if (local.length > 0) {
        setListings(local);
      } else {
        localStorage.setItem('samarket_listings', JSON.stringify(INITIAL_LISTINGS));
      }
    }
  };

  useEffect(() => {
    syncListings();
  }, [currentView]);

  // Support deep-linking for shared listing URLs and views
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'seo') {
        setCurrentView('seo');
      } else if (viewParam === 'directory') {
        setCurrentView('directory');
      } else if (viewParam === 'dashboard') {
        setCurrentView('dashboard');
      }

      if (listings.length > 0) {
        const adId = params.get('ad') || params.get('listingId');
        if (adId && (!selectedListing || selectedListing.id !== adId)) {
          const found = listings.find(l => l.id === adId);
          if (found) {
            setSelectedListing(found);
            setCurrentView('detail');
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse deep link from URL parameters", e);
    }
  }, [listings]);

  // Handle email sign up / login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError("Please fill in email and password.");
      return;
    }

    try {
      if (isSignUp) {
        // Register
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Check your credentials.");
    }
  };

  // Google Sign-in simulation
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      if (googleProvider) {
        await signInWithPopup(auth, googleProvider);
        setShowAuthModal(false);
      } else {
        // Simulate google sign-in on offline iframe fallback
        const mockUid = `google_${Math.random().toString(36).substring(2, 9)}`;
        const mockProfile: UserProfile = {
          uid: mockUid,
          email: 'nglinn975@gmail.com', // Simulate nglinn975 to unlock Admin Panel instantly
          displayName: 'Sipho Zuma',
          photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        setCurrentUser(mockProfile);
        setShowAuthModal(false);
        console.log("Mock Google login completed successfully to allow Admin Panel access.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Google Authentication failed.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCurrentView('home');
    } catch (err) {
      // fallback
      setCurrentUser(null);
      setCurrentView('home');
    }
  };

  // Chatbot Filter Application Callback
  const handleApplyAiFilters = (filters: any) => {
    if (filters.province) setSelectedProvince(filters.province);
    if (filters.city) setSelectedCity(filters.city);
    if (filters.category) setSelectedCategory(filters.category);
    if (filters.subcategory) setSelectedSubcategory(filters.subcategory);
    if (filters.query) setSearchKeyword(filters.query);
    if (filters.maxPrice) setPriceMax(filters.maxPrice.toString());
    setCurrentView('home');
  };

  // Filter listings mathematically
  const filteredListings = listings.filter((l) => {
    let matches = l.status === 'active'; // Only show active listings on main search
    
    if (selectedProvince !== 'All Provinces' && l.province !== selectedProvince) {
      matches = false;
    }
    if (selectedCity !== 'All Cities' && l.city !== selectedCity) {
      matches = false;
    }
    if (selectedCategory !== 'All Categories' && l.category !== selectedCategory) {
      matches = false;
    }
    if (selectedSubcategory !== 'All Subcategories' && l.subcategory !== selectedSubcategory) {
      matches = false;
    }
    if (priceMax && l.price > parseFloat(priceMax)) {
      matches = false;
    }
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      const inTitle = l.title.toLowerCase().includes(keyword);
      const inDesc = l.description.toLowerCase().includes(keyword);
      const inSuburb = l.suburb.toLowerCase().includes(keyword);
      const inSubcat = l.subcategory.toLowerCase().includes(keyword);
      if (!inTitle && !inDesc && !inSuburb && !inSubcat) {
        matches = false;
      }
    }
    return matches;
  });

  const handleToggleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    const savedKey = `samarket_saved_${currentUser.uid}`;
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    let updated;
    if (saved.includes(id)) {
      updated = saved.filter((sid: string) => sid !== id);
    } else {
      updated = [...saved, id];
    }
    localStorage.setItem(savedKey, JSON.stringify(updated));
    setSavedListingIds(updated);
  };

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
    // Increment view counter
    listing.viewCount = (listing.viewCount || 0) + 1;
    setCurrentView('detail');

    // Update URL query parameters for social sharing
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('ad', listing.id);
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      console.warn("Could not update address bar URL for sharing", e);
    }
  };

  const handleRenewListing = async (listing: Listing) => {
    try {
      const renewExpiry = new Date();
      renewExpiry.setDate(renewExpiry.getDate() + 30); // 30 days renewal
      
      if (isFirebaseAvailable && db) {
        const listingDocRef = doc(db, "listings", listing.id);
        await updateDoc(listingDocRef, {
          status: 'active',
          expiresAt: renewExpiry.toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        const local = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
        const updated = local.map((l: any) => {
          if (l.id === listing.id) {
            return { ...l, status: 'active', expiresAt: renewExpiry.toISOString() };
          }
          return l;
        });
        localStorage.setItem('samarket_listings', JSON.stringify(updated));
      }
      syncListings();
      alert(`Success! Classified ad "${listing.title}" renewed for another 30 days.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (confirm("Are you sure you want to remove this listing?")) {
      setListings(prev => prev.filter(l => l.id !== id));
      const local = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
      localStorage.setItem('samarket_listings', JSON.stringify(local.filter((l: any) => l.id !== id)));
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (newPrice <= 0) {
      alert("Please enter a valid price greater than R0.");
      return;
    }
    
    const listingToUpdate = listings.find(l => l.id === id);
    if (!listingToUpdate) return;

    const oldPrice = listingToUpdate.price;
    const isPriceReduced = newPrice < oldPrice;

    const updatedListings = listings.map(l => {
      if (l.id === id) {
        const originalHistory = l.priceHistory || [
          { price: l.price, date: l.createdAt || new Date().toISOString() }
        ];
        const updatedHistory = [
          ...originalHistory,
          { price: newPrice, date: new Date().toISOString() }
        ];
        return {
          ...l,
          price: newPrice,
          priceHistory: updatedHistory
        };
      }
      return l;
    });

    setListings(updatedListings);

    if (isFirebaseAvailable && db) {
      try {
        const listingDocRef = doc(db, "listings", id);
        const originalHistory = listingToUpdate.priceHistory || [
          { price: listingToUpdate.price, date: listingToUpdate.createdAt || new Date().toISOString() }
        ];
        const updatedHistory = [
          ...originalHistory,
          { price: newPrice, date: new Date().toISOString() }
        ];
        await updateDoc(listingDocRef, {
          price: newPrice,
          priceHistory: updatedHistory
        });

        // Trigger price reduction notifications on Firestore
        if (isPriceReduced) {
          try {
            const { collection, query, where, getDocs, addDoc } = await import('firebase/firestore');
            const q = query(collection(db, "follows"), where("listingId", "==", id));
            const snap = await getDocs(q);
            const notifyPromises = snap.docs.map(docSnap => {
              const followData = docSnap.data();
              const followerUserId = followData.userId;
              return addDoc(collection(db, "notifications"), {
                userId: followerUserId,
                title: "📉 Price Reduced! Lekker Deal Alert!",
                message: `Lekker deal! The price of the listing "${listingToUpdate.title}" that you followed has dropped from R ${oldPrice.toLocaleString('en-ZA')} to R ${newPrice.toLocaleString('en-ZA')}!`,
                type: "system",
                read: false,
                listingId: id,
                createdAt: new Date().toISOString()
              });
            });
            await Promise.all(notifyPromises);
            console.log(`Dispatched ${snap.size} Firestore price drop notifications.`);
          } catch (followErr) {
            console.error("Error creating Firestore follow notifications:", followErr);
          }
        }
      } catch (err) {
        console.warn("Could not save price update to Firestore", err);
      }
    }

    // Trigger local price reduction notifications for any matching follower
    if (isPriceReduced) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("samarket_follows_")) {
            const followerUserId = key.replace("samarket_follows_", "");
            const followedIds = JSON.parse(localStorage.getItem(key) || "[]");
            if (followedIds.includes(id)) {
              const localNotifsKey = "samarket_notifications";
              const currentNotifs = JSON.parse(localStorage.getItem(localNotifsKey) || "[]");
              currentNotifs.push({
                id: `notif_drop_${Math.random().toString(36).substring(2, 9)}`,
                userId: followerUserId,
                title: "📉 Price Reduced! Lekker Deal Alert!",
                message: `Lekker deal! The price of the listing "${listingToUpdate.title}" that you followed has dropped from R ${oldPrice.toLocaleString('en-ZA')} to R ${newPrice.toLocaleString('en-ZA')}!`,
                type: "system",
                read: false,
                listingId: id,
                createdAt: new Date().toISOString()
              });
              localStorage.setItem(localNotifsKey, JSON.stringify(currentNotifs));
            }
          }
        }
      } catch (localFollowErr) {
        console.error("Error creating local follow notifications:", localFollowErr);
      }
    }

    const local = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
    const updatedLocal = local.map((l: any) => {
      if (l.id === id) {
        const originalHistory = l.priceHistory || [
          { price: l.price, date: l.createdAt || new Date().toISOString() }
        ];
        const updatedHistory = [
          ...originalHistory,
          { price: newPrice, date: new Date().toISOString() }
        ];
        return {
          ...l,
          price: newPrice,
          priceHistory: updatedHistory
        };
      }
      return l;
    });
    localStorage.setItem('samarket_listings', JSON.stringify(updatedLocal));

    alert(`Successfully updated price for "${listingToUpdate.title}" to R ${newPrice.toLocaleString('en-ZA')}.`);
  };

  // Generate dynamic meta information for SEO ranking
  const getSeoMetadata = () => {
    switch (currentView) {
      case 'detail':
        if (selectedListing) {
          const formattedPrice = selectedListing.price > 0 ? `R${selectedListing.price.toLocaleString('en-ZA')}` : 'Contact for Price';
          return {
            title: `${selectedListing.title} (${formattedPrice}) | SA Market Hub`,
            description: `${selectedListing.description.slice(0, 155)}${selectedListing.description.length > 155 ? '...' : ''} | Found in ${selectedListing.city}, ${selectedListing.province}. Category: ${selectedListing.category}.`,
            image: selectedListing.images?.[0] || selectedListing.imageUrl
          };
        }
        break;
      case 'seo':
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const slug = urlParams.get('slug') || 'buy-and-sell-gauteng';
          if (slug === 'buy-and-sell-gauteng') {
            return {
              title: 'Classified Advertisements in Gauteng | SA Market Hub',
              description: 'Discover cars, properties, products, and professional plumbing or electrical services for sale in Johannesburg, Pretoria, and across Gauteng on SA Market Hub.',
              image: undefined
            };
          } else if (slug === 'farm-equipment-south-africa') {
            return {
              title: 'Farming Equipment & Tractors for Sale South Africa | SA Market Hub',
              description: 'Buy used and refurbished tractors, livestock, plows, harvesters, and irrigation equipment across Free State, North West, and Mpumalanga agricultural areas.',
              image: undefined
            };
          } else if (slug === 'plumbers-in-durban') {
            return {
              title: 'Top Plumbing Services in Durban | Professional Directory',
              description: 'Looking for a plumber in Durban, Umhlanga, or Hillcrest? Compare local commercial and residential plumbing services with verified customer reviews on SA Market Hub.',
              image: undefined
            };
          }
        } catch (e) {
          console.warn("Could not parse SEO slug", e);
        }
        break;
      case 'directory':
        return {
          title: 'Verified South African Business Directory | SA Market Hub',
          description: 'Browse and search verified professional businesses, plumbers, electricians, mechanics, and contractors in South Africa.',
          image: undefined
        };
      case 'create':
        return {
          title: 'Post a Free Classified Ad | SA Market Hub',
          description: 'Advertise your cars, bakkies, real estate, plumbing services, products, or livestock for free. Secure, trusted, and localized.',
          image: undefined
        };
      case 'dashboard':
        return {
          title: 'My Seller Dashboard | SA Market Hub',
          description: 'Manage your active classified ads, view impressions/view counters, renew listings, or purchase boost features safely.',
          image: undefined
        };
      case 'admin':
        return {
          title: 'Admin Control Center | SA Market Hub',
          description: 'SA Market Hub moderator console.',
          image: undefined
        };
    }

    // Default 'home' metadata
    return {
      title: 'SA Market Hub | South Africa\'s Smart Classifieds & Business Directory',
      description: 'The trusted South African local marketplace. Post bakkies, livestock, housing, or search emergency plumbers and handymen in GP, KZN, WC & more.',
      image: undefined
    };
  };

  const seoMeta = getSeoMetadata();

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col font-sans text-natural-text">
      
      {/* Dynamic SEO Meta Tags updater */}
      <Helmet 
        title={seoMeta.title} 
        description={seoMeta.description} 
        ogImage={seoMeta.image} 
      />
      
      {/* Dynamic Header Navbar */}
      <Navbar 
        currentUser={currentUser} 
        currentView={currentView}
        onNavigate={setCurrentView} 
        onSignOut={handleSignOut}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main Container Views switcher */}
      <main className="flex-1 pb-16">
        {currentView === 'home' && (
          <div className="space-y-6">
            <Hero 
              searchKeyword={searchKeyword}
              setSearchKeyword={setSearchKeyword}
              selectedProvince={selectedProvince}
              setSelectedProvince={(p) => { setSelectedProvince(p); setSelectedCity('All Cities'); }}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
              selectedCategory={selectedCategory}
              setSelectedCategory={(c) => { setSelectedCategory(c); setSelectedSubcategory('All Subcategories'); }}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
              priceMax={priceMax}
              setPriceMax={setPriceMax}
              availableCities={availableCities}
              availableSubcategories={availableSubcategories}
              onPostAd={() => currentUser ? setCurrentView('create') : setShowAuthModal(true)}
            />

            {/* Ads listings list */}
            <div className="max-w-6xl mx-auto px-4 space-y-6">
              <div className="flex justify-between items-center border-b border-natural-border pb-2">
                <h3 className="text-base font-serif font-black text-natural-text uppercase tracking-wide">
                  Browse Classifieds ({filteredListings.length})
                </h3>
                {selectedCategory !== 'All Categories' && (
                  <span className="text-xs text-natural-green font-bold bg-natural-cream px-2.5 py-1 rounded-lg border border-natural-border">
                    Category: {selectedCategory}
                  </span>
                )}
              </div>

              {filteredListings.length === 0 ? (
                <div className="text-center py-16 bg-natural-cream/30 border border-natural-border rounded-3xl p-6 space-y-3.5 shadow-xs">
                  <Search className="w-12 h-12 text-natural-dusty mx-auto" />
                  <h4 className="font-bold text-natural-text text-sm">No Ads Match Your Filters</h4>
                  <p className="text-xs text-natural-muted max-w-sm mx-auto">Try clearing your search words or choosing "All Provinces" to find items nearby.</p>
                  <button
                    onClick={() => {
                      setSearchKeyword('');
                      setSelectedProvince('All Provinces');
                      setSelectedCity('All Cities');
                      setSelectedCategory('All Categories');
                      setPriceMax('');
                    }}
                    className="bg-natural-green hover:bg-natural-green-hover text-white font-bold text-xs py-2 px-4.5 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Prioritize Featured Listings first */}
                  {[...filteredListings]
                    .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
                    .map((listing) => (
                      <ListingCard 
                        key={listing.id} 
                        listing={listing} 
                        onClick={handleSelectListing}
                        onToggleSaved={handleToggleSaved}
                        isSaved={savedListingIds.includes(listing.id)}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'detail' && selectedListing && (
          <ListingDetail
            listing={selectedListing}
            currentUser={currentUser}
            similarListings={listings.filter(l => l.category === selectedListing.category && l.id !== selectedListing.id).slice(0, 4)}
            onBack={() => {
              setCurrentView('home');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('ad');
                url.searchParams.delete('listingId');
                window.history.pushState({}, '', url.toString());
              } catch (e) {
                console.warn("Could not clear address bar URL", e);
              }
            }}
            onSelectListing={handleSelectListing}
          />
        )}

        {currentView === 'create' && currentUser && (
          <CreateListing
            currentUser={currentUser}
            onAdPublished={() => {
              alert("Lekker! Your classified advertisement is now live on SA Market Hub!");
              setCurrentView('home');
            }}
            onCancel={() => setCurrentView('home')}
          />
        )}

        {currentView === 'directory' && (
          <BusinessProfilePage
            currentUser={currentUser}
            onSelectBusiness={(bus) => {
              // Open mock business profile inside listing detail simulation or directory detail
              alert(`Welcome to ${bus.companyName}! Phone: ${bus.phone}, WhatsApp: ${bus.whatsApp}. Listing verified.`);
            }}
          />
        )}

        {currentView === 'dashboard' && currentUser && (
          <UserDashboard
            currentUser={currentUser}
            listings={listings}
            savedListingIds={savedListingIds}
            onToggleSaved={handleToggleSaved}
            onSelectListing={handleSelectListing}
            onRenewListing={handleRenewListing}
            onUpgradeListing={(listing) => {
              // Upgrade triggers boost options
              setSelectedListing(listing);
              setCurrentView('create'); // Redirect to create screen so they can choose a paid upgrade & pay
            }}
            onDeleteListing={handleDeleteListing}
            onUpdatePrice={handleUpdatePrice}
          />
        )}

        {currentView === 'admin' && currentUser && currentUser.role === 'admin' && (
          <AdminPanel currentUser={currentUser} />
        )}

        {currentView === 'seo' && (
          <LandingPages
            listings={listings}
            onSelectListing={handleSelectListing}
            onPostAd={() => currentUser ? setCurrentView('create') : setShowAuthModal(true)}
          />
        )}
      </main>

      {/* Persistent AI Search Assistant Chatbot floating trigger */}
      <AiSearchChatbot onApplyFilters={handleApplyAiFilters} />

      {/* PWA Smart Phone App Download Option */}
      <PwaInstallBanner />

      {/* AUTHENTICATION OVERLAY MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-natural-bg rounded-3xl w-full max-w-sm p-6 space-y-4 border border-natural-border shadow-2xl relative text-natural-text">
            <button
              onClick={() => { setShowAuthModal(false); setAuthError(null); }}
              className="absolute top-4 right-4 text-natural-dusty hover:text-natural-muted cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="font-serif font-black text-natural-text text-lg">
                {isSignUp ? "Create SA Hub Account" : "Sign In to SA Market Hub"}
              </h3>
              <p className="text-xs text-natural-muted">Post ads, boost listings, and chat with buyers</p>
            </div>

            {authError && (
              <div className="text-xs text-red-600 bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-center font-semibold">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {isSignUp && (
                <div>
                  <label className="block text-[9px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sipho Zuma"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full text-xs border border-natural-border rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-natural-green bg-natural-cream/50 text-natural-text"
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. nglinn975@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-xs border border-natural-border rounded-xl px-3 py-2 outline-none font-medium focus:ring-1 focus:ring-natural-green bg-natural-cream/50 text-natural-text"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full text-xs border border-natural-border rounded-xl px-3 py-2 outline-none font-mono focus:ring-1 focus:ring-natural-green bg-natural-cream/50 text-natural-text"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-natural-green hover:bg-natural-green-hover text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-sm mt-2"
              >
                {isSignUp ? "Create My Account" : "Log In"}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-3.5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-natural-border" /></div>
              <span className="relative bg-natural-bg px-3 text-[10px] text-natural-dusty font-bold uppercase">Or Use Verified Socials</span>
            </div>

            {/* Google provider button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full bg-natural-cream/70 border border-natural-border hover:bg-natural-cream text-natural-text font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.27 7.55 8.92 5.04 12 5.04z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
                <path fill="#FBBC05" d="M5.36 10.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 2.9C.54 4.82 0 6.98 0 9.2s.54 4.38 1.5 6.3l3.86-3z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.11-3.96 1.11-3.08 0-5.73-2.51-6.64-5.46L1.5 15.8C3.4 19.65 7.35 22 12 23z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center text-xs text-natural-muted pt-2">
              {isSignUp ? "Already have an account?" : "Don't have an advertiser profile yet?"}{" "}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                className="font-bold text-natural-green hover:underline cursor-pointer"
              >
                {isSignUp ? "Sign In" : "Register Free"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
