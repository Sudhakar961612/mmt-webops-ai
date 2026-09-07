import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the server root (one level up from config/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, def = false) => {
  if (v === undefined || v === null) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const int = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? def : n;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: int(process.env.PORT, 5000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mmt-webops-ai',
  AUTO_MONGODB_MEMORY: bool(process.env.AUTO_MONGODB_MEMORY, false),
  // Keep local development working while allowing the production frontend when
  // Render is deployed before its environment variables have been configured.
  // Set CLIENT_ORIGIN explicitly in production; it accepts comma-separated URLs.
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173,https://mmt-webops-ai.vercel.app',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DEMO_MODE: bool(process.env.DEMO_MODE, true),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || `http://localhost:${int(process.env.PORT, 5000)}`,
  BROWSER_HEADLESS: bool(process.env.BROWSER_HEADLESS, false),
  BROWSER_EXECUTABLE_PATH: process.env.BROWSER_EXECUTABLE_PATH || '',
  BROWSER_TIMEOUT_MS: int(process.env.BROWSER_TIMEOUT_MS, 20000),
  BROWSER_RETRIES: int(process.env.BROWSER_RETRIES, 2),
  SCREENSHOT_MAX_BYTES: int(process.env.SCREENSHOT_MAX_BYTES, 400000),
  COMPLETION_WEBHOOK_URL: process.env.COMPLETION_WEBHOOK_URL || process.env.WEBHOOK_URL || '',
  ENABLE_SCHEDULER: bool(process.env.ENABLE_SCHEDULER, true),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemma-4-26b-a4b-it',
  GEMINI_TEMPERATURE: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
