import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share, PlusSquare } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('samarket_pwa_dismissed') === 'true';
  });

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 3. Handle standard PWA installation prompt (Android, Chrome, Edge, PC)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Fallback for iOS / Safari (since it doesn't support beforeinstallprompt)
    if (isIosDevice && !isDismissed) {
      // Show iOS help banner
      setIsVisible(true);
    }

    // For testing/fallback on desktops where PWA prompt is already accepted or not yet fired,
    // we can show a gentle suggestion after 5 seconds to maximize adoption
    const timer = setTimeout(() => {
      if (!isDismissed && !deferredPrompt && !isStandalone) {
        setIsVisible(true);
      }
    }, 6000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [isDismissed, deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show native install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA Install Choice: ${outcome}`);
      setDeferredPrompt(null);
      setIsVisible(false);
    } else {
      // Generic browser install instructions / fallback
      alert("Lekker! To download to your phone:\n\n1. Click your browser's menu button (three dots ⋮ or share icon)\n2. Tap 'Add to Home Screen' or 'Install App'.");
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('samarket_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div 
      id="pwa-install-banner" 
      className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-natural-bg border-2 border-natural-green rounded-3xl shadow-2xl p-5 z-40 animate-fade-in text-natural-text"
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-natural-dusty hover:text-natural-muted transition-colors cursor-pointer"
        aria-label="Dismiss banner"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex gap-4">
        <div className="bg-natural-green text-white p-3 rounded-2xl h-fit shadow-md shrink-0">
          <Smartphone className="w-6 h-6 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h4 className="font-serif font-bold text-sm text-natural-text leading-tight">
            Download SA Market Hub App
          </h4>
          <p className="text-[11px] text-natural-muted leading-relaxed">
            Install the webapp on your phone to instantly upload photos of your bakkies, livestock, or products straight from your camera!
          </p>

          {isIOS ? (
            /* iOS Custom Safari Instructions */
            <div className="bg-natural-cream/60 border border-natural-border rounded-xl p-2.5 space-y-1.5 text-[10px] text-natural-text">
              <p className="font-bold text-natural-muted flex items-center gap-1">
                <Share className="w-3.5 h-3.5 text-natural-green" />
                iOS Installation Instructions:
              </p>
              <ol className="list-decimal pl-4 space-y-0.5 text-natural-muted">
                <li>Tap Safari's <strong className="text-natural-text font-black">Share</strong> button below.</li>
                <li>Scroll down and select <strong className="text-natural-text font-black">Add to Home Screen</strong>.</li>
              </ol>
            </div>
          ) : (
            /* Standard Install Button (Android/Chrome/PC) */
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="bg-natural-green hover:bg-natural-green-hover text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download App
              </button>
              <button
                onClick={handleDismiss}
                className="text-[10px] font-bold text-natural-dusty hover:text-natural-muted px-2.5 py-1.5 rounded-xl hover:bg-natural-cream transition-all"
              >
                Maybe Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
