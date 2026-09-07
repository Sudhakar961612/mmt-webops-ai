import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const SYSTEM_INSTRUCTION =
  'You are the reasoning engine of an autonomous web-operations agent. ' +
  'Respond only with valid JSON when requested. Be concise and business-focused.';

/** Returns whether a Gemini API key is available to the backend. */
export function isGeminiConfigured() {
  return Boolean(env.GEMINI_API_KEY);
}

async function generateContent(prompt, {
  model = env.GEMINI_MODEL,
  temperature = env.GEMINI_TEMPERATURE,
  responseMimeType,
} = {}) {
  const response = await fetch(`${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('') || null;
}

/**
 * Ask Gemini for JSON. Returns parsed JSON on success, otherwise null so the
 * caller can use its deterministic fallback.
 */
export async function generateJson(prompt, opts = {}) {
  if (!isGeminiConfigured()) {
    logger.info('Gemini not configured - skipping AI call');
    return null;
  }

  try {
    const content = await generateContent(prompt, {
      ...opts,
      responseMimeType: 'application/json',
    });
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    logger.warn({ err: err.message }, 'Gemini call failed - using fallback');
    return null;
  }
}

/** Ask Gemini for free text, or return null when unavailable. */
export async function generateText(prompt, opts = {}) {
  if (!isGeminiConfigured()) return null;
  try {
    return await generateContent(prompt, opts);
  } catch (err) {
    logger.warn({ err: err.message }, 'Gemini text call failed - using fallback');
    return null;
  }
}

export default { isGeminiConfigured, generateJson, generateText };
