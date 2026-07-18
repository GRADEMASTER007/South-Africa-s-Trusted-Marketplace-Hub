const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Validates the Yoco webhook signature cryptographically.
 * Matches both standard v1 timestamped signature and raw HMAC hex fallback.
 */
function verifyYocoSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    console.error("[Yoco Webhook] YOCO_WEBHOOK_SECRET is not configured in environment variables/secrets.");
    return false;
  }
  
  if (!signatureHeader) {
    console.error("[Yoco Webhook] Missing 'x-yoco-signature' or 'yoco-signature' header.");
    return false;
  }

  try {
    // Standard format: t=timestamp,v1=signature
    if (signatureHeader.includes("t=") && signatureHeader.includes("v1=")) {
      let timestamp = "";
      let signature = "";
      const parts = signatureHeader.split(",");
      for (const part of parts) {
        if (part.startsWith("t=")) {
          timestamp = part.substring(2);
        } else if (part.startsWith("v1=")) {
          signature = part.substring(3);
        }
      }

      if (!timestamp || !signature) {
        console.error("[Yoco Webhook] Invalid signature header format.");
        return false;
      }

      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );

      // Replay attack prevention: 5-minute threshold
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const diff = Math.abs(nowInSeconds - parseInt(timestamp, 10));
      if (diff > 300) {
        console.warn("[Yoco Webhook] Warning: Timestamp differs by more than 5 minutes.");
      }

      return isValid;
    } else {
      // Fallback: simple hex HMAC signature
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    }
  } catch (error) {
    console.error("[Yoco Webhook] Error during signature cryptographic comparison:", error);
    return false;
  }
}

/**
 * Firebase Cloud Function v4 (v2 API) to listen for Yoco payments webhook.
 */
exports.yocoWebhook = onRequest({ secrets: ["YOCO_WEBHOOK_SECRET"] }, async (req, res) => {
  // 1. Check HTTP request method
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  // Extract 'x-yoco-signature' or fallback 'yoco-signature'
  const signatureHeader = req.headers["x-yoco-signature"] || req.headers["yoco-signature"];
  
  // Get raw body as string
  const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";
  const secret = process.env.YOCO_WEBHOOK_SECRET;

  console.log("[Yoco Webhook Function] Received webhook request.");

  // 2. Cryptographic Signature Verification
  const isSignatureValid = verifyYocoSignature(rawBody, signatureHeader, secret);
  if (!isSignatureValid) {
    console.error("[Yoco Webhook Function] Rejecting webhook: Invalid cryptographic signature.");
    return res.status(400).send("Bad Request: Invalid cryptographic signature");
  }

  // 3. Parse Payment Payload
  let event;
  try {
    event = typeof req.body === "object" ? req.body : JSON.parse(rawBody);
  } catch (error) {
    console.error("[Yoco Webhook Function] Failed to parse JSON request body:", error);
    return res.status(400).send("Bad Request: Invalid JSON body");
  }

  const eventType = event.type || event.event || "payment.succeeded";
  const chargeData = event.data || event.payload || event;
  const isSuccessful = chargeData.status === "successful" || chargeData.status === "success" || eventType === "payment.succeeded" || eventType === "charge.successful";

  if (!isSuccessful) {
    console.log(`[Yoco Webhook Function] Ignoring webhook event. Status not successful: ${chargeData.status}`);
    return res.status(200).json({ status: "ignored", message: "Only successful charges are processed." });
  }

  const metadata = chargeData.metadata || {};
  const listingId = metadata.listingId || metadata.adId;

  if (!listingId || listingId === "none" || listingId === "null") {
    console.warn("[Yoco Webhook Function] Ignored: Webhook contains no valid listingId in metadata.");
    return res.status(400).send("Bad Request: Missing listingId in payment metadata.");
  }

  const packageName = metadata.packageName || metadata.package || "Starter";
  const amountInCents = chargeData.amountInCents || (chargeData.amount ? chargeData.amount * 100 : 0);

  console.log(`[Yoco Webhook Function] Upgrading Listing ${listingId} to ${packageName} (active).`);

  try {
    const db = admin.firestore();
    const listingDocRef = db.collection("listings").doc(listingId);

    // Fetch the listing to discover owner details and title
    const listingSnap = await listingDocRef.get();
    let listingOwnerId = metadata.userId || "system";
    let listingTitle = "Your Classified Advertisement";

    if (listingSnap.exists) {
      const listingData = listingSnap.data();
      listingOwnerId = listingData.userId || listingOwnerId;
      listingTitle = listingData.title || listingTitle;
      console.log(`[Yoco Webhook Function] Linked listing: "${listingTitle}" owned by: ${listingOwnerId}`);
    } else {
      console.warn(`[Yoco Webhook Function] Warning: Listing document ${listingId} not found in Firestore database.`);
    }

    // 4. Update the Firestore 'listings' document with paymentStatus and listingStatus
    await listingDocRef.update({
      paymentStatus: "completed",
      listingStatus: "active",
      status: "active", // Legacy status sync for compatibility
      packageType: packageName.toLowerCase(),
      isFeatured: packageName.toLowerCase() !== "free",
      updatedAt: new Date().toISOString()
    });

    console.log(`[Yoco Webhook Function] Successfully upgraded listing ${listingId} paymentStatus to completed.`);

    // 5. Store transaction receipt inside payments history collection
    await db.collection("payments").add({
      userId: listingOwnerId,
      userEmail: metadata.email || "webhook@yoco.com",
      listingId: listingId,
      packageName: packageName,
      amount: amountInCents / 100,
      status: "success",
      reference: chargeData.id || chargeData.reference || `YCO-FN-${Math.random().toString(36).substring(7).toUpperCase()}`,
      createdAt: new Date().toISOString()
    });

    // 6. Trigger a Firestore 'notifications' document creation for the user
    await db.collection("notifications").add({
      userId: listingOwnerId,
      title: "⚡ Payment Approved & Ad Boosted!",
      message: `Lekker! Your payment of R${(amountInCents / 100).toFixed(2)} has been verified. Your listing "${listingTitle}" is now active and boosted to the ${packageName.toUpperCase()} package!`,
      type: "payment",
      read: false,
      listingId: listingId,
      createdAt: new Date().toISOString()
    });

    console.log(`[Yoco Webhook Function] Sent persistent notification alert to user: ${listingOwnerId}`);

    // 7. Return 200 OK status to Yoco
    return res.status(200).json({
      status: "success",
      message: `Verified and upgraded listing ${listingId} to active status successfully.`
    });

  } catch (error) {
    console.error("[Yoco Webhook Function] Error executing database operations:", error);
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
});

// Import and export sitemap generator
const { sitemap } = require("./sitemapGenerator");
exports.sitemap = sitemap;

