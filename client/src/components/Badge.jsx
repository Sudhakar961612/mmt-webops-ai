const tones = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
  teal: 'bg-teal-100 text-teal-700',
};

export default function Badge({ tone = 'gray', children, dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${tones[tone] || tones.gray}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// Map run/task statuses to badge tones for consistent presentation.
export function runTone(status) {
  const map = {
    SUCCEEDED: 'green',
    FAILED: 'red',
    REJECTED: 'gray',
    AWAITING_APPROVAL: 'amber',
    APPROVED: 'blue',
    RUNNING: 'blue',
    EXTRACTING: 'blue',
    COMPARING: 'blue',
    REASONING: 'blue',
    PLANNED: 'gray',
  };
  return map[status] || 'gray';
}

export function taskTone(status) {
  const map = {
    COMPLETED: 'green',
    FAILED: 'red',
    AWAITING_APPROVAL: 'amber',
    RUNNING: 'blue',
    PAUSED: 'gray',
  };
  return map[status] || 'gray';
}

export function changeTone(type) {
  if (type === 'ADDED') return 'green';
  if (type === 'REMOVED') return 'red';
  return 'amber';
}

export function healthTone(status) {
  const s = String(status).toUpperCase();
  if (s === 'CONNECTED' || s === 'CONFIGURED' || s === 'OK') return 'green';
  if (s === 'DEGRADED') return 'amber';
  if (s === 'ERROR' || s === 'NOT_CONFIGURED') return 'red';
  return 'gray';
}

export function severityTone(sev) {
  return sev === 'high' ? 'red' : sev === 'medium' ? 'amber' : 'green';
}
