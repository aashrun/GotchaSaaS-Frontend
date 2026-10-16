import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { PageHeader, useData, ErrorState } from '../components/Common';
import api from '../lib/api';
import { toast } from 'sonner';
export default function Admin() {
  const { user } = useAuth();
  return user.isAdmin ? (
    <AdminPanel />
  ) : (
    <main className="page-content">
      <ErrorState message="Administrator permission is required." />
    </main>
  );
}
function AdminPanel() {
  const { data, error, reload } = useData('/admin'),
    [provider, setProvider] = useState('openai'),
    [model, setModel] = useState(''),
    [name, setName] = useState(''),
    [inputPrice, setInputPrice] = useState(''),
    [outputPrice, setOutputPrice] = useState(''),
    [email, setEmail] = useState(''),
    [amount, setAmount] = useState(''),
    [reason, setReason] = useState('');
  return (
    <main className="page-content">
      <PageHeader
        eyebrow="PLATFORM CONTROL PLANE"
        title="A clear view of the universe."
        description="All administration requires a verified allowlisted account and creates an audit record."
      />
      {error && <ErrorState message={error} retry={reload} />}
      <div className="admin-stats">
        {['users', 'projects', 'jobs', 'deployments'].map((k) => (
          <div className="panel" key={k}>
            <span className="eyebrow">{k}</span>
            <h2>{data?.[k] ?? '—'}</h2>
          </div>
        ))}
      </div>
      {data?.economics && (
        <section className="panel form-stack">
          <h3>Usage economics</h3>
          <p>
            {data.economics.inputTokens.toLocaleString()} input tokens ·{' '}
            {data.economics.outputTokens.toLocaleString()} output tokens ·{' '}
            {data.economics.chargedCredits.toLocaleString()} charged credits
          </p>
          <p>
            Provider cost: ${data.economics.providerCostUsd.toFixed(4)} · Allocated credit value: $
            {data.economics.creditValueUsd.toFixed(4)} · Service contribution: $
            {data.economics.serviceContributionUsd.toFixed(4)}
          </p>
          <p className="muted">
            New usage targets {data.economics.pricing.grossMarginPercent}% contribution.{' '}
            {data.economics.note}
          </p>
          <p className="muted">
            Prompt cache hit rate {Math.round((data.economics.cacheHitRate || 0) * 100)}% ·
            provider-billed cost on {Math.round((data.economics.providerReportedShare || 0) * 100)}%
            of model calls
          </p>
          {!!data.economics.routing?.length && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Task tier</th>
                    <th>Builds</th>
                    <th>Completed</th>
                    <th>Avg credits</th>
                    <th>Avg calls</th>
                    <th>Escalated</th>
                    <th>Jev agreed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.economics.routing.map((r) => (
                    <tr key={r.tier}>
                      <td>{r.tier}</td>
                      <td>{r.jobs}</td>
                      <td>{r.jobs ? Math.round((r.completed / r.jobs) * 100) + '%' : '—'}</td>
                      <td>{r.avgChargedCredits.toFixed(1)}</td>
                      <td>{r.avgCalls.toFixed(1)}</td>
                      <td>{r.escalated}</td>
                      <td>{r.triaged ? r.triageAgreed + ' / ' + r.triaged : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {data?.routing && (
        <section className="panel form-stack">
          <h3>Model routing</h3>
          <p className="muted">
            {data.routing.developmentLock
              ? 'Development lock is on: every job runs on GPT-6 Luna. Set DEVELOPMENT_MODEL_LOCK=off to use quality routing locally.'
              : 'Quality routing is active.'}{' '}
            Jev job sizing: {data.routing.triage}.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job size</th>
                  <th>Kind of work</th>
                  <th>Starts on, then climbs after failed checks</th>
                </tr>
              </thead>
              <tbody>
                {data.routing.table.map((row) => (
                  <tr key={row.size + row.domain}>
                    <td>{row.size}</td>
                    <td>{row.domain.replace('_', ' ')}</td>
                    <td>
                      {row.ladder
                        .map((v) => v.model.split('/')[1] + ' · ' + v.effort + ' (' + v.score + ')')
                        .join(' → ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">
            Agent runtime for new jobs: {data.routing.runtime.version}
            {data.routing.runtime.version === 'v2'
              ? ` (project shell ${data.routing.runtime.shell ? 'on' : 'off'}, specialists ${data.routing.runtime.orchestration ? 'on' : 'off'})`
              : ''}
            .
          </p>
          {data.routing.outcomes.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job size</th>
                    <th>Kind of work</th>
                    <th>Started on</th>
                    <th>Jobs</th>
                    <th>Clean successes</th>
                    <th>Estimated rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.routing.outcomes.map((o) => (
                    <tr key={o.size + o.domain + o.variant}>
                      <td>{o.size}</td>
                      <td>{o.domain.replace('_', ' ')}</td>
                      <td>{o.variant.replace(':', ' · ')}</td>
                      <td>{o.jobs}</td>
                      <td>{o.clean}</td>
                      <td>
                        {Math.round(o.estimate * 100)}%{o.demoted ? ' · skipped as start' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={async () => {
              try {
                const { data: result } = await api.post('/admin/models/sync-benchmarks');
                const updated = result.changes.filter((c) => c.status === 'updated').length;
                toast.success(
                  updated + ' model benchmark' + (updated === 1 ? '' : 's') + ' refreshed',
                );
                await reload();
              } catch (e) {
                toast.error(e.message);
              }
            }}
          >
            Refresh benchmarks
          </button>
          <small className="muted">
            Scores are Intelligence Index values by reasoning effort; measured results from the last
            90 days can move a start past a variant that keeps failing. Benchmark data:{' '}
            <a href="https://artificialanalysis.ai/" target="_blank" rel="noreferrer">
              Artificial Analysis
            </a>
            {data.routing.benchmarks.some((b) => b.syncedAt)
              ? ' · refreshed ' +
                new Date(
                  Math.max(...data.routing.benchmarks.map((b) => Date.parse(b.syncedAt) || 0)),
                ).toLocaleDateString('en-IN')
              : ' · October 2026 snapshot'}
          </small>
        </section>
      )}
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post('/admin/models', {
              provider,
              model,
              name,
              inputUsdPerMillion: Number(inputPrice),
              outputUsdPerMillion: Number(outputPrice),
              maxOutputTokens: 12000,
              enabled: true,
            });
            await reload();
            toast.success('Model configuration saved');
          } catch (e) {
            toast.error(e.message);
          }
        }}
      >
        <h3>Configure an allowed model</h3>
        <p className="muted">
          Use a model identifier available to your provider account and its verified current
          pricing. Keys stay in backend environment variables.
        </p>
        <label>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {['openai', 'anthropic', 'gemini', 'openrouter'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <div className="two-fields">
          <label>
            Model identifier
            <input required value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
          <label>
            Display name
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </div>
        <div className="two-fields">
          <label>
            Input USD / million tokens
            <input
              type="number"
              required
              min="0"
              max="1000"
              step="0.00001"
              value={inputPrice}
              onChange={(e) => setInputPrice(e.target.value)}
            />
          </label>
          <label>
            Output USD / million tokens
            <input
              type="number"
              required
              min="0"
              max="1000"
              step="0.00001"
              value={outputPrice}
              onChange={(e) => setOutputPrice(e.target.value)}
            />
          </label>
        </div>
        <button className="primary-button">Save model</button>
        <button
          type="button"
          className="secondary-button"
          onClick={async () => {
            try {
              const { data: result } = await api.post('/admin/models/sync-prices');
              const updated = result.changes.filter((c) => c.status === 'updated').length;
              toast.success(updated + ' model price' + (updated === 1 ? '' : 's') + ' refreshed');
              await reload();
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          Refresh prices from OpenRouter
        </button>
        {data?.models.map((m) => (
          <p className="muted" key={m.id}>
            {m.name} · {m.provider}/{m.model} · input ${m.inputUsdPerMillion}
            {m.cachedInputUsdPerMillion != null &&
              ' (cached $' + m.cachedInputUsdPerMillion + ')'}{' '}
            / output ${m.outputUsdPerMillion}
          </p>
        ))}
      </form>
      <form
        className="panel form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post('/admin/credits', {
              email,
              amount: Number(amount),
              reason,
              idempotencyKey: crypto.randomUUID(),
            });
            toast.success('Credit adjustment recorded');
            await reload();
          } catch (e) {
            toast.error(e.message);
          }
        }}
      >
        <h3>Audited credit adjustment</h3>
        <label>
          User email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Credits to add
          <input
            required
            type="number"
            min="1"
            max="100000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Reason
          <input
            required
            minLength={10}
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button className="secondary-button">Record adjustment</button>
      </form>
      <section className="panel">
        <h3>Audit trail</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                  <td>{log.action}</td>
                  <td>{log.userId?.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
