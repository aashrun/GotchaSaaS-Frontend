import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Shapes, Search } from 'lucide-react';
import { useData, PageHeader, TemplateArt, ErrorState, Skeleton } from '../components/Common';
export default function Templates() {
  const { data, error, loading, reload } = useData('/templates'),
    navigate = useNavigate(),
    [category, setCategory] = useState('All'),
    [search, setSearch] = useState('');
  return (
    <main className="page-content">
      <PageHeader
        eyebrow="A GOOD PLACE TO BEGIN"
        title="Skip the blank canvas."
        description="A small collection of working frontend starters. Your idea takes it from here."
      />
      <div className="project-controls">
        <div className="filter-tabs">
          {['All', 'Business', 'Productivity', 'Creative', 'Marketing'].map((x) => (
            <button
              key={x}
              className={category === x ? 'active' : ''}
              onClick={() => setCategory(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="project-search">
          <Search size={15} />
          <input
            placeholder="Find a starting point…"
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading ? (
        <Skeleton />
      ) : (
        <div className="template-grid catalog">
          {data.templates
            .filter(
              (t) =>
                (category === 'All' || category === t.category) &&
                t.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((t) => (
              <button
                className="template-card"
                key={t.id}
                onClick={() => {
                  sessionStorage.setItem('gotcha-template', t.id);
                  navigate('/projects?new=true');
                }}
              >
                <TemplateArt type={t.id} />
                <div className="template-caption">
                  <div>
                    <h3>{t.name}</h3>
                    <span>{t.category} · Frontend starter</span>
                    <p>{t.description}</p>
                  </div>
                  <ArrowUpRight size={19} />
                </div>
              </button>
            ))}
        </div>
      )}
      <div className="notice">
        <Shapes size={20} />
        <div>
          <strong>Built to be a beginning.</strong>
          <p>
            CRM and task records are held in browser memory. Authentication, payments, booking,
            storage, and database integrations require additional implementation; they are not
            included in these starters.
          </p>
        </div>
      </div>
    </main>
  );
}
