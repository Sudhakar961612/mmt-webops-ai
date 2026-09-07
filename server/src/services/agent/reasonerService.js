import { generateText } from './geminiProvider.js';
import logger from '../../utils/logger.js';

/**
 * Deterministic reasoning: turns a list of Change records into a business insight.
 * Falls back to rules when AI is unavailable; also computes useful numbers
 * (price deltas, availability shifts) for the machine-readable `insights` field.
 */
export function buildFallbackInsight(task, changes, snapshotData) {
  const insights = [];
  const changeCount = changes.length;

  if (changeCount === 0) {
    return {
      title: 'No changes detected',
      summary: `Monitoring "${task.name}" — no changes detected since the previous snapshot.`,
      reasoning: 'The current snapshot matches the previous snapshot for all monitored fields.',
      insights,
      changeCount: 0,
      hasChanges: false,
      confidence: 0.9,
    };
  }

  const lines = [];
  for (const c of changes) {
    const from = formatValue(c.previousValue);
    const to = formatValue(c.currentValue);
    if (c.type === 'MODIFIED') {
      // Arrays of records (e.g. flights/hotels) get element-level analysis.
      if (Array.isArray(c.previousValue) && Array.isArray(c.currentValue)) {
        const itemDeltas = diffItemArrays(c.previousValue, c.currentValue);
        if (itemDeltas.length) {
          for (const d of itemDeltas) {
            lines.push(`• ${c.field}: ${d.label} ${d.note} (${d.direction})`);
          }
          insights.push({
            field: c.field,
            kind: 'item_changes',
            items: itemDeltas,
          });
        } else {
          lines.push(`• ${c.field}: list changed (${from} → ${to})`);
          insights.push({ field: c.field, kind: 'change', previous: c.previousValue, current: c.currentValue });
        }
        continue;
      }
      const delta = computeDelta(c.field, c.previousValue, c.currentValue);
      lines.push(`• ${c.field}: ${from} → ${to}${delta ? ` (${delta})` : ''}`);
      if (delta) {
        insights.push({
          field: c.field,
          kind: 'delta',
          previous: c.previousValue,
          current: c.currentValue,
          delta,
        });
      } else {
        insights.push({ field: c.field, kind: 'change', previous: c.previousValue, current: c.currentValue });
      }
    } else {
      lines.push(`• ${c.field}: ${c.type.toLowerCase()} (${from || '—'} → ${to || '—'})`);
      insights.push({ field: c.field, kind: c.type.toLowerCase(), previous: c.previousValue, current: c.currentValue });
    }
  }

  const highs = changes.filter((c) => c.severity === 'high');
  const confidence = highs.length ? 0.75 : 0.85;
  const trend = highs.length ? 'potentially significant' : 'notable';

  return {
    title: `${changeCount} change${changeCount > 1 ? 's' : ''} detected for ${task.name}`,
    summary:
      `Detected ${changeCount} change${changeCount > 1 ? 's' : ''} while monitoring "${task.name}". ` +
      `${highs.length ? `${highs.length} flagged as high impact (pricing/availability). ` : ''}` +
      `Review recommended.`,
    reasoning: `Compared the current snapshot against the previous snapshot:\n${lines.join('\n')}\n` +
      `These changes are ${trend} and may warrant attention from the business team.`,
    insights,
    changeCount,
    hasChanges: true,
    confidence,
  };
}

function formatValue(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function computeDelta(field, prev, curr) {
  if (/price|fare|rate|amount|cost/i.test(field)) {
    const a = parseFloat(prev);
    const b = parseFloat(curr);
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      const diff = b - a;
      const pct = a !== 0 ? ((diff / a) * 100).toFixed(1) : null;
      return pct === null ? `₹${diff.toFixed(0)}` : `₹${diff.toFixed(0)} (${pct}%)`;
    }
  }
  return null;
}

/**
 * Compare two arrays of similar record objects, keyed by a stable id field.
 * Produces per-item deltas (prices, availability) for the reasoning narrative.
 */
function diffItemArrays(prevArr, currArr) {
  const results = [];
  if (!prevArr.length || !currArr.length) return results;
  const prev = prevArr.map((r) => ({ ...r }));
  const curr = currArr.map((r) => ({ ...r }));
  const idField =
    ['flightNo', 'name', 'id', 'code'].find((k) => curr[0] && curr[0][k] !== undefined) || null;

  const match = (a, b) => (idField ? a[idField] === b[idField] : false);
  const currency = '₹';

  for (let i = 0; i < curr.length; i++) {
    const cur = curr[i];
    const label = idField ? cur[idField] : `item ${i + 1}`;
    // Find the matching previous item by id (fall back to position).
    const prevItem = idField ? prev.find((p) => match(p, cur)) : prev[i];
    const prevItemOrIdx = prevItem || prev[i];
    if (!prevItemOrIdx) continue;

    const pvPrice = prevItemOrIdx.priceValue ?? prevItemOrIdx.price;
    const cvPrice = cur.priceValue ?? cur.price;
    const pvAvail = prevItemOrIdx.seatsAvailable ?? prevItemOrIdx.roomsAvailable;
    const cvAvail = cur.seatsAvailable ?? cur.roomsAvailable;

    if (typeof pvPrice === 'number' && typeof cvPrice === 'number' && pvPrice !== cvPrice) {
      const diff = cvPrice - pvPrice;
      const pct = ((diff / pvPrice) * 100).toFixed(1);
      results.push({
        label,
        note: `price ${currency}${cvPrice.toLocaleString('en-IN')} (was ${currency}${pvPrice.toLocaleString('en-IN')})`,
        direction: diff > 0 ? `increased ${currency}${Math.abs(diff).toLocaleString('en-IN')} (+${pct}%)` : `decreased ${currency}${Math.abs(diff).toLocaleString('en-IN')} (${pct}%)`,
      });
    } else if ((typeof pvAvail === 'number') && (typeof cvAvail === 'number') && pvAvail !== cvAvail) {
      results.push({
        label,
        note: `availability ${cur.seatsAvailable !== undefined ? 'seats' : 'rooms'} ${cvAvail} (was ${pvAvail})`,
        direction: cvAvail > pvAvail ? 'increased availability' : 'reduced availability',
      });
    }
  }
  return results;
}

/**
 * Produce a business insight for a run from its changes.
 */
export async function generateInsight(task, changes, snapshotData) {
  const fallback = buildFallbackInsight(task, changes, snapshotData);
  let source = 'fallback';

  if (changes.length > 0) {
    const aiText = await generateText(
      `Here are changes detected on page "${task.name}":\n${changes
        .map((c) => `- ${c.field}: ${c.type} (${JSON.stringify(c.previousValue)} -> ${JSON.stringify(c.currentValue)})`)
        .join('\n')}\n` +
        `Write a concise business insight (2-3 sentences) explaining what changed and why it matters.`
    );
    if (aiText) {
      source = 'ai';
      fallback.summary = aiText.trim();
    }
  }

  logger.info({ task: task._id, changes: changes.length, source }, 'Insight generated');
  return { ...fallback, source };
}
