import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Trash2, Check, XCircle, AlertTriangle, TrendingUp, DollarSign, ListOrdered, Percent } from 'lucide-react';
import { Listing, ScamReport, UserProfile } from '../types';
import { db, isFirebaseAvailable } from '../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminPanelProps {
  currentUser: UserProfile;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'reports' | 'listings' | 'users'>('stats');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseAvailable && db) {
        // Fetch real data
        const lSnap = await getDocs(collection(db, "listings"));
        const fetchedListings = lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
        setListings(fetchedListings);

        const rSnap = await getDocs(collection(db, "scam_reports"));
        const fetchedReports = rSnap.docs.map(d => ({ id: d.id, ...d.data() } as ScamReport));
        setReports(fetchedReports);

        const uSnap = await getDocs(collection(db, "users"));
        const fetchedUsers = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any as UserProfile));
        setUsers(fetchedUsers);
      } else {
        // Fallback local mock data
        const localListings = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
        setListings(localListings);

        const localReports = JSON.parse(localStorage.getItem('samarket_reports') || '[]');
        setReports(localReports);

        const localUsers = JSON.parse(localStorage.getItem('samarket_users') || '[]');
        setUsers(localUsers);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveReport = async (reportId: string, listingId: string, action: 'ban' | 'dismiss') => {
    try {
      if (action === 'ban') {
        // Delete listing
        if (isFirebaseAvailable && db) {
          await deleteDoc(doc(db, "listings", listingId));
          // Update report status
          await updateDoc(doc(db, "scam_reports", reportId), { status: 'resolved' });
        } else {
          const lLocal = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
          const rLocal = JSON.parse(localStorage.getItem('samarket_reports') || '[]');
          
          localStorage.setItem('samarket_listings', JSON.stringify(lLocal.filter((l: any) => l.id !== listingId)));
          localStorage.setItem('samarket_reports', JSON.stringify(
            rLocal.map((r: any) => r.id === reportId ? { ...r, status: 'resolved' } : r)
          ));
        }
      } else {
        // Dismiss report
        if (isFirebaseAvailable && db) {
          await updateDoc(doc(db, "scam_reports", reportId), { status: 'dismissed' });
        } else {
          const rLocal = JSON.parse(localStorage.getItem('samarket_reports') || '[]');
          localStorage.setItem('samarket_reports', JSON.stringify(
            rLocal.map((r: any) => r.id === reportId ? { ...r, status: 'dismissed' } : r)
          ));
        }
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      if (isFirebaseAvailable && db) {
        await deleteDoc(doc(db, "listings", listingId));
      } else {
        const lLocal = JSON.parse(localStorage.getItem('samarket_listings') || '[]');
        localStorage.setItem('samarket_listings', JSON.stringify(lLocal.filter((l: any) => l.id !== listingId)));
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlock = async (uid: string, currentBlocked: boolean) => {
    try {
      const newBlocked = !currentBlocked;
      if (isFirebaseAvailable && db) {
        // Import doc and updateDoc are already present
        await updateDoc(doc(db, "users", uid), { isBlocked: newBlocked });
      } else {
        const uLocal = JSON.parse(localStorage.getItem('samarket_users') || '[]');
        const updated = uLocal.map((u: any) => u.uid === uid ? { ...u, isBlocked: newBlocked } : u);
        localStorage.setItem('samarket_users', JSON.stringify(updated));
      }
      alert(`User account ${newBlocked ? 'blocked' : 'unblocked'} successfully.`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Compile Recharts statistics
  const categoryCounts: { [key: string]: number } = {};
  listings.forEach(l => {
    categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
  });
  const chartData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    listings: categoryCounts[cat]
  }));

  const packagesCounts = { free: 0, starter: 0, business: 0, premium: 0 };
  let estimatedRevenue = 0;
  listings.forEach(l => {
    if (l.packageType === 'free') packagesCounts.free += 1;
    if (l.packageType === 'starter') { packagesCounts.starter += 1; estimatedRevenue += 29; }
    if (l.packageType === 'business') { packagesCounts.business += 1; estimatedRevenue += 99; }
    if (l.packageType === 'premium') { packagesCounts.premium += 1; estimatedRevenue += 299; }
  });

  const pieData = [
    { name: 'Free', value: packagesCounts.free, color: '#9ca3af' },
    { name: 'Starter (R29)', value: packagesCounts.starter, color: '#10b981' },
    { name: 'Business (R99)', value: packagesCounts.business, color: '#6366f1' },
    { name: 'Premium (R299)', value: packagesCounts.premium, color: '#f59e0b' }
  ].filter(p => p.value > 0);

  return (
    <div id="admin-dashboard" className="max-w-6xl mx-auto py-6 px-4 space-y-6 animate-fade-in text-natural-text">
      
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-natural-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-natural-green/10 text-natural-green text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
              System Admin
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black text-natural-text tracking-tight">Marketplace Operations Portal</h2>
          <p className="text-xs text-natural-muted">Approve listings, review scam flags, and monitor Yoco earnings</p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1.5 bg-natural-cream/25 p-1 rounded-xl border border-natural-border">
          {(['stats', 'reports', 'listings', 'users'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider cursor-pointer transition-all ${
                activeTab === tab 
                  ? 'bg-natural-bg text-natural-text shadow-xs border border-natural-border' 
                  : 'text-natural-dusty hover:text-natural-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-xs text-natural-muted">Syncing system records...</div>
      ) : activeTab === 'stats' ? (
        <div className="space-y-6">
          
          {/* Key Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-border flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Total Listings</p>
                <h4 className="text-2xl font-serif font-black text-natural-text">{listings.length}</h4>
              </div>
              <div className="bg-natural-green/10 p-3 rounded-xl text-natural-green">
                <ListOrdered className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-border flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Scam Reports</p>
                <h4 className="text-2xl font-serif font-black text-natural-amber">{reports.filter(r => r.status === 'pending').length}</h4>
              </div>
              <div className="bg-natural-amber/15 p-3 rounded-xl text-natural-amber">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-border flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Yoco Sales (ZAR)</p>
                <h4 className="text-2xl font-serif font-black text-natural-green">R{estimatedRevenue.toLocaleString('en-ZA')}</h4>
              </div>
              <div className="bg-natural-cream p-3 rounded-xl text-natural-green">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-border flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-natural-dusty uppercase tracking-wider">Users Registered</p>
                <h4 className="text-2xl font-serif font-black text-natural-text">{users.length || 12}</h4>
              </div>
              <div className="bg-natural-cream p-3 rounded-xl text-natural-amber">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Chart */}
            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-border shadow-xs space-y-4">
              <div>
                <h4 className="font-serif font-bold text-natural-text text-sm">Listings by Category</h4>
                <p className="text-[11px] text-natural-muted">Total advertisements currently published</p>
              </div>
              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D9" />
                      <XAxis dataKey="name" stroke="#6B665E" fontSize={10} tickLine={false} />
                      <YAxis stroke="#6B665E" fontSize={10} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(232, 226, 217, 0.2)' }} />
                      <Bar dataKey="listings" fill="#2D5A27" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-natural-muted">No active listing counts.</div>
                )}
              </div>
            </div>

            {/* Package Upgrades Chart */}
            <div className="bg-natural-bg p-5 rounded-2xl border border-natural-border shadow-xs space-y-4">
              <div>
                <h4 className="font-serif font-bold text-natural-text text-sm">Yoco Upgrade Subscription Share</h4>
                <p className="text-[11px] text-natural-muted">Breakdown of Free vs Paid listing plans</p>
              </div>
              <div className="h-64 w-full flex items-center justify-center">
                {pieData.length > 0 ? (
                  <div className="w-full h-full flex flex-col md:flex-row items-center justify-around gap-2">
                    <div className="w-40 h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color === '#10b981' ? '#2D5A27' : entry.color === '#f59e0b' ? '#D97706' : entry.color === '#6366f1' ? '#6B665E' : '#E8E2D9'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 text-xs text-natural-muted">
                      {pieData.map((entry, idx) => {
                        const cellColor = entry.color === '#10b981' ? '#2D5A27' : entry.color === '#f59e0b' ? '#D97706' : entry.color === '#6366f1' ? '#6B665E' : '#E8E2D9';
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cellColor }} />
                            <span className="font-semibold text-natural-text">{entry.name}</span>
                            <span>({entry.value} ads)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-natural-muted">Publish paid listings to see income breakdowns.</div>
                )}
              </div>
            </div>
          </div>

        </div>
      ) : activeTab === 'reports' ? (
        <div className="bg-natural-bg border border-natural-border rounded-3xl overflow-hidden">
          <div className="bg-natural-cream/35 px-5 py-3 border-b border-natural-border flex items-center justify-between text-xs font-serif font-bold text-natural-muted uppercase">
            <span>Scam Flag Alert List</span>
            <span>Actions</span>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-10 text-xs text-natural-muted font-medium">Lekker! No safety scam flags received.</div>
          ) : (
            <div className="divide-y divide-natural-border">
              {reports.map((r) => (
                <div key={r.id} className="p-5 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        r.status === 'pending' ? 'bg-natural-amber/15 text-natural-amber border border-natural-amber/20' : 'bg-natural-cream/30 text-natural-muted'
                      }`}>
                        {r.status}
                      </span>
                      <h5 className="font-serif font-bold text-natural-text text-sm">{r.listingTitle}</h5>
                    </div>
                    <p className="text-xs text-natural-muted font-bold">Reason: <span className="text-natural-amber font-normal">{r.reason}</span></p>
                    <p className="text-xs text-natural-muted italic bg-natural-cream/15 p-2.5 rounded-xl border border-natural-border">
                      "{r.description}"
                    </p>
                    <p className="text-[10px] text-natural-dusty font-medium">Flagged by: {r.reporterEmail} &bull; {new Date(r.createdAt).toLocaleString()}</p>
                  </div>

                  {r.status === 'pending' && (
                    <div className="flex md:flex-col justify-end gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveReport(r.id, r.listingId, 'ban')}
                        className="bg-natural-amber hover:opacity-90 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Ban Ad & Seller
                      </button>
                      <button
                        onClick={() => handleApproveReport(r.id, r.listingId, 'dismiss')}
                        className="bg-natural-cream hover:opacity-90 text-natural-text border border-natural-border font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-natural-green" />
                        Dismiss Flag
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'listings' ? (
        <div className="bg-natural-bg border border-natural-border rounded-3xl overflow-hidden shadow-xs">
          <div className="bg-natural-cream/35 px-5 py-3 border-b border-natural-border text-xs font-serif font-bold text-natural-muted uppercase">
            Platform Listings Directory
          </div>

          <div className="divide-y divide-natural-border max-h-96 overflow-y-auto">
            {listings.length === 0 ? (
              <div className="text-center py-10 text-xs text-natural-muted">No active marketplace advertisements.</div>
            ) : (
              listings.map((l) => (
                <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={l.images?.[0] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60'} 
                      alt="" 
                      className="w-10 h-10 object-cover rounded-lg bg-natural-cream/20 border border-natural-border"
                    />
                    <div>
                      <h5 className="font-bold text-natural-text text-xs line-clamp-1">{l.title}</h5>
                      <p className="text-[10px] text-natural-muted font-bold uppercase tracking-wide">
                        R{l.price} &bull; {l.province} &bull; {l.packageType}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteListing(l.id)}
                    className="p-2 text-natural-amber hover:bg-natural-amber/10 rounded-xl transition-all cursor-pointer"
                    title="Remove listing from platform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-natural-bg border border-natural-border rounded-3xl overflow-hidden">
          <div className="bg-natural-cream/35 px-5 py-3 border-b border-natural-border text-xs font-serif font-bold text-natural-muted uppercase">
            South African Accounts
          </div>
          <div className="divide-y divide-natural-border">
            {users.map((u) => (
              <div key={u.uid} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={u.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'}
                    alt=""
                    className="w-8 h-8 rounded-full border border-natural-border"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-natural-text text-xs">{u.displayName}</h5>
                      {u.isBlocked && (
                        <span className="bg-red-50 text-red-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-red-100 uppercase tracking-wider">
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-natural-muted">{u.email} &bull; {u.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-natural-dusty font-bold">UID: {u.uid.substring(0, 8)}</span>
                  {u.uid !== currentUser.uid && (
                    <button
                      onClick={() => handleToggleBlock(u.uid, !!u.isBlocked)}
                      className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                        u.isBlocked
                          ? 'bg-natural-green/10 text-natural-green border-natural-green/20 hover:bg-natural-green/20'
                          : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/50'
                      }`}
                    >
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
