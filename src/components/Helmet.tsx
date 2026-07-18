import { useEffect } from 'react';

interface HelmetProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
}

export default function Helmet({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalUrl,
}: HelmetProps) {
  useEffect(() => {
    // Save previous title
    const prevTitle = document.title;
    document.title = title;

    // Helper to update or create elements in head
    const updateOrCreateTag = (
      selector: string, 
      tagName: 'meta' | 'link', 
      attributes: Record<string, string>
    ) => {
      try {
        let element = document.head.querySelector(selector) as HTMLElement | null;
        if (!element) {
          element = document.createElement(tagName);
          Object.entries(attributes).forEach(([key, val]) => {
            element!.setAttribute(key, val);
          });
          document.head.appendChild(element);
        } else {
          Object.entries(attributes).forEach(([key, val]) => {
            element!.setAttribute(key, val);
          });
        }
      } catch (err) {
        console.warn(`Could not update tag: ${selector}`, err);
      }
    };

    // Update description, title
    updateOrCreateTag('meta[name="description"]', 'meta', { name: 'description', content: description });
    updateOrCreateTag('meta[name="title"]', 'meta', { name: 'title', content: title });

    // Open Graph attributes
    updateOrCreateTag('meta[property="og:title"]', 'meta', { property: 'og:title', content: title });
    updateOrCreateTag('meta[property="og:description"]', 'meta', { property: 'og:description', content: description });
    updateOrCreateTag('meta[property="og:type"]', 'meta', { property: 'og:type', content: ogType });
    
    const currentUrl = window.location.href;
    updateOrCreateTag('meta[property="og:url"]', 'meta', { property: 'og:url', content: canonicalUrl || currentUrl });

    const finalImage = ogImage || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&auto=format&fit=crop&q=80';
    updateOrCreateTag('meta[property="og:image"]', 'meta', { property: 'og:image', content: finalImage });

    // Canonical link
    updateOrCreateTag('link[rel="canonical"]', 'link', { rel: 'canonical', href: canonicalUrl || currentUrl });

    // Restores default values on unmount
    return () => {
      document.title = prevTitle;
    };
  }, [title, description, ogImage, ogType, canonicalUrl]);

  return null;
}
