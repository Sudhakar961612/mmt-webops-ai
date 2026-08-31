/**
 * Pure diff logic between two structured-data snapshots.
 * Produces an array of Change-like objects:
 *   { type: 'ADDED'|'REMOVED'|'MODIFIED', field, path, previousValue, currentValue, severity, summary }
 */

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function describe(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function severityOf(field, previous, current) {
  // Field name is the strongest signal for pricing / availability impact.
  if (/price|fare|amount|cost|rate/i.test(field)) return 'high';
  if (/avail|seat|stock|count|rating/i.test(field)) return 'medium';
  // Object-valued children carry their own nested keys.
  const keys = [...Object.keys(previous || {}), ...Object.keys(current || {})];
  if (keys.some((k) => /price|fare|amount|cost|rate/i.test(k))) return 'high';
  if (keys.some((k) => /avail|seat|stock|count|rating/i.test(k))) return 'medium';
  return 'low';
}

/**
 * @param {Object} previous - previous snapshot extractedData
 * @param {Object} current  - current snapshot extractedData
 * @returns {Array<Object>} list of changes
 */
export function diffSnapshots(previous, current) {
  const changes = [];
  const prev = previous && isObject(previous) ? previous : {};
  const curr = current && isObject(current) ? current : {};

  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

  for (const key of keys) {
    const pv = prev[key];
    const cv = curr[key];

    if (!(key in prev)) {
      changes.push({
        type: 'ADDED',
        field: key,
        path: key,
        previousValue: null,
        currentValue: cv,
        severity: severityOf(key, pv, cv),
        summary: `"${key}" was added (${describe(cv)})`,
      });
    } else if (!(key in curr)) {
      changes.push({
        type: 'REMOVED',
        field: key,
        path: key,
        previousValue: pv,
        currentValue: null,
        severity: severityOf(key, pv, cv),
        summary: `"${key}" was removed (was ${describe(pv)})`,
      });
    } else if (isObject(pv) || isObject(cv)) {
      // Recurse into nested objects.
      const nested = diffSnapshots(pv, cv).map((c) => ({
        ...c,
        path: `${key}.${c.path}`,
        field: c.field || key,
      }));
      if (nested.length) {
        changes.push(...nested);
      } else if (!itemsEqual(pv, cv)) {
        changes.push({
          type: 'MODIFIED',
          field: key,
          path: key,
          previousValue: pv,
          currentValue: cv,
          severity: severityOf(key, pv, cv),
          summary: `"${key}" changed from ${describe(pv)} to ${describe(cv)}`,
        });
      }
    } else if (!itemsEqual(pv, cv)) {
      // Scalars/arrays that differ are reported as one MODIFIED change so the
      // reasoner can compute deltas over prices/availability lists.
      changes.push({
        type: 'MODIFIED',
        field: key,
        path: key,
        previousValue: pv,
        currentValue: cv,
        severity: severityOf(key, pv, cv),
        summary: `"${key}" changed from ${describe(pv)} to ${describe(cv)}`,
      });
    }
  }
  return changes;
}

export function itemsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default diffSnapshots;
