import { display } from '../lib/format.js';

const TYPE_COLUMNS = {
  hotel_monitor: [
    { key: 'name', label: 'Hotel', render: (r) => r.name },
    { key: 'area', label: 'Location', render: (r) => r.area },
    { key: 'pricePerNight', label: 'Price', render: (r) => r.pricePerNight },
    { key: 'rating', label: 'Rating', render: (r) => (r.rating ?? r.ratingValue) },
    { key: 'roomsAvailable', label: 'Availability', render: (r) => (r.roomsAvailable === 0 ? 'No rooms' : `${r.roomsAvailable} rooms`) },
    { key: 'date', label: 'Date', render: (r) => r.date },
  ],
  flight_monitor: [
    { key: 'airline', label: 'Airline', render: (r) => r.airline },
    { key: 'flightNo', label: 'Flight', render: (r) => r.flightNo },
    { key: 'route', label: 'Route', render: (r) => (r.route || 'DEL → BOM') },
    { key: 'departure', label: 'Departure', render: (r) => r.departure },
    { key: 'arrival', label: 'Arrival', render: (r) => r.arrival },
    { key: 'price', label: 'Price', render: (r) => r.price },
    { key: 'seatsAvailable', label: 'Availability', render: (r) => (r.seatsAvailable === 0 ? 'Sold out' : `${r.seatsAvailable} seats`) },
  ],
  price_monitor: [
    { key: 'item', label: 'Item', render: (r, k) => r.name || k },
    { key: 'price', label: 'Price', render: (r) => r.price ?? r.priceValue ?? r.amount },
    { key: 'currency', label: 'Currency', render: (r, k, meta) => r.currency || meta.currency },
  ],
};

function flattenItem(data, index) {
  // An item is either a plain scalar value or a record object.
  if (data && typeof data === 'object') return data;
  return { value: data, position: index + 1 };
}

function ItemRow({ item, rowIndex, columns }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      {columns.map((col, ci) => (
        <td key={ci} className="px-4 py-3 text-sm text-gray-700">
          {col.render(item, rowIndex, item)}
        </td>
      ))}
    </tr>
  );
}

/**
 * Human-readable, adaptive extracted-data table (Phase 6).
 * Columns adapt to the task type (hotel vs flight vs generic scalar).
 * Optional fieldMeta: { [field]: { confidence: 0..1, issues: [] } } renders
 * a confidence column + per-field warning hints.
 */
export default function ExtractedDataTable({ data = {}, type = 'generic', fieldMeta = null }) {
  if (!data || typeof data !== 'object') {
    return <p className="px-5 py-6 text-sm text-gray-400">No extracted data for this run.</p>;
  }

  const confOf = (k) => {
    const c = fieldMeta?.[k]?.confidence;
    return typeof c === 'number' ? c : null;
  };

  const columns = TYPE_COLUMNS[type] || null;

  // If the extraction yielded nested arrays (e.g. { flights: [...] }), show the
  // most relevant array as a table; otherwise show scalar key/value pairs.
  const arrayKey = columns ? Object.keys(data).find((k) => Array.isArray(data[k]) && data[k].length) : null;
  const rows = arrayKey ? data[arrayKey] : [];
  const currency = data.currency || data[arrayKey]?.[0]?.currency;

  if (columns && rows.length) {
    return (
      <div className="overflow-x-auto">
        <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600 capitalize">Results ({rows.length})</span>
          {currency && <span className="text-xs text-gray-400">Currency: {currency}</span>}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-2.5 font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <ItemRow key={item?.flightNo || item?.name || i} item={flattenItem(item, i)} rowIndex={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Scalar key/value fallback (generic extracts).
  const entries = Object.entries(data).filter(([k]) => !Array.isArray(data[k]));
  if (!entries.length) {
    return <p className="px-5 py-6 text-sm text-gray-400">No extractable fields in this snapshot.</p>;
  }
  const showConf = fieldMeta && entries.some(([k]) => confOf(k) !== null);
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-px bg-gray-100">
        {entries.map(([k, v]) => {
          const c = confOf(k);
          const issues = fieldMeta?.[k]?.issues || [];
          return (
            <div key={k} className="bg-white px-4 py-2.5 flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wide text-gray-400 capitalize">
                {k}
                {issues.length > 0 && <span className="block normal-case text-amber-700">⚠ {issues[0]}</span>}
              </span>
              <span className="text-sm text-gray-700 font-medium truncate text-right">
                {display(v)}
                {c !== null && <span className="block text-xs font-normal text-gray-400">{Math.round(c * 100)}%</span>}
              </span>
            </div>
          );
        })}
      </div>
      {showConf && <p className="px-4 py-2 text-xs text-gray-400">Confidence from backend field validation.</p>}
    </div>
  );
}