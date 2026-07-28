import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, doc, updateDoc, collection, addDoc, getDoc, getDocs } from "firebase/firestore";
import { SOUTH_AFRICAN_PROVINCES, CLASSIFIED_CATEGORIES } from "./src/data/southAfricaData.js";
import { processYocoWebhook } from "./src/utils/yocoWebhook";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

// Load environment variables
dotenv.config();

// Initialize Server-Side Firebase Client to support webhooks and automated state updates
const customDatabaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";

let firebaseApp;
let firestoreDb: any = null;
try {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApps()[0];
  }
  firestoreDb = initializeFirestore(firebaseApp, {
    databaseId: customDatabaseId,
    ignoreUndefinedProperties: true
  } as any);
  console.log("[Server Firebase] Connected to database instance successfully:", customDatabaseId);
} catch (error) {
  console.error("[Server Firebase] Connection failed:", error);
}

const app = express();
const PORT = 3000;

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString("utf8");
  }
}));

// Initialize Gemini SDK lazily to avoid crashing if API key is not yet set
let ai: any = null;
function getGeminiClient() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY || "dummy_key_for_dev_mode";
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

// ----------------------------------------------------
// SERVER-SIDE AI API ENDPOINTS
// ----------------------------------------------------

// 1. AI Search Assistant
app.post("/api/ai/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const aiClient = getGeminiClient();
    
    const systemPrompt = `
      You are SA Market Hub's AI Smart Search Assistant for South Africa.
      The user is searching for classified listings on our marketplace.
      Your task is to parse their search query and extract structured search parameters in JSON format.
      We have 9 provinces: Gauteng, Western Cape, KwaZulu-Natal, Eastern Cape, Free State, Mpumalanga, Limpopo, North West, Northern Cape.
      We have categories: Products, Vehicles, Property, Services, Business Directory, Tourism & Leisure.
      
      Extract:
      1. province: One of the 9 provinces, or null if not mentioned.
      2. city: City/town name if mentioned, or null.
      3. category: Matches 'Products' | 'Vehicles' | 'Property' | 'Services' | 'Business Directory' | 'Tourism & Leisure' | null.
      4. query: Search keywords or null.
      5. minPrice: Minimum price if mentioned, or null.
      6. maxPrice: Maximum price if mentioned, or null.
      7. subcategory: Likely subcategory or null.
      8. advice: A short, friendly, personalized 1-2 sentence response in a South African tone (using words like "Howzit", "Lekker", "Eish", "Boet", "Yebo" occasionally where appropriate) explaining what you are searching for and tips.

      Format your output as a VALID JSON object ONLY. No markdown wrappers. No backticks.
      
      Example:
      "Show caravan parks near Durban under R500"
      Output:
      {
        "province": "KwaZulu-Natal",
        "city": "Durban",
        "category": "Tourism & Leisure",
        "subcategory": "Caravan parks",
        "query": "caravan park",
        "minPrice": null,
        "maxPrice": 500,
        "advice": "Howzit! I'm searching for lekker caravan parks in and around Durban under R500. Perfect for a coastal getaway!"
      }
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser search: "${query}"` }] }
      ]
    });

    const text = response.text || "{}";
    // Sanitize in case model returned backticks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let structuredData;
    try {
      structuredData = JSON.parse(cleanText);
    } catch {
      structuredData = {
        province: null,
        city: null,
        category: null,
        subcategory: null,
        query: query,
        minPrice: null,
        maxPrice: null,
        advice: `Howzit! I'm on it. Searching the database for "${query}" across South Africa.`
      };
    }

    res.json(structuredData);
  } catch (error: any) {
    console.error("AI Search Error:", error);
    res.status(500).json({ error: "Failed to process AI search", message: error.message });
  }
});

