export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function timeAgo(value) {
  if (!value) return '—';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function durationMs(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function currencyValue(value) {
  if (typeof value === 'number') {
    return `₹${value.toLocaleString('en-IN')}`;
  }
  if (typeof value === 'string') {
    // Value may already carry a currency prefix/symbol.
    return value;
  }
  return display(value);
}

// Derive a friendly change summary for use in change-detection cards.
export function prettyDelta(prev, curr) {
  if (typeof prev === 'number' && typeof curr === 'number') {
    const diff = curr - prev;
    const pct = prev !== 0 ? ((diff / prev) * 100).toFixed(1) : null;
    return {
      abs: diff >= 0 ? `+${diff.toLocaleString('en-IN')}` : diff.toLocaleString('en-IN'),
      pct: pct !== null ? `${diff >= 0 ? '+' : ''}${pct}%` : null,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    };
  }
  return null;
}

export function formatRole(role) {
  return ({ admin: 'Administrator', manager: 'Manager', analyst: 'Analyst', viewer: 'Viewer' })[role] || role || '—';
}

export function shortId(id) {
  if (!id) return '—';
  return String(id).slice(-8);
}