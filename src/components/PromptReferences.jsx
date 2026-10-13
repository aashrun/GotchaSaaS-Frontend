import { useRef, useState } from 'react';
import { Plus, FileText, Image, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

export function ReferenceChips({ references, onChange, disabled }) {
  if (!references.length) return null;
  return (
    <div className="reference-chips" aria-label="Attached references">
      {references.map((reference, index) => (
        <div className="reference-chip" key={index}>
          {reference.type === 'image' ? (
            <img src={reference.dataUrl} alt="" />
          ) : (
            <FileText size={15} />
          )}
          <span>{reference.name}</span>
          <button
            type="button"
            className="icon-button"
            disabled={disabled}
            aria-label={'Remove reference ' + reference.name}
            onClick={() => onChange(references.filter((_, i) => i !== index))}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function PromptReferences({ references, onChange, onBusy, disabled }) {
  const picker = useRef(null),
    menu = useRef(null),
    pending = useRef(false);
  const [busy, setBusy] = useState(false);
  async function attach(event) {
    const files = [...event.target.files];
    event.target.value = '';
    if (pending.current || !files.length) return;
    if (files.length + references.length > 4) return toast.error('Attach up to four references.');
    pending.current = true;
    setBusy(true);
    onBusy?.(true);
    const prepared = [];
    try {
      for (const file of files) {
        const image = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
        if (file.size > (image ? 1024 * 1024 : 10000))
          throw new Error(image ? 'Images must be under 1 MB.' : 'Text files must be under 10 KB.');
        if (!image && !/\.(txt|md|csv|json|css|js|jsx|ts|tsx|html)$/i.test(file.name))
          throw new Error('Choose a text file or a PNG, JPEG or WebP image.');
        const reference = image
          ? {
              type: 'image',
              name: file.name,
              dataUrl: await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('This image could not be read.'));
                reader.readAsDataURL(file);
              }),
            }
          : { type: 'text', name: file.name, content: await file.text() };
        const { data } = await api.post('/ai/references', { references: [reference] });
        prepared.push(data.references[0]);
      }
      const combined = [...references, ...prepared];
      if (combined.filter((r) => r.type === 'image').length > 2)
        throw new Error('Attach up to two images per prompt.');
      onChange(combined);
    } catch (error) {
      toast.error(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }
  function choose(accept) {
    picker.current.accept = accept;
    menu.current.open = false;
    picker.current.click();
  }
  return (
    <div className="reference-picker">
      <details ref={menu}>
        <summary
          className="icon-button"
          aria-label="Add files or images"
          title="Add files or images"
          onClick={(event) => (disabled || busy) && event.preventDefault()}
        >
          {busy ? <Loader2 size={18} className="voice-spinner" /> : <Plus size={20} />}
        </summary>
        <div className="reference-menu">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => choose('.txt,.md,.csv,.json,.css,.js,.jsx,.ts,.tsx,.html')}
          >
            <FileText size={16} /> Add a text file
          </button>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => choose('image/png,image/jpeg,image/webp')}
          >
            <Image size={16} /> Add an image
          </button>
          <small>4 references · up to 2 images</small>
        </div>
      </details>
      <input
        ref={picker}
        type="file"
        aria-label="Reference files"
        multiple
        hidden
        onChange={attach}
      />
    </div>
  );
}
