import { Plug, Code2, Github, FileText, Server } from 'lucide-react';
import { PageHeader, useData, ErrorState, Skeleton } from '../components/Common';
import GitHubConnection from '../components/GitHubConnection';
export default function Integrations() {
  const { data, error, loading, reload } = useData('/config');
  return (
    <main className="page-content">
      <PageHeader title="Connectors" description="Give your ideas the tools to get things done." />
      <section className="connector-roadmap">
        <h2>Your tools, on your terms.</h2>
        <p>
          Connect your account here, then choose a repository inside your project’s Memory & GitHub
          panel.
        </p>
        {new URLSearchParams(window.location.search).get('github') === 'connected' && (
          <p role="status">GitHub is connected. You can now select a repository in your project.</p>
        )}
        {new URLSearchParams(window.location.search).get('github') === 'permissions_updated' && (
          <p role="status">Repository access updated. Select your repository inside a project.</p>
        )}
        {new URLSearchParams(window.location.search).get('github') === 'error' && (
          <p role="alert">GitHub authorization did not finish. Connect again to retry.</p>
        )}
        <GitHubConnection />
        <div className="connector-plan-grid">
          {[
            [
              Github,
              'GitHub',
              'Choose your repositories, read source and review draft pull requests before publishing changes.',
              'Account connection',
            ],
            [
              FileText,
              'Drive & Notion',
              'Read selected briefs and documents. Keep permission scoped to what you choose.',
              'Planned',
            ],
            [
              Server,
              'Northflank hosting',
              'Publish a verified web app or PWA from the Publish panel. Review hosting costs and approve each release.',
              data?.capabilities.publishing ? 'Available' : 'Needs configuration',
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
