import { useState, useEffect } from 'react';
import { Users, Trash2, Plus } from 'lucide-react';
import { PageHeader, useData, ErrorState, EmptyState } from '../components/Common';
import api from '../lib/api';
import { toast } from 'sonner';
export default function Team() {
  const { data, error } = useData('/organizations'),
    [org, setOrg] = useState(''),
    [members, setMembers] = useState([]),
    [role, setRole] = useState(''),
    [email, setEmail] = useState(''),
    [inviteRole, setInviteRole] = useState('editor');
  async function load(id) {
    try {
      const { data } = await api.get('/organizations/' + id + '/members');
      setMembers(data.members);
      setRole(data.role);
    } catch (e) {
      toast.error(e.message);
    }
  }
  useEffect(() => {
    if (data?.organizations.length && !org) setOrg(data.organizations[0].id);
  }, [data]);
  useEffect(() => {
    if (org) load(org);
  }, [org]);
  return (
    <main className="page-content">
      <PageHeader
        eyebrow="GOOD IDEAS GROW TOGETHER"
        title="Your people. Your workspace."
        description="Owner, admin, editor, and viewer permissions are enforced on the server."
      />
      {error && <ErrorState message={error} />}
      <div className="panel">
        <label className="form-stack">
          Workspace
          <select value={org} onChange={(e) => setOrg(e.target.value)}>
            {data?.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="member-list">
          {members.map((m) => (
            <div className="member-row" key={m.id}>
              <span className="user-avatar">{m.user?.firstName?.[0]}</span>
              <div>
                <strong>
                  {m.user?.firstName} {m.user?.lastName}
                </strong>
                <small>{m.user?.email}</small>
              </div>
              <span className="capability-badge">{m.role}</span>
              {role === 'owner' && m.role !== 'owner' && (
                <button
                  className="icon-button danger-text"
                  aria-label={'Remove ' + m.user?.email}
                  onClick={async () => {
                    try {
                      await api.delete('/organizations/' + org + '/members/' + m.id);
                      await load(org);
                    } catch (e) {
                      toast.error(e.message);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {role === 'owner' && (
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post('/organizations/' + org + '/members', { email, role: inviteRole });
              setEmail('');
              await load(org);
              toast.success('Member added');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          <h3>Add a member</h3>
          <p className="muted">
            They must already have a verified Gotcha! account. No invitation email is sent.
          </p>
          <label>
            Email address
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Permission
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {['admin', 'editor', 'viewer'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <button className="primary-button">
            <Plus size={16} />
            Add member
          </button>
        </form>
      )}
    </main>
  );
}
