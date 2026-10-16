import { Plug, Code2, Github, FileText, MessageSquare } from 'lucide-react';
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
              'Read a connected repository and prepare draft pull requests for your review. One-click GitHub sign-in is next.',
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
      <h2 className="connector-provider-heading">Platform capabilities</h2>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading ? (
        <Skeleton />
      ) : (
        <div className="integration-grid">
          {[
            [
              'building',
              'App building',
              'Build, check and browser-test apps in a private workspace.',
            ],
            ['publishing', 'Publishing', 'Put a verified web app on its own public address.'],
            [
              'databases',
              'Managed databases',
              'Add a database to a full-stack app with your approval.',
            ],
            ['subscriptions', 'Plans & billing', 'Subscribe and manage your plan.'],
            [
              'repositories',
              'Repository connection',
              'Read a connected repository and prepare pull requests for your review.',
            ],
          ].map(([key, name, description]) => {
            const ready = !!data.capabilities?.[key];
            return (
              <article className="integration-card" key={key}>
                <div className={'integration-icon ' + key}>
                  <Plug size={24} />
                </div>
                <span className={'capability-badge ' + (ready ? 'configured' : '')}>
                  {ready ? 'Available' : 'Coming soon'}
                </span>
                <h3>{name}</h3>
                <p>{description}</p>
              </article>
            );
          })}
        </div>
      )}
      <div className="notice">
        <Code2 size={22} />
        <div>
          <strong>Your credentials stay private.</strong>
          <p>
            Connections you add are encrypted and used only for actions you approve. Bring-your-own
            accounts for more services are on the roadmap.
          </p>
        </div>
      </div>
    </main>
  );
}
