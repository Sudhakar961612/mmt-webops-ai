import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Thin wrapper around an OpenAI-compatible chat-completions API.
 *
 * When no AI_API_KEY/endpoint is configured (or a call fails) the service layer
 * can fall back to a deterministic engine, so the whole workflow still runs
 * without any external AI. `generateText` returns `null` when AI is unavailable
 * rather than throwing, letting callers choose the fallback behaviour.
 */
export function isAiConfigured() {
  return Boolean(env.AI_API_KEY && env.AI_BASE_URL);
}

async function chatCompletion(messages, { model = env.AI_MODEL, temperature = env.AI_TEMPERATURE } = {}) {
  const response = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        {
          role: 'system',
          content:
            'You are the reasoning engine of an autonomous web-operations agent. ' +
            'Respond only with valid JSON when requested. Be concise and business-focused.',
        },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AI API error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

/**
 * Ask the AI for JSON. Returns parsed JSON when AI is available and successful,
 * otherwise returns `null` (caller falls back to deterministic logic).
 */
export async function generateJson(prompt, opts = {}) {
  if (!isAiConfigured()) {
    logger.info('AI not configured - skipping AI call');
    return null;
  }
  try {
    const content = await chatCompletion([{ role: 'user', content: prompt }], opts);
    if (!content) return null;
    // Strip markdown fences if present.
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn({ err: err.message }, 'AI call failed - using fallback');
    return null;
  }
}

/**
 * Ask the AI for free-text. Returns string, or null when unavailable.
 */
export async function generateText(prompt, opts = {}) {
  if (!isAiConfigured()) return null;
  try {
    return await chatCompletion([{ role: 'user', content: prompt }], opts);
  } catch (err) {
    logger.warn({ err: err.message }, 'AI text call failed - using fallback');
    return null;
  }
}

export default { isAiConfigured, generateJson, generateText };
