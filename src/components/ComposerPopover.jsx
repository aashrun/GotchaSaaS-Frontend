import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';

export default function ComposerPopover({
  label,
  contentLabel,
  trigger,
  triggerClassName,
  className,
  disabled,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [sideOffset, setSideOffset] = useState(12);
  const button = useRef(null);
  // Clear the entire composer, including a growing textarea, while aligning with the button.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = button.current;
    const composer = trigger?.closest('form');
    if (!composer) return;
    const updateOffset = () =>
      setSideOffset(
        Math.max(
          12,
          trigger.getBoundingClientRect().top - composer.getBoundingClientRect().top + 12,
        ),
      );
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(composer);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={button}
        type="button"
        className={triggerClassName}
        aria-label={label}
        title={label}
        disabled={disabled}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={'composer-popover ' + className}
          aria-label={contentLabel}
          side="top"
          align="start"
          sideOffset={sideOffset}
          collisionPadding={12}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
