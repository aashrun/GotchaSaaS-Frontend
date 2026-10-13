import { Plug, ArrowUpRight, KeyRound, Code2, Github, FileText, MessageSquare } from 'lucide-react';
import { PageHeader, useData, ErrorState, Skeleton } from '../components/Common';
export default function Integrations() {
  const { data, error, loading, reload } = useData('/config');
  return (
    <main className="page-content">
      <PageHeader title="Connectors" description="Give your ideas the tools to get things done." />
      <section className="connector-roadmap">
        <h2>Your tools, on your terms.</h2>
        <p>
          Connect a repository inside a project’s Memory & actions panel. More account connections
          are planned below.
        </p>
        <div className="connector-plan-grid">
          {[
            [
              Github,
              'GitHub',
              'Repository reading and reviewed draft PRs are available when the server token is configured. Account OAuth is next.',
              'Project connection',
            ],
            [
              FileText,
              'Drive & Notion',
              'Read selected briefs and documents. Keep permission scoped to what you choose.',
              'Planned',
            ],
            [
              MessageSquare,
              'Slack & email',
              'Draft updates, ask for review, then send only with your approval.',
              'Planned',
            ],
          ].map(([Icon, name, description, status]) => (
            <article key={name}>
              <Icon size={21} />
              <span>{status}</span>
              <h3>{name}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <h2 className="connector-provider-heading">Platform services</h2>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading ? (
        <Skeleton />
      ) : (
        <div className="integration-grid">
          {data.providers.map((p) => (
            <article className="integration-card" key={p.id}>
              <div className={'integration-icon ' + p.id}>
                <Plug size={24} />
              </div>
              <span className={'capability-badge ' + (p.configured ? 'configured' : '')}>
                {p.configured ? 'Configured · live test pending' : 'Not configured'}
              </span>
              <h3>{p.name}</h3>
              <p>{p.capability}</p>
              <div className="integration-footer">
                <KeyRound size={14} />
                {p.configured ? 'Configured on the server' : 'Server setup required'}
                <a href="/help" aria-label={'Setup guidance for ' + p.name}>
                  <ArrowUpRight size={17} />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="notice">
        <Code2 size={22} />
        <div>
          <strong>Credentials stay behind the scenes.</strong>
          <p>
            Provider secrets are configured by the operator on the backend. A configured key does
            not mean the live integration has passed verification. Customer-owned provider
            connections and bring-your-own-key are on the roadmap.
          </p>
        </div>
      </div>
    </main>
  );
}
