import { useEffect, useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import Badge, { healthTone } from '../components/Badge.jsx';
import Icon from '../components/Icons.jsx';
import { PageHeader, Card, Button, ErrorBanner, KeyValue } from '../components/ui.jsx';
import { formatDate } from '../lib/format.js';

function SystemItem({ icon, label, status, detail }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><Icon name={icon} size={18} /></span>
        <div>
          <div className="font-medium text-gray-800">{label}</div>
          {detail && <div className="text-xs text-gray-500">{detail}</div>}
        </div>
      </div>
      <Badge tone={healthTone(status)} dot>{status}</Badge>
    </div>
  );
}

export default function SystemHealth() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const { data: res } = await api.get('/system/health');
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load system health'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        subtitle="Live status of the platform services. No secrets or configuration values are exposed."
        meta="Admin only"
        action={<Button variant="secondary" size="sm" onClick={load}><Icon name="refresh" size={16} /> Refresh</Button>}
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {busy && !data && <div className="text-sm text-gray-500">Checking services…</div>}

      {data && (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Core services">
              <SystemItem icon="database" label="MongoDB" status={data.mongo?.status}
                detail={data.mongo?.latencyMs != null ? `latency ${data.mongo.latencyMs}ms` : undefined} />
              <SystemItem icon="home" label="API" status="CONNECTED" detail="Express API is responding" />
              <SystemItem icon="health" label="Scheduler" status={data.scheduler?.status}
                detail={`${data.scheduler?.started ? 'started' : 'stopped'} · ${data.scheduler?.jobCount ?? 0} jobs`} />
            </Card>
            <Card title="Execution & intelligence">
              <SystemItem icon="runs" label="Playwright / Browser" status={data.playwright?.status}
                detail={`headless: ${data.playwright?.headless ? 'yes' : 'no'}${data.playwright?.retries != null ? ` · retries: ${data.playwright.retries}` : ''}${data.playwright?.timeoutMs != null ? ` · timeout: ${data.playwright.timeoutMs}ms` : ''}`} />
              <SystemItem icon="sparkle" label="AI Provider" status={data.ai?.configured ? 'CONFIGURED' : 'NOT_CONFIGURED'}
                detail={data.ai?.configured ? `${data.ai?.provider} · ${data.ai?.model}` : 'Deterministic fallback active'} />
              <SystemItem icon="layers" label="Demo Mode" status={data.demoMode ? 'ON' : 'OFF'}
                detail="Playwright runs against local demo pages" />
              <SystemItem icon="database" label="Screenshot cap" status="CONNECTED"
                detail={data.extraction?.screenshotMaxBytes ? `max ${Math.round(data.extraction.screenshotMaxBytes / 1024)} KB stored in MongoDB` : 'Not reported'} />
              <SystemItem icon="link" label="Completion webhook" status={data.notifications?.webhookConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED'}
                detail={data.notifications?.webhookConfigured ? 'Slack-compatible POST on run completion' : 'Audit-log notifications only'} />
            </Card>
          </div>

          <Card title="Recent activity">
            <div className="grid sm:grid-cols-3 gap-4 px-5 py-4">
              <KeyValue label="Last successful run" value={data.lastRun ? data.lastRun.task : '—'} mono={false} />
              <KeyValue label="Last run at" value={formatDate(data.lastRun?.at)} />
              <KeyValue label="Failed runs (all time)" value={data.failedRuns ?? 0} />
            </div>
            {data.lastRun && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                <Icon name="check" size={16} className="text-emerald-600" />
                Status of last run: <Badge tone={healthTone(data.lastRun?.status)}>{data.lastRun?.status}</Badge>
              </div>
            )}
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              Generated at {formatDate(data.generatedAt)} · audit entries: {data.auditCount ?? 0}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}