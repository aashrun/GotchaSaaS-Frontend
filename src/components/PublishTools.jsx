import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { useData, ErrorState, Modal } from './Common';
export default function PublishTools({ project }) {
  const { data, error, reload } = useData('/resources/' + project.id + '/publication');
  const [review, setReview] = useState(false),
    [unpublish, setUnpublish] = useState(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('');
  const key = useRef(null);
  useEffect(() => {
    if (!data?.operations.some((op) => ['pending', 'running', 'provisioning'].includes(op.state)))
      return;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [data?.operations]);
  if (error) return <ErrorState message={error} retry={reload} />;
  if (!data) return <p className="muted">Checking publication…</p>;
  const built = project.settings.validatedRevision === project.revision;
  const target = project.settings.buildPlan?.target;
  if (['mobile', 'desktop'].includes(target))
    return (
      <div className="form-stack">
        <h3>
          {target === 'mobile'
            ? 'Create your phone app packages'
            : 'Create your desktop installers'}
        </h3>
        <p>
          {built
            ? 'The current UI has passed its build and browser checks.'
            : 'Build and verify the application first.'}{' '}
          Native package and device checks are separate.
        </p>
        <a className="secondary-button" href={'/v1/projects/' + project.id + '/export'}>
          Download complete project
        </a>
        <p className="muted">
          {target === 'mobile'
            ? 'Use your Expo account for Android/iPhone builds. Your downloaded project includes the build configuration and guide. Before distribution, resolve the recorded Expo build-tool dependency advisories and run device checks. App-store publishing requires your developer accounts and approval.'
            : 'Your project includes an OS build workflow for Windows, macOS and Linux. Installers need OS testing, signing and macOS notarization before public distribution.'}
        </p>
      </div>
    );

  return (
    <div className="form-stack">
      <h3>Ready to share it?</h3>
      <p className="muted">
        Download the verified app, or review a public deployment. Publishing uploads this revision
        and makes it accessible to anyone with the link. Hosting is billed separately.
      </p>
      {built && project.template !== 'fullstack' && (
        <a
          className="secondary-button"
          href={'/v1/projects/' + project.id + '/preview?download=true'}
          download
        >
          Download playable app
        </a>
      )}
      {!data.ready && (
        <div className="notice">
          <strong>Public hosting needs setup</strong>
          <ul>
            {data.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p>Your saved app and preview are available while hosting is configured.</p>
        </div>
      )}
      <button
        className="primary-button"
        disabled={!data.ready || busy}
        onClick={() => {
          key.current = crypto.randomUUID();
          setReview(true);
        }}
      >
        Review publication
      </button>
      {failure && <p role="alert">{failure}</p>}
      {data.deployments
        ?.filter((d) => d.status !== 'unpublished')
        .map((d) => (
          <div key={d.id}>
            <strong>
              {d.provider}: {d.status.replaceAll('_', ' ')}
            </strong>
            {d.url && (
              <p>
                <a href={d.url} target="_blank" rel="noreferrer">
                  Open published app
                </a>
              </p>
            )}
            <button className="text-button" disabled={busy} onClick={() => setUnpublish(d)}>
              Take app offline
            </button>
          </div>
        ))}
      {data.operations.map((op) => (
        <div key={op.id}>
          <strong>{op.state.replaceAll('_', ' ')}</strong>
          {op.result?.url && (
            <p>
              <a href={op.result.url} target="_blank" rel="noreferrer">
                {op.result.url}
              </a>
            </p>
          )}
          {op.error && <p role="alert">{op.error}</p>}
          {op.provider === 'northflank' && ['unknown', 'partial_failure'].includes(op.state) && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setFailure('');
                try {
                  await api.post(
                    '/resources/' + project.id + '/operations/' + op.id + '/reconcile',
                  );
                  await reload();
                } catch (e) {
                  setFailure(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Check hosting outcome
            </button>
          )}
        </div>
      ))}
      <Modal
        open={!!unpublish}
        onOpenChange={(open) => !open && setUnpublish(null)}
        title="Take this app offline?"
        description="This deletes the hosted service and its public address. Your saved project and source stay in Gotcha."
      >
        <p>{unpublish?.url}</p>
        <button
          className="primary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFailure('');
            try {
              await api.delete('/resources/deployment/' + unpublish.id, {
                data: { confirmation: 'UNPUBLISH APPLICATION' },
              });
              setUnpublish(null);
              await reload();
            } catch (e) {
              setFailure(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Take app offline
        </button>
      </Modal>
      <Modal
        open={review}
        onOpenChange={setReview}
        title="Publish this app publicly?"
        description={
          'Revision ' +
          data.revision +
          ' will be uploaded to ' +
          data.provider +
          '. Review the app before approving.'
        }
      >
        <p>{data.url}</p>
        {data.provider === 'northflank' && (
          <p>
            Northflank plan: {data.plan}, one running instance. Provider usage is billed to the
            platform account while this app is hosted.
          </p>
        )}
        <p>
          Provider hosting costs apply. This publishes the current frontend; it does not deploy a
          database or application backend.
        </p>
        <button
          className="primary-button"
          disabled={busy || !data.ready}
          onClick={async () => {
            setBusy(true);
            setFailure('');
            try {
              await api.post('/resources', {
                projectId: project.id,
                kind: 'deployment',
                provider: data.provider,
                revision: data.revision,
                confirmation: 'APPROVE PAID RESOURCE',
                idempotencyKey: key.current,
              });
              setReview(false);
              await reload();
            } catch (e) {
              setFailure(e.message);
              await reload();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Queuing publication…' : 'Approve public deployment'}
        </button>
      </Modal>
    </div>
  );
}
