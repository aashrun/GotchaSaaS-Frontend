import { Link } from 'react-router-dom';
import { PageHeader, Logo } from '../components/Common';
import { Orbit, ArrowUpRight, ShieldCheck } from 'lucide-react';
const content = {
  help: [
    'Your next step, a little clearer.',
    'Describe your idea on New Project. It becomes a chat and starts building within your available credits. Verify your email first; the app will explain any missing setup in the conversation.',
    'Watch progress and answer questions in chat. A preview opens beside it when the build is ready. Project tools holds your code, checkpoints, export and optional GitHub connection. Failed builds preserve the previous source.',
    'Provider setup, deployment, tests, security boundaries, and the implementation checklist are documented in the repository README, INTEGRATIONS.md, DEPLOYMENT.md, and IMPLEMENTATION_STATUS.md.',
  ],
  analytics: [
    'Application analytics',
    'Not configured. Provider-reported request, compute, bandwidth, database, and performance metrics are not connected yet.',
    'No traffic or cost metrics are estimated or shown as real usage here. AI token usage is available in Billing & usage.',
  ],
  'api-keys': [
    'Platform API keys',
    'Unavailable in this release. Public API credential issuance and scoped access are on the roadmap.',
    'AI and infrastructure API keys are server-only environment settings. Never put them in a frontend VITE_ variable.',
  ],
  privacy: [
    'Privacy policy · draft for legal review',
    'This policy has not been reviewed by legal counsel. Do not publish it as a finalized policy.',
    'The platform stores account information, projects, source, conversation messages, operational records, and usage records in PostgreSQL. Generated source and project context are sent to configured AI providers; builds run in E2B. Resource creation uses the providers you approve.',
    'You can export account data and project source. Account deletion is blocked until active subscriptions, jobs, and paid external resources have been resolved. Retention automation and compliance certification are not implemented.',
  ],
  terms: [
    'Terms of service · draft for legal review',
    'These terms are placeholders pending legal review. Commercial terms, acceptable use, dispute resolution, and jurisdiction require operator review.',
    'Users retain their application source. AI results require review and testing. Pricing and resource costs must be configured by the operator and approved before resource creation.',
    'No compliance certification, security audit, uptime guarantee, or production-readiness claim is made.',
  ],
};
export default function Info({ type }) {
  const data = content[type] || content.help;
  return (
    <main
      className={
        'page-content info-page ' + (['privacy', 'terms'].includes(type) ? 'public-info' : '')
      }
    >
      {['privacy', 'terms'].includes(type) && <Logo />}
      <PageHeader
        eyebrow={type === 'help' ? 'A LITTLE GUIDANCE' : 'TRANSPARENT BY DESIGN'}
        title={data[0]}
      />
      <div className="info-card">
        <Orbit size={27} />
        {data.slice(1).map((p) => (
          <p key={p}>{p}</p>
        ))}
        <Link className="text-link" to="/projects">
          Open your workspace
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </main>
  );
}
