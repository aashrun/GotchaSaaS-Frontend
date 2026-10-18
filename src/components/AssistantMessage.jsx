import Markdown from 'react-markdown';
import { memo } from 'react';
import { CompletionReport } from './BuildActivity';

// Live job polls must not reparse every previous answer in a long conversation.
const Answer = memo(function Answer({ content }) {
  return (
    <div className="assistant-response">
      <Markdown
        skipHtml
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ alt }) => <span>{alt}</span>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});
export default function AssistantMessage({ content, job }) {
  return (
    <div className="chat-message assistant">
      <Answer content={content} />
      {job?.state === 'completed' && <CompletionReport job={job} />}
    </div>
  );
}
