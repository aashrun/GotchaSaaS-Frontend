import { useEffect, useState } from 'react';

const ROTATION_MS = 2 * 60 * 60 * 1000;
const randomView = (length, previous) => {
  if (length <= 1) return 0;
  if (!Number.isInteger(previous) || previous < 0 || previous >= length)
    return Math.floor(Math.random() * length);
  const candidate = Math.floor(Math.random() * (length - 1));
  return candidate >= previous ? candidate + 1 : candidate;
};
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

export function useEarthScene(userId, theme) {
  const [catalog, setCatalog] = useState({ dark: [], light: [] });
  const [selection, setSelection] = useState({ index: 0, changedAt: Date.now() });
  const views = catalog[theme] || [];
  const key = `nebula-earth:${userId}:${theme}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch('/earth/catalog.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Earth gallery unavailable');
        return response.json();
      })
      .then(setCatalog)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!views.length) return;
    const login = sessionStorage.getItem('nebula-login-at') || 'existing-session';
    const previous = read(key);
    const now = Date.now();
    const storedIndex = Number.isInteger(previous?.index) ? previous.index : 0;
    const advance =
      previous && (previous.login !== login || now - previous.changedAt >= ROTATION_MS);
    const next = {
      key,
      index:
        advance || !previous
          ? randomView(views.length, previous?.index)
          : ((storedIndex % views.length) + views.length) % views.length,
      changedAt: advance || !previous ? now : previous.changedAt,
      login,
    };
    setSelection(next);
    localStorage.setItem(key, JSON.stringify(next));
  }, [key, views.length]);

  function rotate() {
    if (!views.length || selection.key !== key) return;
    const updated = {
      ...selection,
      index: randomView(views.length, selection.index),
      changedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(updated));
    setSelection(updated);
  }

  useEffect(() => {
    if (!views.length || selection.key !== key) return;
    const due = Math.max(0, ROTATION_MS - (Date.now() - selection.changedAt));
    const timeout = window.setTimeout(rotate, due);
    return () => window.clearTimeout(timeout);
  }, [selection.changedAt, selection.key, views.length, key]);

  return {
    views,
    index: selection.index % Math.max(views.length, 1),
    current: selection.key === key ? views[selection.index % Math.max(views.length, 1)] : undefined,
  };
}

export function EarthBackdrop({ scene, subdued = false }) {
  const [loaded, setLoaded] = useState('');
  const [previous, setPrevious] = useState('');
  const source = scene.current?.src;
  useEffect(() => {
    if (!source || source === loaded) return;
    const image = new Image();
    let active = true;
    image.onload = () => {
      if (active) {
        setPrevious(loaded);
        setLoaded(source);
      }
    };
    image.src = source;
    return () => {
      active = false;
    };
  }, [source, loaded]);
  return (
    <div className={'earth-backdrop ' + (subdued ? 'earth-subdued' : '')} aria-hidden="true">
      {previous && <img src={previous} alt="" />}
      {loaded && <img key={loaded} className="earth-current" src={loaded} alt="" />}
      <div className="earth-veil" />
    </div>
  );
}
