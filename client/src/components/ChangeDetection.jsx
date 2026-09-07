import Icon from './Icons.jsx';
import Badge, { severityTone, changeTone } from './Badge.jsx';
import { display, prettyDelta } from '../lib/format.js';

// Render a value that may be a nested object/array in a compact human way.
function Value({ value }) {
  if (typeof value === 'object' && value !== null) {
    return <span className='font-mono text-xs text-gray-600'>{JSON.stringify(value)}</span>;
  }
  return <span className='text-sm'>{display(value)}</span>;
}

/**
 * Visual change-detection card (Phase 7).
 * Shows previous/current value, absolute + % delta, severity and impact badge.
 */
export default function ChangeDetection({ changes }) {
  if (!changes || changes.length === 0) {
    return null;
  }
  return (
    <div className='space-y-3'>
      {changes.map((c) => (
        <div key={c._id || c.path} className='border border-gray-200 rounded-xl overflow-hidden'>
          <div className='px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2 min-w-0'>
              <span className='font-semibold text-gray-800 capitalize'>{c.field || c.path}</span>
              <Badge tone={changeTone(c.type)}>{c.type}</Badge>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Badge tone={severityTone(c.severity)}>{c.severity?.toUpperCase()} impact</Badge>
            </div>
          </div>
          <div className='px-4 py-3 grid sm:grid-cols-2 gap-3'>
            <div className='bg-gray-50 rounded-lg px-3 py-2.5'>
              <div className='text-xs uppercase tracking-wide text-gray-400 mb-1'>Previous</div>
              <div className='text-gray-500 line-through'>
                <Value value={c.previousValue} />
              </div>
            </div>
            <div className='bg-gray-50 rounded-lg px-3 py-2.5'>
              <div className='text-xs uppercase tracking-wide text-gray-400 mb-1'>Current</div>
              <div
                className={c.type === 'REMOVED' ? 'text-gray-400' : 'text-emerald-700 font-medium'}>
                <Value value={c.currentValue} />
              </div>
            </div>
            <div className='sm:col-span-2 flex flex-wrap items-center gap-3 text-sm bg-emerald-50/60 rounded-lg px-3 py-2.5'>
              <Icon name='sparkle' size={16} className='text-emerald-600 shrink-0' />
              <span className='text-gray-700'>{c.summary || 'Value changed'}</span>
              {(() => {
                const d = prettyDelta(c.previousValue, c.currentValue);
                if (!d) return null;
                return (
                  <span
                    className={`ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
                      d.direction === 'up'
                        ? 'bg-amber-100 text-amber-700'
                        : d.direction === 'down'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                    {d.direction === 'up' ? '▲' : d.direction === 'down' ? '▼' : '•'} {d.abs}
                    {d.pct ? ` · ${d.pct}` : ''}
                  </span>
                );
              })()}
              {c.severity === 'high' && (
                <span className='text-xs text-amber-700'>
                  Business-impacting change — review recommended
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
