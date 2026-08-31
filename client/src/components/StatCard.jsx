import Icon from './Icons.jsx';

export default function StatCard({ label, value, sub, icon = 'layers', tone = 'brand' }) {
  const iconTones = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-500',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-gray-100 text-gray-500',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
          <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          {sub ? <div className="text-xs text-gray-400 mt-0.5">{sub}</div> : null}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconTones[tone] || iconTones.brand}`}>
          <Icon name={icon} size={18} />
        </div>
      </div>
    </div>
  );
}
