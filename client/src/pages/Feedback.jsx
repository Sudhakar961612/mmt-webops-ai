import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import Badge from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { formatDate, timeAgo } from '../lib/format.js';

const ratingTone = (rating) => {
  if (rating >= 4) return 'green';
  if (rating >= 3) return 'amber';
  return 'red';
};

const ratingLabel = (rating) => {
  if (rating >= 4) return 'Positive';
  if (rating >= 3) return 'Neutral';
  return 'Negative';
};

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [filters, setFilters] = useState({ rating: '' });

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.get('/feedback');
      setFeedbacks(data.data.feedback || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load feedback'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = feedbacks.filter((f) => {
    if (filters.rating && f.rating !== parseInt(filters.rating)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        subtitle="Analyst feedback on run quality and system improvements"
        meta={`${filtered.length} of ${feedbacks.length} feedback entries`}
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="flex gap-3">
        <select
          value={filters.rating}
          onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      <Card>
        {busy && !feedbacks.length ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading feedback…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState icon="sparkle" title="No feedback yet" message="Analysts can provide feedback on runs and results." /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((fb) => (
              <div key={fb._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800">{fb.task?.name || 'Task'}</h3>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(fb.createdAt)}</p>
                  </div>
                  <Badge tone={ratingTone(fb.rating)}>
                    {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                  </Badge>
                </div>

                {fb.comment && (
                  <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded border border-gray-200">
                    {fb.comment}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    {fb.run ? `Run ${fb.run._id?.slice(-8)}` : ''}
                    {fb.insight ? ' · AI Insight' : ''}
                  </div>
                  <span>{ratingLabel(fb.rating)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Total Feedback" subtitle="All-time count">
          <div className="text-3xl font-bold text-gray-800 p-5">{feedbacks.length}</div>
        </Card>
        <Card title="Average Rating" subtitle="Weighted score">
          <div className="text-3xl font-bold text-gray-800 p-5">
            {feedbacks.length > 0
              ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
              : '—'}
            <span className="text-lg text-gray-500">/5</span>
          </div>
        </Card>
        <Card title="Sentiment" subtitle="Positive / Neutral / Negative">
          <div className="p-5 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600 font-medium">Positive:</span>
              <span>{feedbacks.filter((f) => f.rating >= 4).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600 font-medium">Neutral:</span>
              <span>{feedbacks.filter((f) => f.rating >= 3 && f.rating < 4).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600 font-medium">Negative:</span>
              <span>{feedbacks.filter((f) => f.rating < 3).length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
