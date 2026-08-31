import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';

export default function DemoPages() {
  const [pages, setPages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/demo');
      setPages(data.data.pages || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load demo pages'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Pages"
        subtitle="Local test pages for development and demonstration"
        meta={`${pages.length} pages available`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <Card>
        {busy && !pages.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading demo pages…</div>
        ) : pages.length === 0 ? (
          <div className="p-6"><EmptyState icon="demo" title="No demo pages" message="Demo pages are used for testing automation." /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pages.map((page) => (
              <div key={page.key} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800">{page.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{page.description}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <a
                    href={`/demo/${page.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Icon name="link" size={14} />
                    Open page
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="About Demo Pages" subtitle="Development and testing reference">
        <div className="px-5 py-4 text-sm text-gray-700 space-y-2">
          <p>Demo pages are static HTML files served for testing browser automation without external dependencies.</p>
          <p>They simulate hotel pricing, flight search, and other travel commerce pages.</p>
          <p>Use them to develop and test extraction schemas, plans, and monitoring workflows.</p>
        </div>
      </Card>
    </div>
  );
}
