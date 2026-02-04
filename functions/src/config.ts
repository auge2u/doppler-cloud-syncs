import * as functions from "firebase-functions";

/**
 * Configuration interface for type-safe secret access
 * Add your Doppler secrets here
 */
export interface AppConfig {
  // Environment
  NODE_ENV: string;

  // API Keys
  API_KEY?: string;
  EXTERNAL_API_KEY?: string;

  // Database
  DATABASE_URL?: string;

  // Firebase Functions config (legacy)
  [key: string]: string | undefined;
}

/**
 * Get configuration from environment variables (Doppler)
 * with fallback to Firebase Functions config (legacy)
 */
export function getConfig(): AppConfig {
  // Primary: Environment variables (set by Doppler)
  const envConfig: AppConfig = {
    NODE_ENV: process.env.NODE_ENV || "development",
    API_KEY: process.env.API_KEY,
    EXTERNAL_API_KEY: process.env.EXTERNAL_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  // Fallback: Firebase Functions config (legacy method)
  // Useful during migration from functions.config() to Doppler
  try {
    const firebaseConfig = functions.config();

    // Merge Firebase config as fallback (Doppler takes precedence)
    if (firebaseConfig.app) {
      envConfig.API_KEY = envConfig.API_KEY || firebaseConfig.app.api_key;
      envConfig.DATABASE_URL = envConfig.DATABASE_URL || firebaseConfig.app.database_url;
    }
    if (firebaseConfig.external) {
      envConfig.EXTERNAL_API_KEY = envConfig.EXTERNAL_API_KEY || firebaseConfig.external.api_key;
    }
  } catch {
    // functions.config() not available (e.g., in tests)
  }

  return envConfig;
}

/**
 * Validate required configuration
 * Call this at startup to fail fast if secrets are missing
 */
export function validateConfig(config: AppConfig, required: (keyof AppConfig)[]): void {
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  }
}
