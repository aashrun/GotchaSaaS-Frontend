import ActivityIndicator from './ActivityIndicator';
export default function OpeningProject({
  prompt,
  message = 'Opening your workspace…',
  title = 'New project',
}) {
  return (
    <main className="project-chat project-launch" aria-label="Starting your project">
      <header className="project-chat-header">
        <span>{title}</span>
      </header>
      <section className="project-chat-column" aria-label="Project chat">
        <div className="project-conversation">
          {prompt && (
            <div className="chat-message user">
              <p>{prompt}</p>
            </div>
          )}
          <ActivityIndicator phase="connecting" label={message} />
        </div>
      </section>
    </main>
  );
}