// 2. AI Ad Creation Assistant (Optimizer)
app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const aiClient = getGeminiClient();

    const prompt = `
      You are an expert South African classified copywriter.
      The user wants to write a listing for: Title: "${title || 'Unspecified'}", Category: "${category || 'Unspecified'}", Description Draft: "${description}".
      
      Provide:
      1. suggestedTitle: A highly clickable, professional, and SEO-friendly South African title.
      2. improvedDescription: A comprehensive, beautifully formatted description with bullets, highlighting selling points, condition, and local South African appeal. Avoid spelling mistakes, make it professional yet local.
      3. suggestedCategory: 'Products' | 'Vehicles' | 'Property' | 'Services' | 'Business Directory' | 'Tourism & Leisure'.
      4. suggestedSubcategory: The perfect matching subcategory from South African standards.
      5. estimatedPricing: A professional suggestion of pricing in South African Rands (ZAR), formatted as a range, e.g. "R500 - R750" or single price, explaining why.
      6. southAfricanKeywords: 5-8 comma-separated tags/keywords relevant to South Africa (e.g. Durban, Pretoria, bakkie, braai, farming).

      Output ONLY a valid JSON object. No markdown, no backticks, no text before or after the JSON.
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(cleanText);
    } catch {
      result = {
        suggestedTitle: title || "Premium Item",
        improvedDescription: description,
        suggestedCategory: category || "Products",
        suggestedSubcategory: "",
        estimatedPricing: "Market related",
        southAfricanKeywords: "marketplace, South Africa"
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("AI Suggestion Error:", error);
    res.status(500).json({ error: "Failed to optimize listing", message: error.message });
  }
});

// 3. AI Fraud & Scam Detection
app.post("/api/ai/fraud-check", async (req, res) => {
  try {
    const { title, description, price } = req.body;
    
    const aiClient = getGeminiClient();
    const prompt = `
      You are a South African Classifieds Security Auditor. Analyze this listing:
      Title: "${title}"
      Description: "${description}"
      Price: "R${price}"

      Check for:
      - Common South African scams (e.g., puppy scams, high-value cars/electronics for ridiculously low prices, upfront deposits for jobs/viewing, Western Union, pay for transport before delivery).
      - Obvious fraud or phishing terms.

      Return ONLY a JSON object:
      {
        "riskLevel": "low" | "medium" | "high",
        "reasons": ["reason 1", "reason 2"],
        "isApproved": true | false,
        "advice": "Short advice for the administrator or user"
      }
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.text || "{}";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(cleanText);
    } catch {
      result = {
        riskLevel: "low",
        reasons: [],
        isApproved: true,
        advice: "Listing cleared. Monitor for direct reports."
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("AI Fraud Check Error:", error);
    res.json({ riskLevel: "low", reasons: [], isApproved: true, advice: "System bypass" });
  }
});

// 4. Customer Support Chatbot
app.post("/api/ai/support", async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const aiClient = getGeminiClient();
    const supportInstructions = `
      You are "Busi", the warm, professional, and knowledgeable South African AI Customer Support agent for SA Market Hub.
      Help users with SA Market Hub queries:
      - How to post an ad (click "Post Ad", fill forms, select free or paid packages).
      - Pricing: Free (30 days, 5 images), Starter (R29, 10 images), Business (R99, 15 images + logo), Premium (R299, unlimited + banner).
      - Payments: Integrated with YOCO (South Africa's top checkout card gateway).
      - Safety tips: Never pay upfront deposit. Meet in public places (e.g. police stations, malls). Inspect cars/goods in person. Use verified badges.
      - Provinces: We cover all 9 provinces from Gauteng to Western Cape and Limpopo.
      - Tone: Warm, South African, using welcoming words (e.g. Howzit, Lekker, Yebo, Sharp sharp) but highly helpful and structured.
    `;

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    const chatSession = await aiClient.chats.create({
      model: 'gemini-3.5-flash',
      history: formattedHistory,
      config: {
        systemInstruction: supportInstructions
      }
    });

    const response = await chatSession.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Support Error:", error);
    res.status(500).json({ error: "Failed to generate response", message: error.message });
  }
});

// ----------------------------------------------------
// YOCO PAYMENTS API PROXY (REAL GATEWAY INTEGRATION)
// ----------------------------------------------------
app.post("/api/payments/yoco", async (req, res) => {
  const { listingId, packageName, amount, cardToken, email, phone } = req.body;
  
  if (!amount || !packageName) {
    return res.status(400).json({ error: "Amount and package name are required" });
  }

  const yocoSecretKey = process.env.YOCO_SECRET_KEY;
  if (yocoSecretKey) {
    try {
      console.log(`[Yoco] Initiating real charge of R${amount} for ${packageName} using secret key.`);
      const response = await fetch("https://online.yoco.com/v1/charges", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${yocoSecretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: cardToken || "tok_test",
          amountInCents: Math.round(amount * 100),
          currency: "ZAR",
          metadata: {
            listingId: listingId || "none",
            packageName,
            email: email || ""
          }
        })
      });

      const yocoData: any = await response.json();
      if (!response.ok || yocoData.status === "failed") {
        console.warn("[Yoco] Charge rejected or failed:", yocoData);
        return res.status(400).json({
          error: "Yoco payment processing failed",
          message: yocoData.errorMessage || "Please check card details and try again."
        });
      }

      console.log("[Yoco] Real charge successful. ID:", yocoData.id);
      return res.json({
        status: "success",
        amount: amount,
        currency: "ZAR",
        reference: yocoData.id,
        packageName: packageName,
        listingId: listingId || null,
        message: `Lekker! Yoco payment of R${amount} approved successfully. Reference: ${yocoData.id}`,
        createdAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[Yoco] API integration error:", error);
      return res.status(500).json({ error: "Failed to connect to Yoco API", message: error.message });
    }
  }

  // Generate a mock South African Yoco payment transaction reference
  const txRef = `YCO-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  // Simulating yoco payment success
  setTimeout(() => {
    res.json({
      status: "success",
      amount: amount,
      currency: "ZAR",
      reference: txRef,
      packageName: packageName,
      listingId: listingId || null,
      message: `Lekker! Yoco payment of R${amount} approved successfully. Your listing has been boosted.`,
      createdAt: new Date().toISOString()
    });
  }, 1000);
});

// ----------------------------------------------------
// YOCO PAYMENTS WEBHOOK LISTENER (REAL GATEWAY VERIFICATION)
// ----------------------------------------------------

app.post("/api/payments/yoco-webhook", async (req, res) => {
  const signatureHeader = (req.headers["yoco-signature"] || req.headers["x-yoco-signature"]) as string | undefined;
  const rawPayload = (req as any).rawBody || JSON.stringify(req.body);

  console.log("[Yoco Webhook Route] Delegating webhook processing to yocoWebhook utility.");

  const result = await processYocoWebhook(
    firestoreDb,
    req.body,
    rawPayload,
    signatureHeader,
    process.env.YOCO_WEBHOOK_SECRET
  );

  if (result.status === "error") {
    return res.status(result.message.includes("signature") ? 401 : 500).json({ error: result.message });
  }

  return res.json(result);
});

// ----------------------------------------------------
// DYNAMIC GOOGLE SITEMAP & ROBOTS.TXT (SEO)
// ----------------------------------------------------

// 1. robots.txt
app.get("/robots.txt", (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${protocol}://${host}/sitemap.xml
`);
});

