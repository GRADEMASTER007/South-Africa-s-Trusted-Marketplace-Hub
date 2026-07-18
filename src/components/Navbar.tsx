import React, { useState } from 'react';
import { Menu, X, PlusCircle, User, LogIn, LogOut, ShieldCheck, Layers, BookOpen, Briefcase } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  currentUser: UserProfile | null;
  currentView: 'home' | 'detail' | 'create' | 'directory' | 'dashboard' | 'admin' | 'seo';
  onNavigate: (view: 'home' | 'detail' | 'create' | 'directory' | 'dashboard' | 'admin' | 'seo') => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export default function Navbar({
  currentUser,
  currentView,
  onNavigate,
  onSignOut,
  onOpenAuth
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  const handleLinkClick = (view: 'home' | 'detail' | 'create' | 'directory' | 'dashboard' | 'admin' | 'seo') => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-natural-bg/95 backdrop-blur-md border-b border-natural-border shadow-xs px-4 py-3.5 text-natural-text">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleLinkClick('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="bg-natural-green text-white font-serif font-black text-lg p-2 rounded-2xl shadow-md group-hover:scale-102 transition-transform">
            SA
          </div>
          <div>
            <h1 className="font-serif font-extrabold text-sm text-natural-text leading-tight">SA Market Hub</h1>
            <p className="text-[10px] text-natural-amber font-bold uppercase tracking-widest leading-none">Classified Marketplace</p>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-natural-muted">
          <button 
            onClick={() => handleLinkClick('home')}
            className={`hover:text-natural-green-hover cursor-pointer transition-colors ${currentView === 'home' ? 'text-natural-green' : ''}`}
          >
            Marketplace
          </button>
          
          <button 
            onClick={() => handleLinkClick('directory')}
            className={`hover:text-natural-green-hover cursor-pointer flex items-center gap-1 transition-colors ${currentView === 'directory' ? 'text-natural-green' : ''}`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Directories
          </button>

          <button 
            onClick={() => handleLinkClick('seo')}
            className={`hover:text-natural-green-hover cursor-pointer flex items-center gap-1 transition-colors ${currentView === 'seo' ? 'text-natural-green' : ''}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Portals (SEO)
          </button>

          {isAdmin && (
            <button 
              onClick={() => handleLinkClick('admin')}
              className={`hover:text-red-700 cursor-pointer flex items-center gap-1 transition-colors ${currentView === 'admin' ? 'text-red-600' : ''}`}
            >
              <Layers className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              Operations Center
            </button>
          )}
        </div>

        {/* Account controls */}
        <div className="hidden md:flex items-center gap-3 text-xs font-bold">
          {currentUser ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLinkClick('dashboard')}
                className="flex items-center gap-2 text-natural-text hover:text-natural-green-hover cursor-pointer"
              >
                <img 
                  src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=60'} 
                  alt="" 
                  className="w-7 h-7 rounded-full border border-natural-border"
                />
                <span className="line-clamp-1 max-w-[100px]">{currentUser.displayName}</span>
              </button>

              <button
                onClick={() => handleLinkClick('create')}
                className="bg-natural-green hover:bg-natural-green-hover text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Post Ad
              </button>

              <button
                onClick={onSignOut}
                className="text-natural-dusty hover:text-red-500 p-1 cursor-pointer transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-natural-green hover:bg-natural-green-hover text-white py-2.5 px-5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </button>
          )}
        </div>

        {/* Mobile menu triggers */}
        <div className="md:hidden flex items-center gap-2">
          {currentUser && (
            <button
              onClick={() => handleLinkClick('create')}
              className="bg-natural-green text-white p-2 rounded-xl"
            >
              <PlusCircle className="w-4.5 h-4.5" />
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-natural-muted hover:text-natural-text rounded-lg cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Links Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-natural-border mt-3 pt-4 pb-2 space-y-3.5 flex flex-col text-xs font-bold uppercase tracking-wider text-natural-muted">
          <button onClick={() => handleLinkClick('home')} className="hover:text-natural-green text-left px-2">Marketplace</button>
          <button onClick={() => handleLinkClick('directory')} className="hover:text-natural-green text-left px-2">Directories</button>
          <button onClick={() => handleLinkClick('seo')} className="hover:text-natural-green text-left px-2">SEO Portals</button>
          {isAdmin && (
            <button onClick={() => handleLinkClick('admin')} className="text-red-600 text-left px-2">Operations Center</button>
          )}

          <div className="border-t border-natural-border pt-3">
            {currentUser ? (
              <div className="space-y-3">
                <button
                  onClick={() => handleLinkClick('dashboard')}
                  className="flex items-center gap-2 text-natural-text px-2"
                >
                  <img src={currentUser.photoURL} alt="" className="w-7 h-7 rounded-full border border-natural-border" />
                  <span>{currentUser.displayName} (Account)</span>
                </button>
                <button
                  onClick={onSignOut}
                  className="text-red-500 hover:text-red-600 px-2 flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
                className="w-full bg-natural-green text-white text-center py-2.5 rounded-xl"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}

    </nav>
  );
}
