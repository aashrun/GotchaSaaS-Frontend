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
        {data?.models.map((m) => (
          <p className="muted" key={m.id}>
            {m.name} · {m.provider}/{m.model} · input ${m.inputUsdPerMillion} / output $
            {m.outputUsdPerMillion}
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
