import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getConfig } from "./config";

admin.initializeApp();

const config = getConfig();

/**
 * Example HTTP function using Doppler-managed secrets
 */
export const helloWorld = functions.https.onRequest((req, res) => {
  const apiKey = config.API_KEY;

  // Use the secret (don't log secrets in production!)
  if (process.env.NODE_ENV !== "production") {
    functions.logger.debug("API Key configured:", !!apiKey);
  }

  res.json({
    message: "Hello from Firebase with Doppler!",
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Example callable function
 */
export const getStatus = functions.https.onCall((data, context) => {
  return {
    status: "healthy",
    environment: config.NODE_ENV,
    databaseConfigured: !!config.DATABASE_URL,
  };
});

/**
 * Example scheduled function
 */
export const scheduledSync = functions.pubsub
  .schedule("every 6 hours")
  .onRun(async (context) => {
    functions.logger.info("Running scheduled sync", {
      environment: config.NODE_ENV,
    });

    // Your sync logic here using Doppler secrets
    // e.g., call external APIs with config.EXTERNAL_API_KEY

    return null;
  });
