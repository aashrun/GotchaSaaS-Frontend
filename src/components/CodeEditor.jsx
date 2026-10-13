import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/typescript/register.js';
import 'monaco-editor/languages/definitions/javascript/register.js';
import 'monaco-editor/languages/definitions/css/register.js';
import 'monaco-editor/languages/definitions/html/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
export default function CodeEditor({ path, value, onChange, readOnly }) {
  const language = path?.endsWith('css')
    ? 'css'
    : path?.endsWith('html')
      ? 'html'
      : path?.endsWith('json')
        ? 'json'
        : path?.endsWith('md')
          ? 'markdown'
          : path?.endsWith('js')
            ? 'javascript'
            : 'typescript';
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      path={path}
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 12,
        lineHeight: 21,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        padding: { top: 18, bottom: 18 },
        automaticLayout: true,
        tabSize: 2,
      }}
      loading={<span className="muted">Opening source editor…</span>}
    />
  );
}