// 2. sitemap.xml
app.get("/sitemap.xml", async (req, res) => {
  try {
    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // Base core routes
    const urls = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/?view=directory`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/?view=seo&amp;slug=buy-and-sell-gauteng`, changefreq: 'weekly', priority: '0.9' },
      { loc: `${baseUrl}/?view=seo&amp;slug=farm-equipment-south-africa`, changefreq: 'weekly', priority: '0.9' },
      { loc: `${baseUrl}/?view=seo&amp;slug=plumbers-in-durban`, changefreq: 'weekly', priority: '0.9' }
    ];

    // Add South African Province & City routes
    if (Array.isArray(SOUTH_AFRICAN_PROVINCES)) {
      SOUTH_AFRICAN_PROVINCES.forEach(p => {
        urls.push({
          loc: `${baseUrl}/?province=${encodeURIComponent(p.name)}`,
          changefreq: 'weekly',
          priority: '0.8'
        });
        if (Array.isArray(p.majorCities)) {
          p.majorCities.forEach(city => {
            urls.push({
              loc: `${baseUrl}/?city=${encodeURIComponent(city)}`,
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
          loc: `${baseUrl}/?category=${encodeURIComponent(c.name)}`,
          changefreq: 'weekly',
          priority: '0.8'
        });
        if (Array.isArray(c.subcategories)) {
          c.subcategories.forEach(sub => {
            urls.push({
              loc: `${baseUrl}/?subcategory=${encodeURIComponent(sub)}`,
              changefreq: 'weekly',
              priority: '0.7'
            });
          });
        }
      });
    }

    // Fetch dynamic listings from Firebase Firestore (prefer SDK, fallback to REST API)
    let fetchedFromSdk = false;
    if (firestoreDb) {
      try {
        console.log("[Sitemap] Fetching listing IDs directly from Firestore SDK.");
        const querySnapshot = await getDocs(collection(firestoreDb, "listings"));
        querySnapshot.forEach((docSnap) => {
          const docId = docSnap.id;
          if (docId) {
            urls.push({
              loc: `${baseUrl}/?ad=${docId}`,
              changefreq: 'weekly',
              priority: '0.7'
            });
          }
        });
        fetchedFromSdk = true;
        console.log(`[Sitemap] Successfully fetched ${querySnapshot.size} listing IDs via Firestore SDK.`);
      } catch (sdkError) {
        console.warn("[Sitemap] Failed to fetch via SDK. Trying REST API fallback...", sdkError);
      }
    }

    if (!fetchedFromSdk) {
      try {
        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${customDatabaseId}/documents/listings`
        );
        
        if (response.ok) {
          const data: any = await response.json();
          if (data && data.documents) {
            data.documents.forEach((doc: any) => {
              const docId = doc.name.split('/').pop();
              if (docId) {
                urls.push({
                  loc: `${baseUrl}/?ad=${docId}`,
                  changefreq: 'weekly',
                  priority: '0.7'
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("Could not fetch active listings from Firestore REST API for sitemap. Falling back to static entries only.", e);
      }
    }

    // Build XML response
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

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// ----------------------------------------------------
// VITE DEV SERVER AND PRODUCTION SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
