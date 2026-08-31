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
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DEMO_MODE: bool(process.env.DEMO_MODE, true),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || `http://localhost:${int(process.env.PORT, 5000)}`,
  BROWSER_HEADLESS: bool(process.env.BROWSER_HEADLESS, false),
  BROWSER_EXECUTABLE_PATH: process.env.BROWSER_EXECUTABLE_PATH || '',
  ENABLE_SCHEDULER: bool(process.env.ENABLE_SCHEDULER, true),
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  AI_BASE_URL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o-mini',
  AI_TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
