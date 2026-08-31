import Icon from './Icons.jsx';

// Human-readable scheduling presets that map to cron expressions (keep cron internally).
export const CRON_PRESETS = [
  { key: 'none', label: 'No schedule (run manually)', cron: '' },
  { key: '5m', label: 'Every 5 minutes', cron: '*/5 * * * *' },
  { key: '15m', label: 'Every 15 minutes', cron: '*/15 * * * *' },
  { key: 'hourly', label: 'Hourly', cron: '0 * * * *' },
  { key: 'daily', label: 'Daily at 09:00', cron: '0 9 * * *' },
  { key: 'weekly', label: 'Weekly (Mon 09:00)', cron: '0 9 * * 1' },
];

export function cronToLabel(cron) {
  if (!cron) return 'No schedule';
  const found = CRON_PRESETS.find((p) => p.cron === cron);
  if (found) return found.label;
  return `Custom · ${cron}`;
}

export function CronPreset({ label, value, onChange }) {
  const known = CRON_PRESETS.some((p) => p.cron === value);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="w-full text-left px-3 py-2 rounded-lg border text-sm bg-white hover:bg-gray-50"
      >
        <span className="flex items-center justify-between">
          <span className="text-gray-400">Preset</span>
          <span className="text-gray-600 truncate ml-3">{value ? cronToLabel(value) : 'Select a schedule'}</span>
        </span>
      </button>
      <div className="flex flex-wrap gap-1.5">
        {CRON_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.cron)}
            className={`px-2.5 py-1 rounded-md text-xs border ${
              value === p.cron ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {known && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2.5 py-1 rounded-md text-xs border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Or enter a custom cron expression</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="*/5 * * * *"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}