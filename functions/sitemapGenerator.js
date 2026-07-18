const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Dynamic South African Provinces & Cities to generate complete regional routes
const SOUTH_AFRICAN_PROVINCES = [
  {
    name: 'Gauteng',
    majorCities: ['Johannesburg', 'Pretoria', 'Midrand', 'Sandton', 'Soweto', 'Kempton Park', 'Centurion']
  },
  {
    name: 'Western Cape',
    majorCities: ['Cape Town', 'Stellenbosch', 'George', 'Knysna', 'Paarl', 'Mossel Bay', 'Hermanus']
  },
  {
    name: 'KwaZulu-Natal',
    majorCities: ['Durban', 'Pietermaritzburg', 'Newcastle', 'Richards Bay', 'Margate', 'Ballito']
  },
  {
    name: 'Eastern Cape',
    majorCities: ['Gqeberha (Port Elizabeth)', 'East London', 'Mthatha', 'Jeffreys Bay']
  },
  {
    name: 'Free State',
    majorCities: ['Bloemfontein', 'Welkom', 'Sasolburg', 'Kroonstad', 'Parys', 'Clarens']
  },
  {
    name: 'Mpumalanga',
    majorCities: ['Mbombela (Nelspruit)', 'Emalahleni (Witbank)', 'Secunda', 'Middelburg', 'Dullstroom']
  },
  {
    name: 'Limpopo',
    majorCities: ['Polokwane', 'Mokopane', 'Tzaneen', 'Thohoyandou', 'Bela-Bela (Warmbaths)']
  },
  {
    name: 'North West',
    majorCities: ['Rustenburg', 'Mahikeng (Mafikeng)', 'Potchefstroom', 'Brits', 'Hartbeespoort']
  },
  {
    name: 'Northern Cape',
    majorCities: ['Kimberley', 'Upington', 'Springbok', 'Kuruman', 'Colesberg']
  }
];

// Classified Categories & Subcategories to generate complete organic directory routes
const CLASSIFIED_CATEGORIES = [
  {
    name: 'Products',
    subcategories: ['Electronics', 'Phones', 'Computers', 'Furniture', 'Appliances', 'Clothing', 'Tools', 'Machinery', 'Garden equipment', 'Farm equipment', 'Livestock', 'Food products', 'Building materials']
  },
  {
    name: 'Vehicles',
    subcategories: ['Cars', 'Motorcycles', 'Trucks', 'Bakkies', 'Farming vehicles', 'Trailers']
  },
  {
    name: 'Property',
    subcategories: ['Houses', 'Flats', 'Farms', 'Rentals', 'Commercial property']
  },
  {
    name: 'Services',
    subcategories: ['Plumbers', 'Electricians', 'Builders', 'Lawyers', 'Accountants', 'Mechanics', 'Garden services', 'Cleaning services', 'Security companies', 'IT services', 'Marketing companies', 'Construction companies']
  },
  {
    name: 'Business Directory',
    subcategories: ['Restaurants', 'Shops', 'Accommodation', 'Tourism businesses']
  },
  {
    name: 'Tourism & Leisure',
    subcategories: ['Holiday resorts', 'Guest houses', 'Hotels', 'Caravan parks', 'Camping sites', 'Game reserves', 'Parks', 'Hiking trails', 'Rest stops', 'Road trip locations']
  }
];

/**
 * Escapes special XML characters to prevent syntax rendering issues
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Firebase Cloud Function v2 to dynamically generate a Google-compliant sitemap.xml
 */
exports.sitemap = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. Establish the domain dynamically based on incoming headers
    const host = req.get("host") || "samarkethub.co.za";
    const protocol = req.headers["x-forwarded-proto"] === "https" || req.secure ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    // 2. Initialize XML structure
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 3. Define core static routes
    const urls = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/?view=directory`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/?view=seo&amp;slug=buy-and-sell-gauteng`, changefreq: 'weekly', priority: '0.9' },
      { loc: `${baseUrl}/?view=seo&amp;slug=farm-equipment-south-africa`, changefreq: 'weekly', priority: '0.9' },
      { loc: `${baseUrl}/?view=seo&amp;slug=plumbers-in-durban`, changefreq: 'weekly', priority: '0.9' }
    ];

    // 4. Dynamic Province & City routes
    SOUTH_AFRICAN_PROVINCES.forEach(p => {
      urls.push({
        loc: `${baseUrl}/?province=${encodeURIComponent(p.name)}`,
        changefreq: 'weekly',
        priority: '0.8'
      });
      p.majorCities.forEach(city => {
        urls.push({
          loc: `${baseUrl}/?city=${encodeURIComponent(city)}`,
          changefreq: 'weekly',
          priority: '0.7'
        });
      });
    });

    // 5. Dynamic Category & Subcategory routes
    CLASSIFIED_CATEGORIES.forEach(c => {
      urls.push({
        loc: `${baseUrl}/?category=${encodeURIComponent(c.name)}`,
        changefreq: 'weekly',
        priority: '0.8'
      });
      c.subcategories.forEach(sub => {
        urls.push({
          loc: `${baseUrl}/?subcategory=${encodeURIComponent(sub)}`,
          changefreq: 'weekly',
          priority: '0.7'
        });
      });
    });

    // 6. Dynamic active listings fetched from Firestore
    try {
      // Lazy-get Firestore (assumes admin has already been initialized in the entrypoint index.js)
      const db = admin.firestore();
      
      // We fetch all listings and filter in-memory to avoid index errors or crashes
      const snapshot = await db.collection("listings").limit(1500).get();
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Check if listing is active
        const isActive = data.status === "active" || data.listingStatus === "active";
        
        if (isActive) {
          const docId = docSnap.id;
          urls.push({
            loc: `${baseUrl}/?ad=${docId}`,
            changefreq: 'weekly',
            priority: '0.7'
          });
        }
      });
    } catch (dbError) {
      console.warn("[Cloud Function Sitemap] Error querying Firestore, continuing with static routes:", dbError);
    }

    // 7. Render dynamic XML sitemap payload
    urls.forEach(item => {
      xml += `
  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    // 8. Serve sitemap with the correct XML headers
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=14400, s-maxage=14400"); // 4-hour cache
    return res.status(200).send(xml);

  } catch (error) {
    console.error("[Cloud Function Sitemap] Error generating dynamic sitemap:", error);
    res.setHeader("Content-Type", "text/plain");
    return res.status(500).send("Internal Server Error generating dynamic sitemap.");
  }
});
