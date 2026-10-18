import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

// One sizing policy for pasted text, dictation and typing in every prompt composer.
const GrowingTextarea = forwardRef(function GrowingTextarea({ value = '', ...props }, ref) {
  const input = useRef(null);
  const resize = useRef(null);
  useImperativeHandle(ref, () => input.current);
  resize.current = () => {
    const el = input.current;
    if (!el) return;
    const scroll = el.scrollTop;
    const minimum = parseFloat(getComputedStyle(el).minHeight) || 52;
    const viewport = window.visualViewport?.height || window.innerHeight;
    const maximum = Math.max(minimum, Math.min(360, viewport * 0.38));
    el.style.maxHeight = maximum + 'px';
    el.style.height = '0px';
    const content = el.scrollHeight;
    el.style.height = Math.max(minimum, Math.min(maximum, content)) + 'px';
    el.style.overflowY = content > maximum ? 'auto' : 'hidden';
    el.scrollTop =
      document.activeElement === el && el.selectionEnd === el.value.length
        ? el.scrollHeight
        : scroll;
  };
  useLayoutEffect(() => {
    resize.current();
  }, [value]);
  useLayoutEffect(() => {
    const el = input.current;
    let width = el.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - width) < 1) return;
      width = entry.contentRect.width;
      resize.current();
    });
    observer.observe(el);
    const update = () => resize.current();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  return <textarea {...props} value={value} ref={input} data-growing-prompt />;
});
export default GrowingTextarea;
