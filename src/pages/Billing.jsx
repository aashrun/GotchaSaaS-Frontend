import { useState, useEffect } from 'react';
import { Zap, ArrowUpRight, ShieldCheck, CreditCard } from 'lucide-react';
import { PageHeader, useData, ErrorState, Skeleton } from '../components/Common';
import api from '../lib/api';
import { toast } from 'sonner';
export default function Billing() {
  const { data, error, loading, reload } = useData('/billing'),
    [limit, setLimit] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setLimit(data.account.monthlyLimit);
  }, [data]);
  async function redirect(type) {
    setBusy(true);
    try {
      const { data } = await api.post('/billing/' + type);
      location.assign(data.url);
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  }
  return (
    <main className="page-content">
      <PageHeader
        eyebrow="CLEAR COSTS. MORE CONTROL."
        title="Your ambition, accounted for."
        description="Real credit balances, measured token usage, and limits you choose."
      />
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading ? (
        <Skeleton />
      ) : (
        <>
          <div className="billing-summary">
            <article className="panel">
              <span className="eyebrow">AVAILABLE AI CREDITS</span>
              <h2>
                {(data.account.balance - data.account.reserved).toLocaleString()}
                <Zap size={25} />
              </h2>
              <p>
                {data.account.reserved} reserved · {data.account.balance} total balance
              </p>
              <small>Credits are ledger units. Model costs use operator-configured prices.</small>
            </article>
            <article className="panel">
              <span className="eyebrow">YOUR PLAN</span>
              <h2>{data.subscription?.plan === 'configured_paid' ? 'Paid' : 'Starter'}</h2>
              <p>
                {data.subscription
                  ? `Subscription status: ${data.subscription.status}`
                  : 'No paid subscription attached.'}
              </p>
              <button
                disabled={busy}
                className="secondary-button"
                onClick={() => redirect(data.subscription?.customerId ? 'portal' : 'checkout')}
              >
                {data.subscription?.customerId ? 'Manage subscription' : 'View configured plan'}
                <ArrowUpRight size={16} />
              </button>
            </article>
          </div>
          <section className="panel spending-panel">
            <ShieldCheck size={24} />
            <div>
              <h3>Give your spending a boundary.</h3>
              <p>
                Generation reservations count toward your monthly limit. Auto-recharge is
                unavailable.
              </p>
            </div>
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api.patch('/billing/limits', { monthlyLimit: Number(limit) });
                  await reload();
                  toast.success('Spending limit saved');
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              <input
                aria-label="Monthly credit limit"
                type="number"
                required
                min="0"
                max="1000000"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
              <button className="primary-button">Save limit</button>
            </form>
          </section>
          <section className="panel">
            <h3>Your credit ledger</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entry</th>
                    <th>Credits</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>{entry.kind.replaceAll('_', ' ')}</td>
                      <td className={entry.amount >= 0 ? 'mint-text' : ''}>
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount}
                      </td>
                      <td>{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <h3>Measured AI usage</h3>
            {!data.usage.length ? (
              <p className="muted">No model calls have been recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Input tokens</th>
                      <th>Output tokens</th>
                      <th>Estimated provider cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usage.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.provider} / {u.model}
                        </td>
                        <td>{u.inputTokens}</td>
                        <td>{u.outputTokens}</td>
                        <td>${u.estimatedUsd.toFixed(5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <small>
              Cost estimates use recorded token counts and configured rates, not provider invoices.
            </small>
          </section>
          <div className="notice">
            <CreditCard size={22} />
            <div>
              <strong>Hosting & database costs</strong>
              <p>
                Provider-reported metrics are not configured. No fabricated balances or consumption
                figures are shown.
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
