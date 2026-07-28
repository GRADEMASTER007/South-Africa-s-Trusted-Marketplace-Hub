import React, { useState, useEffect } from 'react';
import { List, Calendar, Heart, MessageSquare, CreditCard, User, Sparkles, Check, AlertTriangle, Send, Phone, Bell, Trash2 } from 'lucide-react';
import { Listing, PaymentRecord, ChatThread, Message, Notification } from '../types';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

import ListingCard from './ListingCard';

interface UserDashboardProps {
  currentUser: any;
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  onRenewListing: (listing: Listing) => void;
  onUpgradeListing: (listing: Listing) => void;
  onDeleteListing: (id: string) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  onMarkSoldListing?: (listing: Listing) => void;
}

export default function UserDashboard({
  currentUser,
  listings,
  onSelectListing,
  onRenewListing,
  onUpgradeListing,
  onDeleteListing,
  onUpdatePrice,
  onMarkSoldListing
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'listings' | 'saved' | 'messages' | 'payments' | 'notifications'>('listings');
  const [subTab, setSubTab] = useState<'active' | 'expired' | 'drafts'>('active');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  const [editingPriceListingId, setEditingPriceListingId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>('');

  const [bookmarkedListingIds, setBookmarkedListingIds] = useState<string[]>([]);

  // Filter listings owned by current user
  const userListings = listings.filter(l => l.userId === currentUser.uid);
  const activeListings = userListings.filter(l => l.status === 'active');
  const expiredListings = userListings.filter(l => l.status === 'expired');
  const draftListings = userListings.filter(l => l.status === 'draft');

  // Derive bookmarked ads directly from state
  const bookmarkedAds = listings.filter(l => bookmarkedListingIds.includes(l.id));

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseAvailable && db) {
        // Fetch Payments
        const pQ = query(collection(db, "payments"), where("userId", "==", currentUser.uid));
        const pSnap = await getDocs(pQ);
        setPayments(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRecord)));

        // Fetch Notifications
        const nQ = query(collection(db, "notifications"), where("userId", "==", currentUser.uid));
        const nSnap = await getDocs(nQ);
        const fetchedNotifications = nSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        fetchedNotifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(fetchedNotifications as Notification[]);

        // Fetch Chats
        const cQ = query(
          collection(db, "chats"), 
          where("buyerId", "==", currentUser.uid)
        );
        const cSnap = await getDocs(cQ);
        let chatList = cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatThread));

        // Fetch Chats as Seller
        const cQ2 = query(
          collection(db, "chats"),
          where("sellerId", "==", currentUser.uid)
        );
        const cSnap2 = await getDocs(cQ2);
        const chatList2 = cSnap2.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatThread));
        
        setChats([...chatList, ...chatList2]);

        // Fetch Bookmarks
        const fQ = query(collection(db, "bookmarks"), where("userId", "==", currentUser.uid));
        const fSnap = await getDocs(fQ);
        setBookmarkedListingIds(fSnap.docs.map(doc => doc.data().listingId as string));
      } else {
        // Fallback Local Storage
        const localPayments = JSON.parse(localStorage.getItem('samarket_payments') || '[]')
          .filter((p: any) => p.userId === currentUser.uid);
        setPayments(localPayments);

        const localNotifications = JSON.parse(localStorage.getItem('samarket_notifications') || '[]')
          .filter((n: any) => n.userId === currentUser.uid)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(localNotifications);

        const localChats = JSON.parse(localStorage.getItem('samarket_chats') || '[]')
          .filter((c: any) => c.buyerId === currentUser.uid || c.sellerId === currentUser.uid);
        setChats(localChats);

        const localBookmarks = JSON.parse(localStorage.getItem(`samarket_bookmarks_${currentUser.uid}`) || '[]');
        setBookmarkedListingIds(localBookmarks);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.uid]);

  const handleMarkAsRead = async (id: string) => {
    try {
      if (isFirebaseAvailable && db) {
        await updateDoc(doc(db, "notifications", id), { read: true });
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      const local = JSON.parse(localStorage.getItem('samarket_notifications') || '[]');
      const updated = local.map((n: any) => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem('samarket_notifications', JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (isFirebaseAvailable && db) {
        await Promise.all(unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true })));
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      const local = JSON.parse(localStorage.getItem('samarket_notifications') || '[]');
      const updated = local.map((n: any) => ({ ...n, read: true }));
      localStorage.setItem('samarket_notifications', JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      if (isFirebaseAvailable && db) {
        await deleteDoc(doc(db, "notifications", id));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
      const local = JSON.parse(localStorage.getItem('samarket_notifications') || '[]');
      const filtered = local.filter((n: any) => n.id !== id);
      localStorage.setItem('samarket_notifications', JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleRemoveBookmark = async (listingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFirebaseAvailable && db) {
        const q = query(
          collection(db, "bookmarks"),
          where("userId", "==", currentUser.uid),
          where("listingId", "==", listingId)
        );
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
      }
      
      const localKey = `samarket_bookmarks_${currentUser.uid}`;
      const bookmarked = JSON.parse(localStorage.getItem(localKey) || '[]');
      const filtered = bookmarked.filter((id: string) => id !== listingId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
      
      setBookmarkedListingIds(filtered);
    } catch (err) {
      console.error("Error removing bookmark:", err);
    }
  };

  const handleSelectChat = async (chat: ChatThread) => {
    setSelectedChat(chat);
    try {
      if (isFirebaseAvailable && db) {
        const mSnap = await getDocs(
          query(collection(db, "messages"), where("chatId", "==", chat.id))
        );
        const sorted = mSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Message))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setChatMessages(sorted);
      } else {
        const localMsgs = JSON.parse(localStorage.getItem('samarket_messages') || '[]')
          .filter((m: any) => m.chatId === chat.id)
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setChatMessages(localMsgs);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;

    const newMsg = {
      chatId: selectedChat.id,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Me',
      text: replyText.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (isFirebaseAvailable && db) {
        await addDoc(collection(db, "messages"), newMsg);
        await updateDoc(doc(db, "chats", selectedChat.id), {
          lastMessageText: newMsg.text,
          lastMessageAt: newMsg.createdAt
        });
      } else {
        const localMsgs = JSON.parse(localStorage.getItem('samarket_messages') || '[]');
        localMsgs.push({ id: Math.random().toString(36).substring(2, 9), ...newMsg });
        localStorage.setItem('samarket_messages', JSON.stringify(localMsgs));

        const localChats = JSON.parse(localStorage.getItem('samarket_chats') || '[]');
        const updatedChats = localChats.map((c: any) => {
          if (c.id === selectedChat.id) {
            return {
              ...c,
              lastMessageText: newMsg.text,
              lastMessageAt: newMsg.createdAt
            };
          }
          return c;
        });
        localStorage.setItem('samarket_chats', JSON.stringify(updatedChats));
      }

      setReplyText('');
      handleSelectChat(selectedChat);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="user-dashboard-root" className="max-w-6xl mx-auto py-6 px-4 space-y-6 animate-fade-in text-natural-text">
      
      {/* User Card */}
      <div className="bg-natural-bg border border-natural-border rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=60'}
            alt=""
            className="w-16 h-16 rounded-full border border-natural-border"
          />
          <div>
            <h3 className="text-lg font-serif font-black text-natural-text">{currentUser.displayName || 'Classified Seller'}</h3>
            <p className="text-xs text-natural-muted">{currentUser.email}</p>
            <p className="text-[10px] font-bold text-natural-green uppercase tracking-widest mt-0.5">South Africa Seller Portal</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1 bg-natural-cream/20 p-1 rounded-xl border border-natural-border">
          {[
            { id: 'listings', label: 'My Ads', icon: List },
            { id: 'saved', label: 'Saved Ads', icon: Heart },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'payments', label: 'Yoco Payments', icon: CreditCard },
            { id: 'notifications', label: 'Notifications', icon: Bell }
          ].map(tab => {
            const Icon = tab.icon;
            const isNotifications = tab.id === 'notifications';
            const unreadCount = isNotifications ? notifications.filter(n => !n.read).length : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all relative ${
                  activeTab === tab.id 
                    ? 'bg-natural-green text-white' 
                    : 'text-natural-dusty hover:text-natural-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-xs text-natural-muted font-medium">Syncing profile records...</div>
      ) : (
        <div className="space-y-6">
          
          {/* MY LISTINGS PANEL */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-natural-border pb-2">
                {[
                  { id: 'active', label: `Active (${activeListings.length})` },
                  { id: 'expired', label: `Expired (${expiredListings.length})` },
                  { id: 'drafts', label: `Drafts (${draftListings.length})` }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSubTab(sub.id as any)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                      subTab === sub.id 
                        ? 'bg-natural-green/10 text-natural-green' 
                        : 'text-natural-dusty hover:text-natural-text'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Listings Display Grid */}
              {subTab === 'active' && (
                activeListings.length === 0 ? (
                  <div className="text-center py-10 bg-natural-bg border border-natural-border rounded-2xl text-xs text-natural-muted">No active advertisements. Put something up!</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeListings.map(l => (
                      <div key={l.id} className="bg-natural-bg border border-natural-border rounded-2xl p-4 flex flex-col gap-3 relative">
                        <div className="flex gap-3 justify-between">
                          <div className="flex gap-3">
                            <img src={l.images?.[0]} alt="" className="w-16 h-16 object-cover rounded-xl bg-natural-cream/20 shrink-0 border border-natural-border" />
                            <div className="space-y-1 min-w-0">
                              <h4 className="font-serif font-bold text-natural-text text-sm line-clamp-1">{l.title}</h4>
                              <p className="text-xs font-black text-natural-green">R {l.price.toLocaleString('en-ZA')}</p>
                              <p className="text-[10px] text-natural-muted">Expires: {new Date(l.expiresAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex flex-col justify-between items-end gap-2">
                            <button
                              onClick={() => onSelectListing(l)}
                              className="text-[10px] font-bold text-natural-green hover:text-natural-green-hover cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                setEditingPriceListingId(l.id);
                                setNewPriceValue(l.price.toString());
                              }}
                              className="text-[10px] font-bold text-natural-dusty hover:text-natural-text cursor-pointer"
                            >
                              Edit Price
                            </button>
                            <button
                              onClick={() => {
                                if (onMarkSoldListing) {
                                  onMarkSoldListing(l);
                                }
                              }}
                              className="bg-natural-text text-white hover:bg-natural-text/80 font-bold text-[10px] py-1 px-2.5 rounded-lg shadow-sm cursor-pointer"
                            >
                              Mark Sold
                            </button>
                            <button
                              onClick={() => onUpgradeListing(l)}
                              className="bg-natural-amber hover:opacity-90 text-white font-extrabold text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-0.5 shadow-sm cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              Boost
                            </button>
                          </div>
                        </div>

                        {editingPriceListingId === l.id && (
                          <div className="mt-2 pt-2 border-t border-natural-border flex gap-2 items-center">
                            <div className="text-[10px] font-bold text-natural-dusty uppercase">New Price:</div>
                            <input
                              type="number"
                              value={newPriceValue}
                              onChange={(e) => setNewPriceValue(e.target.value)}
                              className="border border-natural-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-natural-green bg-natural-cream/30 text-natural-text w-28"
                            />
                            <button
                              onClick={() => {
                                if (onUpdatePrice) {
                                  onUpdatePrice(l.id, parseFloat(newPriceValue) || 0);
                                }
                                setEditingPriceListingId(null);
                              }}
                              className="bg-natural-green hover:bg-natural-green-hover text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPriceListingId(null)}
                              className="bg-natural-cream text-natural-text text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer border border-natural-border"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {subTab === 'expired' && (
                expiredListings.length === 0 ? (
                  <div className="text-center py-10 bg-natural-bg border border-natural-border rounded-2xl text-xs text-natural-muted">No expired advertisements. Sharp sharp!</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {expiredListings.map(l => (
                      <div key={l.id} className="bg-natural-bg border border-natural-border rounded-2xl p-4 flex gap-3 relative justify-between border-dashed">
                        <div className="flex gap-3 opacity-60">
                          <img src={l.images?.[0]} alt="" className="w-16 h-16 object-cover rounded-xl bg-natural-cream/20 shrink-0 border border-natural-border" />
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-serif font-bold text-natural-text text-sm line-clamp-1">{l.title}</h4>
                            <p className="text-xs font-black text-natural-muted">R {l.price.toLocaleString('en-ZA')}</p>
                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Expired
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                          <button
                            onClick={() => onRenewListing(l)}
                            className="bg-natural-green hover:bg-natural-green-hover text-white font-extrabold text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                          >
                            Renew Free
                          </button>
                          <button
                            onClick={() => onUpgradeListing(l)}
                            className="bg-natural-amber hover:opacity-90 text-white font-bold text-[10px] py-1 px-3 rounded-lg cursor-pointer"
                          >
                            Boost & Upgrade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {subTab === 'drafts' && (
                draftListings.length === 0 ? (
                  <div className="text-center py-10 bg-natural-bg border border-natural-border rounded-2xl text-xs text-natural-muted font-medium">No drafts. Clear dashboard.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {draftListings.map(l => (
                      <div key={l.id} className="bg-natural-bg border border-natural-border rounded-2xl p-4 flex gap-3 relative justify-between">
                        <div className="flex gap-3">
                          <img src={l.images?.[0]} alt="" className="w-16 h-16 object-cover rounded-xl bg-natural-cream/20 shrink-0 border border-natural-border" />
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-serif font-bold text-natural-text text-sm line-clamp-1">{l.title}</h4>
                            <p className="text-xs text-natural-muted">R {l.price}</p>
                            <span className="text-[10px] font-bold text-natural-dusty bg-natural-cream/35 px-1.5 py-0.5 rounded-md">Draft</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-between items-end">
                          <button
                            onClick={() => onDeleteListing(l.id)}
                            className="text-red-500 hover:text-red-600 text-[10px] font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* SAVED LISTINGS */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-natural-cream/10 p-4 rounded-2xl border border-natural-border">
                <div>
                  <h4 className="font-serif font-black text-sm text-natural-text">Watchlist & Bookmarks</h4>
                  <p className="text-[11px] text-natural-muted">Listings you save will appear here. You'll get notified if they drop in price or change status.</p>
                </div>
              </div>

              {bookmarkedAds.length === 0 ? (
                <div className="text-center py-12 bg-natural-bg border border-natural-border rounded-3xl p-6 text-xs text-natural-muted font-medium">
                  You aren't watching any listings yet. Click "Watchlist & Bookmark" on any listing to get instant alerts!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookmarkedAds.map(l => {
                    const originalPrice = l.priceHistory?.[0]?.price || l.price;
                    const priceDropped = l.price < originalPrice;
                    const pctDiff = originalPrice > 0 ? Math.round(((originalPrice - l.price) / originalPrice) * 100) : 0;

                    return (
                      <div key={l.id} className="bg-natural-bg border border-natural-border rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:border-natural-green/40 shadow-xs relative">
                        <div className="relative aspect-video w-full bg-natural-cream overflow-hidden cursor-pointer" onClick={() => onSelectListing(l)}>
                          <img
                            src={l.images?.[0] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=60'}
                            alt={l.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-3 left-3 flex gap-2">
                            <div className="bg-black/70 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-xs">
                              {l.condition}
                            </div>
                            {l.status !== 'active' && (
                              <div className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md backdrop-blur-xs shadow-md">
                                {l.status}
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <div className="bg-natural-green text-white px-2.5 py-1 rounded-lg font-black text-xs shadow-md border border-natural-green/20">
                              R {l.price.toLocaleString('en-ZA')}
                            </div>
                            {priceDropped && (
                              <div className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-md">
                                📉 {pctDiff}% off!
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold text-natural-green uppercase tracking-wider">
                              {l.category} &bull; {l.subcategory}
                            </span>
                            <h4 className="font-serif font-black text-natural-text text-sm line-clamp-1 hover:underline cursor-pointer" onClick={() => onSelectListing(l)}>
                              {l.title}
                            </h4>
                            <p className="text-[10px] text-natural-muted font-mono">{l.suburb}, {l.city}</p>
                          </div>

                          <div className="pt-3 border-t border-natural-border flex gap-2 items-center justify-between">
                            <button
                              onClick={(e) => handleRemoveBookmark(l.id, e)}
                              className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-red-500 hover:text-red-600 hover:bg-red-50/50 border border-red-100 hover:border-red-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                              title="Remove bookmark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                            
                            <button
                              onClick={() => onSelectListing(l)}
                              className="text-[10px] font-extrabold uppercase bg-natural-green hover:bg-natural-green-hover text-white px-3 py-1.5 rounded-lg cursor-pointer shadow-xs transition-colors"
                            >
                              View Details ➔
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INTERNAL MESSAGES / CHATS */}
          {activeTab === 'messages' && (
            <div className="bg-natural-bg border border-natural-border rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-3 min-h-[400px] text-natural-text">
              {/* Thread list */}
              <div className="border-r border-natural-border divide-y divide-natural-border bg-natural-bg">
                <div className="bg-natural-cream/35 px-4 py-3 font-serif font-bold text-xs text-natural-muted uppercase tracking-wider">Inbox Threads</div>
                {chats.length === 0 ? (
                  <div className="text-center py-10 text-xs text-natural-muted">No active messaging chats.</div>
                ) : (
                  chats.map(chat => {
                    const isBuyer = chat.buyerId === currentUser.uid;
                    const recipientName = isBuyer ? chat.sellerName : chat.buyerName;
                    return (
                      <div
                        key={chat.id}
                        onClick={() => handleSelectChat(chat)}
                        className={`p-4 cursor-pointer hover:bg-natural-cream/10 transition-colors ${selectedChat?.id === chat.id ? 'bg-natural-green/5' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="font-serif font-extrabold text-natural-text text-xs">{recipientName}</h5>
                          <span className="text-[9px] text-natural-dusty">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-natural-green font-bold line-clamp-1">Re: {chat.listingTitle}</p>
                        <p className="text-xs text-natural-muted line-clamp-1 mt-1 font-sans">{chat.lastMessageText}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected thread window */}
              <div className="md:col-span-2 flex flex-col justify-between bg-natural-cream/5">
                {selectedChat ? (
                  <>
                    {/* Chat Header */}
                    <div className="bg-natural-bg border-b border-natural-border px-4 py-3 flex justify-between items-center text-natural-text">
                      <div>
                        <h4 className="font-serif font-bold text-xs text-natural-muted uppercase">Chat regarding:</h4>
                        <p className="font-serif font-extrabold text-sm text-natural-text">{selectedChat.listingTitle}</p>
                      </div>
                      <span className="text-xs font-black text-natural-green">R {selectedChat.listingPrice.toLocaleString('en-ZA')}</span>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[280px]">
                      {chatMessages.map(m => (
                        <div key={m.id} className={`flex ${m.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-xl px-3.5 py-2 text-xs shadow-xs ${
                            m.senderId === currentUser.uid 
                              ? 'bg-natural-green text-white rounded-br-none' 
                              : 'bg-natural-bg text-natural-text border border-natural-border rounded-bl-none'
                          }`}>
                            <p className="font-sans">{m.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Send box */}
                    <form onSubmit={handleSendReply} className="p-3 bg-natural-bg border-t border-natural-border flex gap-2">
                      <input
                        type="text"
                        required
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a message to agree on price/handover..."
                        className="flex-1 text-xs border border-natural-border rounded-xl px-3 py-2 outline-none bg-natural-cream/30 text-natural-text focus:ring-1 focus:ring-natural-green"
                      />
                      <button
                        type="submit"
                        className="bg-natural-green text-white p-2.5 rounded-xl hover:bg-natural-green-hover cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-natural-muted space-y-1.5">
                    <MessageSquare className="w-10 h-10 text-natural-dusty" />
                    <p className="font-serif font-bold text-xs text-natural-text">No Conversation Selected</p>
                    <p className="text-[10px] text-natural-muted">Click any thread in your inbox to start chatting securely.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* YOCO PAYMENTS TABLE */}
          {activeTab === 'payments' && (
            <div className="bg-natural-bg border border-natural-border rounded-3xl overflow-hidden shadow-xs text-natural-text">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-natural-cream/30 border-b border-natural-border text-[10px] text-natural-dusty font-bold uppercase tracking-wider">
                    <th className="p-4">Reference</th>
                    <th className="p-4">Upgrade Plan</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-natural-border font-medium">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-natural-muted">You haven't made any paid transactions yet. Free listings have zero charge!</td>
                    </tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id}>
                        <td className="p-4 font-mono font-bold text-natural-muted">{p.reference}</td>
                        <td className="p-4 text-natural-text uppercase">{p.packageName}</td>
                        <td className="p-4 font-black text-natural-green">R {p.amount}</td>
                        <td className="p-4 text-natural-dusty">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className="bg-natural-green/10 text-natural-green text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="text-[10px] font-bold text-natural-green hover:underline cursor-pointer"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-natural-cream/10 p-4 rounded-2xl border border-natural-border">
                <div>
                  <h4 className="font-serif font-black text-sm text-natural-text">Account Notifications</h4>
                  <p className="text-[11px] text-natural-muted">Stay up to date with your ad promotions and listing status updates.</p>
                </div>
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="bg-natural-green/10 hover:bg-natural-green/20 text-natural-green text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-natural-bg border border-natural-border border-dashed rounded-3xl text-xs text-natural-muted font-medium space-y-2">
                  <Bell className="w-8 h-8 text-natural-dusty mx-auto opacity-50" />
                  <p>You have no notifications yet.</p>
                  <p className="text-[10px] text-natural-dusty">When you boost your ads using Yoco, success alerts will appear here!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border transition-all flex justify-between items-start gap-4 ${
                        n.read
                          ? 'bg-natural-bg border-natural-border opacity-75'
                          : 'bg-natural-green/5 border-natural-green/30 shadow-xs'
                      }`}
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          n.type === 'payment' ? 'bg-natural-green/10 text-natural-green' : 'bg-natural-cream/40 text-natural-dusty'
                        }`}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-serif font-extrabold text-sm text-natural-text">{n.title}</h5>
                            {!n.read && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-natural-muted font-sans leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-natural-dusty font-medium">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="bg-natural-cream hover:bg-natural-cream-hover text-natural-text text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer border border-natural-border transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(n.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg cursor-pointer transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Printable Invoice/Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0 print:static print:inset-auto">
          <div className="bg-natural-bg border border-natural-border rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-xl relative print:border-none print:shadow-none print:p-0">
            {/* Close button - hidden in print */}
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-natural-dusty hover:text-natural-text p-1.5 rounded-lg border border-natural-border hover:bg-natural-cream/35 cursor-pointer print:hidden transition-all"
            >
              <span className="sr-only">Close</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {/* Receipt Content */}
            <div className="space-y-4 text-natural-text">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b border-natural-border">
                <span className="font-serif font-black text-lg tracking-tight uppercase text-natural-green">SA Market Hub</span>
                <p className="text-[10px] text-natural-dusty font-bold uppercase tracking-wider mt-1">Classifieds Operations Ltd (South Africa)</p>
                <p className="text-[9px] text-natural-muted">VAT Reg No: 4960123456 | Reg No: 2024/098765/07</p>
              </div>

              {/* Invoice details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-natural-dusty font-bold uppercase tracking-wider block">Billed To</span>
                  <p className="font-bold text-natural-text mt-0.5">{currentUser.displayName || "SA Market Hub Seller"}</p>
                  <p className="text-natural-muted text-[11px]">{currentUser.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-natural-dusty font-bold uppercase tracking-wider block">Receipt / Tax Invoice</span>
                  <p className="font-mono font-bold text-natural-text mt-0.5">{selectedReceipt.reference}</p>
                  <p className="text-natural-muted text-[11px]">{new Date(selectedReceipt.createdAt).toLocaleString('en-ZA')}</p>
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-natural-border rounded-2xl overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-natural-cream/30 p-3 font-bold text-[10px] text-natural-dusty uppercase border-b border-natural-border">
                  <span>Upgrade Feature</span>
                  <span className="text-center">Rate</span>
                  <span className="text-right">Total (ZAR)</span>
                </div>
                <div className="grid grid-cols-3 p-3 text-natural-text border-b border-natural-border/65">
                  <span className="font-bold uppercase">{selectedReceipt.packageName} Package boost</span>
                  <span className="text-center">R {selectedReceipt.amount.toFixed(2)}</span>
                  <span className="text-right font-black text-natural-green">R {selectedReceipt.amount.toFixed(2)}</span>
                </div>
                
                {/* VAT Calculation */}
                <div className="bg-natural-cream/15 p-3 space-y-1.5 text-xs text-natural-muted font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal (Excl. VAT)</span>
                    <span>R {(selectedReceipt.amount / 1.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (15%)</span>
                    <span>R {(selectedReceipt.amount - (selectedReceipt.amount / 1.15)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-serif font-black text-sm text-natural-text pt-1.5 border-t border-natural-border/50">
                    <span>Amount Paid (Incl. VAT)</span>
                    <span className="text-natural-green">R {selectedReceipt.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status and footer */}
              <div className="text-center space-y-2 pt-2 border-t border-natural-border">
                <div className="inline-flex items-center gap-1.5 bg-natural-green/10 text-natural-green text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-natural-green/20">
                  <span className="w-1.5 h-1.5 bg-natural-green rounded-full animate-pulse" />
                  <span>Verified Successful Payment via Yoco</span>
                </div>
                <p className="text-[10px] text-natural-dusty italic leading-relaxed">Thank you for your business! Your advertisement is now highly boosted to capture premium South African buyer leads.</p>
              </div>
            </div>

            {/* Action buttons - hidden in print */}
            <div className="flex gap-2.5 pt-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-natural-text hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                <span>Print Invoice</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 bg-natural-cream hover:bg-natural-cream-hover text-natural-text border border-natural-border font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer text-center transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
