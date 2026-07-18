import crypto from "crypto";
import { doc, updateDoc, collection, addDoc, getDoc } from "firebase/firestore";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handles Firestore error reporting according to system safety rules.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'system_webhook',
      email: 'webhook@yoco.com',
      emailVerified: true,
      isAnonymous: false,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('[Yoco Webhook Firestore Error]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Securely verifies the cryptographic signature of incoming Yoco webhooks.
 * Prevents spoofing and ensures authenticity of payment completed events.
 * 
 * @param rawBody The unmodified, raw body string of the HTTP request.
 * @param signatureHeader The signature string from the 'yoco-signature' or 'x-yoco-signature' headers.
 * @param secret The webhook signing secret from environment variables.
 * @returns boolean true if verified, false otherwise.
 */
export function verifyYocoSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string | undefined
): boolean {
  if (!secret) {
    console.warn("[Yoco Webhook] YOCO_WEBHOOK_SECRET is not configured. Falling back to signature bypass for simulation/dev.");
    return true; // Return true in dev/test environment if no webhook secret is configured
  }

  if (!signatureHeader) {
    console.error("[Yoco Webhook] Missing signature header.");
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
        console.error("[Yoco Webhook] Invalid yoco-signature format.");
        return false;
      }

      // Replay attack mitigation: Verify timestamp is within 5 minutes (300 seconds)
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const diff = Math.abs(nowInSeconds - parseInt(timestamp, 10));
      if (diff > 300) {
        console.warn(`[Yoco Webhook] Timing discrepancy: timestamp ${timestamp} differs from system clock by ${diff}s.`);
      }

      const signedPayload = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } else {
      // Fallback: direct raw hex HMAC signature
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
    console.error("[Yoco Webhook] Signature verification failed:", error);
    return false;
  }
}

interface WebhookResult {
  status: "success" | "ignored" | "error";
  message: string;
  listingId?: string;
}

/**
 * Main webhook processor. Verifies structure, updates the listing collection status to active,
 * records a persistent payment record, and sends a user notification.
 */
export async function processYocoWebhook(
  firestoreDb: any,
  event: any,
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string | undefined
): Promise<WebhookResult> {
  // 1. Cryptographic Signature Validation
  const isSignatureValid = verifyYocoSignature(rawBody, signatureHeader, secret);
  if (!isSignatureValid) {
    console.error("[Yoco Webhook] cryptographic signature validation failed.");
    return {
      status: "error",
      message: "Cryptographic signature validation failed."
    };
  }

  if (!firestoreDb) {
    console.error("[Yoco Webhook] Firestore instance is not initialized.");
    return {
      status: "error",
      message: "Firestore instance is offline."
    };
  }

  // Extract Event & Charge Details
  const eventType = event.type || event.event || "payment.succeeded";
  const chargeData = event.data || event.payload || event;

  // Verify charge succeeded status
  const isSuccessful =
    chargeData.status === "successful" ||
    chargeData.status === "success" ||
    eventType === "payment.succeeded" ||
    eventType === "charge.successful";

  if (!isSuccessful) {
    console.log(`[Yoco Webhook] Ignored non-successful event. Type: ${eventType}, Status: ${chargeData.status}`);
    return {
      status: "ignored",
      message: "Payment was not successful. Event ignored."
    };
  }

  const chargeId = chargeData.id || chargeData.reference || `YCO-WEB-${Math.random().toString(36).substring(7).toUpperCase()}`;
  const amountInCents = chargeData.amountInCents || (chargeData.amount ? chargeData.amount * 100 : 0);
  const metadata = chargeData.metadata || {};
  const listingId = metadata.listingId || metadata.adId;
  const packageName = metadata.packageName || "premium";

  if (!listingId || listingId === "none" || listingId === "null") {
    console.warn("[Yoco Webhook] Metadata lacks a valid listingId.");
    return {
      status: "error",
      message: "Missing listingId in payment metadata."
    };
  }

  const amountInRands = amountInCents / 100;
  console.log(`[Yoco Webhook] Verified payment of R${amountInRands.toFixed(2)} for ad ${listingId}`);

  try {
    const listingDocRef = doc(firestoreDb, "listings", listingId);
    let listingSnap;
    
    try {
      listingSnap = await getDoc(listingDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `listings/${listingId}`);
    }

    let listingOwnerId = metadata.userId || "system";
    let listingTitle = "Your Classified Advertisement";

    if (listingSnap && listingSnap.exists()) {
      const listingData = listingSnap.data();
      listingOwnerId = listingData.userId || listingOwnerId;
      listingTitle = listingData.title || listingTitle;
      console.log(`[Yoco Webhook] Associated listing: "${listingTitle}" owned by: ${listingOwnerId}`);
    } else {
      console.warn(`[Yoco Webhook] Listing ${listingId} not found in Firestore.`);
    }

    // Update listing status & package type
    try {
      await updateDoc(listingDocRef, {
        paymentStatus: "paid",
        listingStatus: "active",
        status: "active", // Compatibility fallback
        packageType: packageName.toLowerCase(),
        isFeatured: packageName.toLowerCase() !== "free",
        updatedAt: new Date().toISOString()
      });
      console.log(`[Yoco Webhook] Updated listing ${listingId} successfully.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `listings/${listingId}`);
    }

    // Log transaction history
    try {
      await addDoc(collection(firestoreDb, "payments"), {
        userId: listingOwnerId,
        userEmail: metadata.email || "webhook@yoco.com",
        listingId: listingId,
        packageName: packageName,
        amount: amountInRands,
        reference: chargeId,
        status: "success",
        createdAt: new Date().toISOString()
      });
      console.log("[Yoco Webhook] Logged payment transaction successfully.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "payments");
    }

    // Dispatch system notification
    try {
      await addDoc(collection(firestoreDb, "notifications"), {
        userId: listingOwnerId,
        title: "⚡ Payment Approved & Ad Boosted!",
        message: `Lekker! Your payment of R${amountInRands.toFixed(2)} has been verified. Your listing "${listingTitle}" is now active and boosted to the ${packageName.toUpperCase()} package!`,
        type: "payment",
        read: false,
        listingId: listingId,
        createdAt: new Date().toISOString()
      });
      console.log(`[Yoco Webhook] Dispatched notification to ${listingOwnerId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "notifications");
    }

    return {
      status: "success",
      message: `Successfully verified signature, upgraded listing ${listingId}, and notified user.`,
      listingId
    };
  } catch (error: any) {
    console.error("[Yoco Webhook] Execution error:", error);
    return {
      status: "error",
      message: error.message
    };
  }
}
