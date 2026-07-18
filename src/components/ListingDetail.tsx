import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Phone, MessageCircle, Flag, CornerDownLeft, Sparkles, Heart, ShieldAlert, CheckCircle, ChevronLeft, ChevronRight, Share2, Copy, Check, Facebook, TrendingDown, TrendingUp, Bell, LineChart as LineChartIcon, Twitter, Mail, Linkedin, Send } from 'lucide-react';
import { Listing, ChatThread, Message } from '../types';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-natural-bg border border-natural-border p-3 rounded-2xl shadow-lg text-xs font-semibold">
        <p className="text-natural-dusty font-mono text-[10px]">{payload[0].payload.formattedDate}</p>
        <p className="text-natural-green font-black text-xs mt-0.5">R {payload[0].value.toLocaleString('en-ZA')}</p>
      </div>
    );
  }
  return null;
};

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

interface ListingDetailProps {
  listing: Listing;
  currentUser: any;
  similarListings: Listing[];
  onBack: () => void;
  onSelectListing: (listing: Listing) => void;
}

export default function ListingDetail({
  listing,
  currentUser,
  similarListings,
  onBack,
  onSelectListing
}: ListingDetailProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const chartData = useMemo(() => {
    const history = listing.priceHistory ? [...listing.priceHistory] : [];
    
    // Seed with current price if history is missing or empty
    if (history.length === 0) {
      history.push({
        price: listing.price,
        date: listing.createdAt || new Date().toISOString()
      });
    }

    // Sort chronologically by date
    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // If there is only one data point, let's create a visual start point to show a line
    if (history.length === 1) {
      const singleDate = new Date(history[0].date);
      const prevDate = new Date(singleDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days prior
      history.unshift({
        price: history[0].price,
        date: prevDate.toISOString()
      });
    }

    return history.map(item => ({
      ...item,
      formattedDate: new Date(item.date).toLocaleDateString('en-ZA', {
        month: 'short',
        day: 'numeric'
      }),
      displayPrice: item.price
    }));
  }, [listing]);

  const shareUrl = `${window.location.origin}${window.location.pathname}?ad=${listing.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Howzit! Check out this listing: "${listing.title}" on SA Market Hub!`,
          url: shareUrl,
        });
        setIsShareMenuOpen(false);
      } catch (err) {
        console.error("Web share failed", err);
      }
    }
  };

  const [isSaved, setIsSaved] = useState(() => {
    if (!currentUser) return false;
    const saved = JSON.parse(localStorage.getItem(`samarket_saved_${currentUser.uid}`) || '[]');
    return saved.includes(listing.id);
  });

  const [messageText, setMessageText] = useState('');
  const [chatSuccess, setChatSuccess] = useState<string | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Scam reporting states
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Fraud/Scam');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const toggleSaveAd = () => {
    if (!currentUser) {
      alert("Please login first to save this advertisement.");
      return;
    }
    const savedKey = `samarket_saved_${currentUser.uid}`;
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    if (isSaved) {
      const filtered = saved.filter((id: string) => id !== listing.id);
      localStorage.setItem(savedKey, JSON.stringify(filtered));
      setIsSaved(false);
    } else {
      saved.push(listing.id);
      localStorage.setItem(savedKey, JSON.stringify(saved));
      setIsSaved(true);
    }
  };

  const [isFollowed, setIsFollowed] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser || !listing) return;
    const checkFollowed = async () => {
      try {
        if (isFirebaseAvailable && db) {
          const q = query(
            collection(db, "follows"),
            where("userId", "==", currentUser.uid),
            where("listingId", "==", listing.id)
          );
          const snap = await getDocs(q);
          setIsFollowed(!snap.empty);
        } else {
          const localFollowed = JSON.parse(localStorage.getItem(`samarket_follows_${currentUser.uid}`) || '[]');
          setIsFollowed(localFollowed.includes(listing.id));
        }
      } catch (err) {
        console.error("Error checking followed status:", err);
      }
    };
    checkFollowed();
  }, [currentUser, listing?.id]);

  const toggleFollowAd = async () => {
    if (!currentUser) {
      alert("Please login first to follow this advertisement's price updates.");
      return;
    }

    try {
      if (isFirebaseAvailable && db) {
        const q = query(
          collection(db, "follows"),
          where("userId", "==", currentUser.uid),
          where("listingId", "==", listing.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          setIsFollowed(false);
        } else {
          await addDoc(collection(db, "follows"), {
            userId: currentUser.uid,
            listingId: listing.id,
            listingTitle: listing.title,
            listingPrice: listing.price,
            initialPrice: listing.price,
            createdAt: new Date().toISOString()
          });
          setIsFollowed(true);
        }
      } else {
        const localKey = `samarket_follows_${currentUser.uid}`;
        const followed = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (followed.includes(listing.id)) {
          const filtered = followed.filter((id: string) => id !== listing.id);
          localStorage.setItem(localKey, JSON.stringify(filtered));
          setIsFollowed(false);
        } else {
          followed.push(listing.id);
          localStorage.setItem(localKey, JSON.stringify(followed));
          setIsFollowed(true);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleStartInternalChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please sign in first to message the seller.");
      return;
    }
    if (!messageText.trim() || isSendingChat) return;

    setIsSendingChat(true);
    try {
      const chatId = `chat_${Math.random().toString(36).substring(2, 9)}`;
      
      const newChat: ChatThread = {
        id: chatId,
        listingId: listing.id,
        listingTitle: listing.title,
        listingPrice: listing.price,
        listingImage: listing.images?.[0] || '',
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Buyer',
        sellerId: listing.userId,
        sellerName: listing.userName,
        lastMessageText: messageText.trim(),
        lastMessageAt: new Date().toISOString()
      };

      const newMsg: Message = {
        id: `msg_${Math.random().toString(36).substring(2, 9)}`,
        chatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Me',
        text: messageText.trim(),
        createdAt: new Date().toISOString()
      };

      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "chats"), newChat);
        await addDoc(collection(db, "messages"), newMsg);
      } else {
        const chatsLocal = JSON.parse(localStorage.getItem('samarket_chats') || '[]');
        const msgsLocal = JSON.parse(localStorage.getItem('samarket_messages') || '[]');
        chatsLocal.push(newChat);
        msgsLocal.push(newMsg);
        localStorage.setItem('samarket_chats', JSON.stringify(chatsLocal));
        localStorage.setItem('samarket_messages', JSON.stringify(msgsLocal));
      }

      setMessageText('');
      setChatSuccess("Message delivered securely to seller inbox! Go to your Account dashboard to read replies.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSubmitScamReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const report = {
        listingId: listing.id,
        listingTitle: listing.title,
        reporterId: currentUser.uid,
        reporterEmail: currentUser.email,
        reason: reportReason,
        description: reportDesc.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "scam_reports"), report);
      } else {
        const reportsLocal = JSON.parse(localStorage.getItem('samarket_reports') || '[]');
        reportsLocal.push({ id: Math.random().toString(36).substring(2, 9), ...report });
        localStorage.setItem('samarket_reports', JSON.stringify(reportsLocal));
      }

      setReportSuccess(true);
      setReportDesc('');
      setTimeout(() => {
        setIsReporting(false);
        setReportSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp click handler
  const cleanWhatsApp = listing.whatsAppNumber.replace(/\D/g, '');
  const waLink = `https://wa.me/${cleanWhatsApp.startsWith('0') ? '27' + cleanWhatsApp.substring(1) : cleanWhatsApp}?text=Howzit!%20I'm%20interested%20in%20your%20listing:%20"${encodeURIComponent(listing.title)}"%20on%20SA%20Market%20Hub.`;

  return (
    <div id={`listing-detail-${listing.id}`} className="max-w-6xl mx-auto py-6 px-4 space-y-8 animate-fade-in">
      
      {/* Navigation and Back actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-bold bg-natural-bg border border-natural-border rounded-xl hover:bg-natural-cream/50 flex items-center gap-1.5 cursor-pointer shadow-sm text-natural-text"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Listings
        </button>

        <div className="flex gap-2">
          <button
            onClick={toggleSaveAd}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border transition-all ${
              isSaved 
                ? 'bg-red-50/50 text-red-600 border-red-200' 
                : 'bg-natural-bg text-natural-text hover:bg-natural-cream/50 border-natural-border'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
            {isSaved ? 'Ad Saved' : 'Save Ad'}
          </button>

          <button
            onClick={toggleFollowAd}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border transition-all ${
              isFollowed 
                ? 'bg-natural-green/10 text-natural-green border-natural-green/30' 
                : 'bg-natural-bg text-natural-text hover:bg-natural-cream/50 border-natural-border'
            }`}
          >
            <Bell className={`w-4 h-4 ${isFollowed ? 'fill-natural-green text-natural-green animate-pulse' : ''}`} />
            {isFollowed ? 'Following Price' : 'Follow Price'}
          </button>

          {/* Social Sharing Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm border transition-all ${
                isShareMenuOpen
                  ? 'bg-natural-cream text-natural-text border-natural-border'
                  : 'bg-natural-bg text-natural-text hover:bg-natural-cream/50 border-natural-border'
              }`}
            >
              <Share2 className="w-4 h-4" />
              Share Ad
            </button>
            
            {isShareMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-natural-bg border border-natural-border rounded-2xl shadow-xl p-3 z-30 space-y-1.5 animate-fade-in text-natural-text">
                <div className="text-[10px] text-natural-dusty font-bold uppercase tracking-wider px-2 pb-1 border-b border-natural-border">
                  Share Options
                </div>
                
                {/* Copy Link Option */}
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-between text-left px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors cursor-pointer text-natural-text"
                >
                  <span className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-natural-muted" />
                    Copy Link
                  </span>
                  {copied ? (
                    <span className="text-[10px] text-natural-green font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      Copied
                    </span>
                  ) : null}
                </button>

                {/* WhatsApp Share */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Howzit! Check out this listing on SA Market Hub: ' + listing.title + ' - ' + shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsShareMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors text-natural-text"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                  <span>Share on WhatsApp</span>
                </a>

                {/* Facebook Share */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsShareMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors text-natural-text"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>Share on Facebook</span>
                </a>

                {/* Twitter / X Share */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Howzit! Check out this listing: "' + listing.title + '" on SA Market Hub!')}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsShareMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors text-natural-text"
                >
                  <Twitter className="w-3.5 h-3.5 text-sky-500" />
                  <span>Share on X / Twitter</span>
                </a>

                {/* LinkedIn Share */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsShareMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors text-natural-text"
                >
                  <Linkedin className="w-3.5 h-3.5 text-blue-700" />
                  <span>Share on LinkedIn</span>
                </a>

                {/* Telegram Share */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Howzit! Check out this listing on SA Market Hub: ' + listing.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsShareMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors text-natural-text"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Share on Telegram</span>
                </a>

                {/* Email Share */}
                <a
                  href={`mailto:?subject=${encodeURIComponent('Listing on SA Market Hub: ' + listing.title)}&body=${encodeURIComponent('Howzit!\n\nI thought you might be interested in this listing:\n\n' + listing.title + '\nPrice: R' + listing.price.toLocaleString('en-ZA') + '\n\nCheck out the details here: ' + shareUrl)}`}
                  onClick={() => setIsShareMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors text-natural-text"
                >
                  <Mail className="w-3.5 h-3.5 text-natural-muted" />
                  <span>Share via Email</span>
                </a>

                {/* Web Share API (Device Share) if supported */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={handleWebShare}
                    className="w-full flex items-center gap-2 text-left px-2 py-2 text-xs font-semibold rounded-lg hover:bg-natural-cream/40 transition-colors cursor-pointer border-t border-natural-border/60 pt-2 mt-1 text-natural-text"
                  >
                    <Share2 className="w-3.5 h-3.5 text-natural-amber" />
                    <span>More Share Options...</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {currentUser && currentUser.uid !== listing.userId && (
            <button
              onClick={() => setIsReporting(true)}
              className="px-4 py-2 text-xs font-bold bg-natural-bg text-red-500 border border-red-200 rounded-xl hover:bg-red-50/50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Flag className="w-4 h-4" />
              Report Scam
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Left Side (Images, Description, Map) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Photos slider */}
          <div className="bg-gray-900 rounded-3xl aspect-16/10 relative overflow-hidden flex items-center justify-center border border-gray-800 shadow-xl group">
            <img
              src={listing.images?.[activeImageIdx] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1000&auto=format&fit=crop&q=80'}
              alt={listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />

            {listing.images && listing.images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIdx(prev => (prev === 0 ? listing.images.length - 1 : prev - 1))}
                  className="absolute left-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 cursor-pointer hidden group-hover:block transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveImageIdx(prev => (prev === listing.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 cursor-pointer hidden group-hover:block transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
              Image {activeImageIdx + 1} of {listing.images?.length || 1}
            </div>
          </div>

          {/* Small images dock */}
          {listing.images && listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {listing.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                    idx === activeImageIdx ? 'border-natural-green scale-105' : 'border-transparent opacity-75'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Video Preview */}
          {listing.videoUrl && (
            <div className="bg-natural-bg rounded-3xl border border-natural-border p-5 shadow-xs space-y-3 text-natural-text">
              <div>
                <h4 className="font-serif font-bold text-natural-text text-sm">Product/Property Video Showcase</h4>
                <p className="text-[11px] text-natural-dusty">Watch the verified video showcase for this advertisement</p>
              </div>
              {getYoutubeEmbedUrl(listing.videoUrl) ? (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-natural-border">
                  <iframe
                    src={getYoutubeEmbedUrl(listing.videoUrl)!}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-natural-cream/30 border border-natural-border rounded-2xl">
                  <div className="text-xs">
                    <p className="font-bold text-natural-text">External Video Link Available</p>
                    <p className="text-natural-dusty text-[10px] break-all">{listing.videoUrl}</p>
                  </div>
                  <a
                    href={listing.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-natural-green hover:bg-natural-green-hover text-white font-bold text-xs rounded-xl shadow-xs shrink-0 whitespace-nowrap"
                  >
                    Watch Video Tour ➔
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Description Block */}
          <div className="bg-natural-bg rounded-3xl border border-natural-border p-6 md:p-8 space-y-4 shadow-xs text-natural-text">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-natural-green uppercase tracking-widest">{listing.category} &gt; {listing.subcategory}</span>
              <h1 className="text-xl md:text-2xl font-serif font-black text-natural-text tracking-tight leading-tight">{listing.title}</h1>
              <div className="flex items-center gap-1.5 text-xs text-natural-muted font-medium">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>{listing.suburb}, {listing.city} ({listing.province})</span>
              </div>
            </div>

            <div className="pt-4 border-t border-natural-border space-y-2">
              <h4 className="font-bold text-natural-text text-xs uppercase tracking-wider">Item Details & Description</h4>
              <p className="text-natural-text/90 text-sm leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-natural-border text-xs">
              <div>
                <span className="text-[10px] text-natural-dusty font-bold uppercase">Condition</span>
                <p className="font-bold text-natural-text capitalize mt-0.5">{listing.condition}</p>
              </div>
              <div>
                <span className="text-[10px] text-natural-dusty font-bold uppercase">Listing Expiry</span>
                <p className="font-semibold text-natural-muted mt-0.5">{new Date(listing.expiresAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* GEOGRAPHICAL GOOGLE MAP PREVIEW */}
          <div className="bg-natural-bg rounded-3xl border border-natural-border p-6 shadow-xs space-y-3">
            <div>
              <h4 className="font-serif font-bold text-natural-text text-sm">Geographical Map Location</h4>
              <p className="text-[11px] text-natural-dusty">Exact coordinates verified on listing publish</p>
            </div>
            
            {!hasValidKey ? (
              <div className="relative aspect-2/1 bg-sky-50 rounded-2xl border border-sky-100 overflow-hidden p-6 flex flex-col items-center justify-center text-center">
                <div className="absolute inset-0 bg-cover opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=60')" }} />
                <div className="relative max-w-md space-y-2 text-natural-text">
                  <MapPin className="w-8 h-8 text-natural-amber mx-auto animate-pulse" />
                  <h5 className="font-bold text-xs">Google Maps API Key Required</h5>
                  <p className="text-[10px] text-natural-dusty leading-relaxed">
                    Please set your <strong>GOOGLE_MAPS_PLATFORM_KEY</strong> in AI Studio Secrets (⚙️ top-right) to display the interactive map for this listing at <strong>{listing.suburb}, {listing.city}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-2/1 rounded-2xl border border-natural-border overflow-hidden h-[300px]">
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    defaultCenter={{ 
                      lat: listing.latitude ? parseFloat(String(listing.latitude)) : -26.204, 
                      lng: listing.longitude ? parseFloat(String(listing.longitude)) : 28.047 
                    }}
                    defaultZoom={13}
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    gestureHandling="cooperative"
                  >
                    <AdvancedMarker 
                      position={{ 
                        lat: listing.latitude ? parseFloat(String(listing.latitude)) : -26.204, 
                        lng: listing.longitude ? parseFloat(String(listing.longitude)) : 28.047 
                      }}
                    >
                      <Pin background="#ea4335" glyphColor="#fff" borderColor="#b31412" />
                    </AdvancedMarker>
                  </Map>
                </APIProvider>
              </div>
            )}
          </div>

          {/* PRICE TREND & HISTORY VISUALIZATION */}
          <div className="bg-natural-bg rounded-3xl border border-natural-border p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-natural-text text-sm flex items-center gap-1.5">
                  <LineChartIcon className="w-4 h-4 text-natural-green" />
                  Price History Trend
                </h4>
                {trend && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${trend.type === 'down' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {trend.type === 'down' ? `📉 -${trend.percent}% drop` : `📈 +${trend.percent}% rise`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-natural-dusty">Visual representation of price changes over time</p>
            </div>

            <div className="h-[200px] w-full font-mono text-[9px] -ml-4 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="#a3a3a3" 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#a3a3a3" 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `R${val >= 1000000 ? (val/1000000).toFixed(1) + 'M' : val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                    dx={-5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="displayPrice" 
                    stroke="#0a5c36" 
                    strokeWidth={2.5}
                    dot={{ r: 4, stroke: '#0a5c36', strokeWidth: 2, fill: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#0a5c36', strokeWidth: 2, fill: '#0a5c36' }}
                    name="Asking Price"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Sidebar (Price, Seller contacts, Internal Messages) */}
        <div className="space-y-6">
          
          {/* Price Card */}
          <div className="bg-gradient-to-br from-natural-green to-natural-green-hover text-white rounded-3xl p-6 shadow-md border border-natural-green/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-natural-cream/85">Asking Price (Rand)</span>
              {trend && (
                <span 
                  className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${
                    trend.type === 'down' 
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
                  }`}
                  title={`Original listing price: R${listing.priceHistory?.[0].price.toLocaleString('en-ZA')}`}
                >
                  {trend.type === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {trend.type === 'down' ? 'Price Dropped' : 'Price Increased'} ({trend.percent}%)
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-3xl font-serif font-black">R {listing.price.toLocaleString('en-ZA')}</h2>
              {listing.isNegotiable && (
                <span className="bg-natural-amber text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-natural-amber-hover/20">
                  Negotiable
                </span>
              )}
            </div>
          </div>

          {/* Price History Timeline Card */}
          {listing.priceHistory && listing.priceHistory.length > 0 && (
            <div className="bg-natural-bg rounded-3xl border border-natural-border p-5 shadow-xs space-y-4 text-natural-text">
              <div className="flex items-center justify-between border-b border-natural-border pb-2.5">
                <h4 className="font-serif font-bold text-natural-text text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-natural-green" />
                  Price History Trend
                </h4>
                <span className="text-[10px] font-mono text-natural-dusty font-bold uppercase">
                  {listing.priceHistory.length} Record{listing.priceHistory.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="relative pl-5 space-y-4 border-l border-natural-border/60 ml-2">
                {[...listing.priceHistory].reverse().map((record, index) => {
                  const isLatest = index === 0;
                  return (
                    <div key={index} className="relative space-y-1">
                      <div className={`absolute -left-[24.5px] top-1.5 w-2 h-2 rounded-full ${
                        isLatest 
                          ? 'bg-natural-green ring-4 ring-natural-green/20' 
                          : 'bg-natural-dusty'
                      }`} />
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${isLatest ? 'text-natural-text' : 'text-natural-muted'}`}>
                          R {record.price.toLocaleString('en-ZA')}
                        </span>
                        {isLatest && listing.priceHistory!.length > 1 && trend && (
                          <span className={`text-[9px] font-bold ${trend.type === 'down' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {trend.type === 'down' ? '↓' : '↑'} {trend.percent}%
                          </span>
                        )}
                      </div>
                      
                      <p className="text-[9px] text-natural-dusty font-medium font-mono">
                        {new Date(record.date).toLocaleDateString('en-ZA', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seller Coordinates Card */}
          <div className="bg-natural-bg rounded-3xl border border-natural-border p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 text-natural-text">
              <img
                src={listing.userPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=60'}
                alt=""
                className="w-11 h-11 rounded-full border border-natural-border"
              />
              <div>
                <span className="text-[10px] text-natural-dusty font-bold uppercase tracking-wider">Advertiser</span>
                <h4 className="font-bold text-natural-text text-sm">{listing.userName}</h4>
              </div>
            </div>
 
            {/* Direct Connect Buttons */}
            <div className="space-y-2 pt-2 border-t border-natural-border">
              <a
                href={`tel:${listing.contactPhone}`}
                className="w-full bg-natural-text hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-opacity cursor-pointer"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                Call: {listing.contactPhone}
              </a>
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-natural-green hover:bg-natural-green-hover text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer shadow-sm"
              >
                <MessageCircle className="w-4.5 h-4.5" />
                Chat via WhatsApp
              </a>
            </div>
          </div>
 
          {/* Share & Promote Listing Widget */}
          <div className="bg-natural-bg rounded-3xl border border-natural-border p-5 shadow-xs space-y-3 text-natural-text">
            <div>
              <h4 className="font-serif font-bold text-natural-text text-xs uppercase tracking-wider">Share & Promote Ad</h4>
              <p className="text-[10px] text-natural-dusty">Help the seller get more views by sharing across networks</p>
            </div>
 
            <div className="grid grid-cols-3 gap-2">
              {/* WhatsApp Button */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Howzit! Check out this listing on SA Market Hub: ' + listing.title + ' - ' + shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-2.5 bg-natural-cream/35 hover:bg-natural-cream/70 border border-natural-border rounded-2xl transition-all group text-natural-text"
                title="Share to WhatsApp"
              >
                <MessageCircle className="w-5 h-5 text-natural-green group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-natural-muted mt-1">WhatsApp</span>
              </a>
 
              {/* Facebook Button */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center p-2.5 bg-natural-cream/35 hover:bg-natural-cream/70 border border-natural-border rounded-2xl transition-all group text-natural-text"
                title="Share to Facebook"
              >
                <Facebook className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-natural-muted mt-1">Facebook</span>
              </a>
 
              {/* Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-2.5 bg-natural-cream/35 hover:bg-natural-cream/70 border border-natural-border rounded-2xl transition-all group cursor-pointer text-natural-text animate-none"
                title="Copy Listing Link"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-natural-green animate-bounce" />
                    <span className="text-[9px] font-bold text-natural-green mt-1">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-natural-amber group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold text-natural-muted mt-1">Copy Link</span>
                  </>
                )}
              </button>
            </div>
 
            {/* Native Device Share API Button if available */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleWebShare}
                className="w-full bg-natural-cream/55 border border-natural-border hover:bg-natural-cream text-natural-text text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-natural-green" />
                <span>Share via device options...</span>
              </button>
            )}
          </div>

          {/* Secure Message form */}
          {currentUser && currentUser.uid !== listing.userId && (
            <div className="bg-natural-bg rounded-3xl border border-natural-border p-5 shadow-xs space-y-3">
              <div>
                <h4 className="font-serif font-bold text-natural-text text-xs uppercase tracking-wider">Internal Secure Message</h4>
                <p className="text-[10px] text-natural-dusty">Keep chats local and safe</p>
              </div>

              {chatSuccess && (
                <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-start gap-1.5 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{chatSuccess}</span>
                </div>
              )}

              <form onSubmit={handleStartInternalChat} className="space-y-2">
                <textarea
                  required
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`e.g. Howzit, is this still available? Can we meet on Saturday?`}
                  className="w-full text-xs border border-natural-border rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-natural-green focus:border-natural-green bg-natural-cream/30 text-natural-text"
                />
                <button
                  type="submit"
                  disabled={isSendingChat}
                  className="w-full bg-natural-green hover:bg-natural-green-hover text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  {isSendingChat ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* Similar Listings */}
      {similarListings.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-natural-border text-natural-text">
          <h3 className="text-base font-serif font-black text-natural-text uppercase tracking-wide">Similar Advertisements Nearby</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {similarListings.map(l => (
              <div
                key={l.id}
                onClick={() => onSelectListing(l)}
                className="bg-natural-bg border border-natural-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all p-3 space-y-2.5 flex flex-col justify-between text-natural-text"
              >
                <img src={l.images?.[0]} alt="" className="w-full aspect-16/10 object-cover rounded-xl bg-natural-cream" />
                <div>
                  <h5 className="font-serif font-bold text-natural-text text-xs line-clamp-1">{l.title}</h5>
                  <p className="text-xs font-black text-natural-green">R {l.price.toLocaleString('en-ZA')}</p>
                  <p className="text-[10px] text-natural-muted mt-1">{l.suburb}, {l.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scam Report Modal Overlay */}
      {isReporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-natural-text">
          <form onSubmit={handleSubmitScamReport} className="bg-natural-bg w-full max-w-md p-6 rounded-3xl space-y-4 border border-natural-border shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-6 h-6 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-serif font-bold text-base">Report Fraudulent Listing</h4>
                <p className="text-[10px] text-natural-dusty">System Admin Security Audit</p>
              </div>
            </div>

            {reportSuccess ? (
              <div className="text-center py-6 text-emerald-800 font-semibold text-sm">
                Thank you! Flag logged. System admin will review this ad.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Select Scam Category</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full text-xs border border-natural-border rounded-xl px-3 py-2 outline-none bg-natural-cream/30 text-natural-text"
                    >
                      <option value="Fraud/Scam" className="bg-natural-bg">Fraud / Scam Listing</option>
                      <option value="Fake Seller" className="bg-natural-bg">Fake / Suspicious Seller</option>
                      <option value="Upfront Deposit Fee" className="bg-natural-bg">Upfront Deposit / Transport Fee requested</option>
                      <option value="Illegal Goods" className="bg-natural-bg">Illegal Goods / Wildlife trade</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-natural-dusty uppercase tracking-wider mb-1">Explain details</label>
                    <textarea
                      required
                      rows={3}
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      placeholder="Explain why this listing is high-risk (e.g. low price, requesting deposit upfront before inspection...)"
                      className="w-full text-xs border border-natural-border rounded-xl p-2.5 outline-none bg-natural-cream/30 text-natural-text"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReporting(false)}
                    className="px-4 py-2 bg-natural-cream text-natural-text font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-sm"
                  >
                    Submit Security Flag
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

    </div>
  );
}
