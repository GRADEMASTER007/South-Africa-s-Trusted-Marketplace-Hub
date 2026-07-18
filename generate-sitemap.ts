import fs from 'fs';
import path from 'path';
import { SOUTH_AFRICAN_PROVINCES, CLASSIFIED_CATEGORIES } from './src/data/southAfricaData';
import firebaseConfig from './firebase-applet-config.json';

const BASE_URL = process.env.APP_URL || 'https://samarkethub.co.za';

async function generateSitemap() {
  console.log('--- Generating Dynamic Google Sitemap.xml ---');
  console.log(`Using Base URL: ${BASE_URL}`);

  // 1. Static Core Routes
  const urls = [
    { loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${BASE_URL}/?view=directory`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/?view=seo&amp;slug=buy-and-sell-gauteng`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/?view=seo&amp;slug=farm-equipment-south-africa`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/?view=seo&amp;slug=plumbers-in-durban`, changefreq: 'weekly', priority: '0.9' }
  ];

  // Add South African Province & City routes
  if (Array.isArray(SOUTH_AFRICAN_PROVINCES)) {
    SOUTH_AFRICAN_PROVINCES.forEach(p => {
      urls.push({
        loc: `${BASE_URL}/?province=${encodeURIComponent(p.name)}`,
        changefreq: 'weekly',
        priority: '0.8'
      });
      if (Array.isArray(p.majorCities)) {
        p.majorCities.forEach(city => {
          urls.push({
            loc: `${BASE_URL}/?city=${encodeURIComponent(city)}`,
            changefreq: 'weekly',
            priority: '0.7'
          });
        });
      }
    });
  }

  // Add Classified Categories & Subcategories routes
  if (Array.isArray(CLASSIFIED_CATEGORIES)) {
    CLASSIFIED_CATEGORIES.forEach(c => {
      urls.push({
        loc: `${BASE_URL}/?category=${encodeURIComponent(c.name)}`,
        changefreq: 'weekly',
        priority: '0.8'
      });
      if (Array.isArray(c.subcategories)) {
        c.subcategories.forEach(sub => {
          urls.push({
            loc: `${BASE_URL}/?subcategory=${encodeURIComponent(sub)}`,
            changefreq: 'weekly',
            priority: '0.7'
          });
        });
      }
    });
  }

  // 2. Fetch Dynamic Listings from Firestore REST API
  try {
    const customDatabaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${(firebaseConfig as any).projectId}/databases/${customDatabaseId}/documents/listings?pageSize=300`;
    const response = await fetch(firestoreUrl);
    
    if (response.ok) {
      const data: any = await response.json();
      if (data && data.documents) {
        console.log(`Found ${data.documents.length} listings in Firestore. Adding to sitemap...`);
        data.documents.forEach((doc: any) => {
          // Document name format is usually: projects/.../databases/.../documents/listings/listingId
          const docNameParts = doc.name.split('/');
          const docId = docNameParts[docNameParts.length - 1];
          if (docId) {
            urls.push({
              loc: `${BASE_URL}/?ad=${docId}`,
              changefreq: 'weekly',
              priority: '0.7'
            });
          }
        });
      } else {
        console.log('No listings returned from Firestore REST API.');
      }
    } else {
      console.warn(`Firestore REST API returned error status: ${response.status}. Using default listings fallback.`);
    }
  } catch (e) {
    console.warn('Could not fetch listings from Firestore REST API. Using fallback core sitemap.', e);
  }

  // 3. Construct XML structure
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  urls.forEach(u => {
    xml += `
  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  });

  xml += `\n</urlset>\n`;

  // 4. Write to root level as requested
  const rootSitemapPath = path.join(process.cwd(), 'sitemap.xml');
  fs.writeFileSync(rootSitemapPath, xml, 'utf8');
  console.log(`Successfully generated sitemap at root: ${rootSitemapPath}`);

  // 5. Write to public folder (so Vite bundles it in dist/ during build)
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xml, 'utf8');
  console.log(`Successfully copied sitemap to public: ${publicSitemapPath}`);
  console.log('--- Sitemap Generation Complete ---');
}

generateSitemap().catch(err => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
});
