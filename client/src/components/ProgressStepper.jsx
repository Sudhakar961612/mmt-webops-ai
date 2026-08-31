import Icon from './Icons.jsx';

/**
 * Horizontal progress stepper used by the task workflow and wizards.
 * steps: [{ key, label, hint? }] ; current: index; prefix unknown states stay dimmed.
 */
export default function ProgressStepper({ steps, current, compact = false }) {
  return (
    <ol className={`flex items-center gap-0 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {steps.map((s, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex items-center justify-center rounded-full border-2 shrink-0 ${
                  compact ? 'w-6 h-6' : 'w-7 h-7'
                } ${
                  done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {done ? <Icon name="check" size={compact ? 12 : 14} /> : <span className="font-semibold">{i + 1}</span>}
              </span>
              <span className={`font-medium leading-tight ${isCurrent ? 'text-brand-700' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={`flex-1 mx-2 h-px rounded ${i < current ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}