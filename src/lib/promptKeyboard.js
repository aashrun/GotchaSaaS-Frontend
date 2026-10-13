export function submitPromptOnEnter(event) {
  if (
    event.key !== 'Enter' ||
    event.shiftKey ||
    event.nativeEvent.isComposing ||
    event.nativeEvent.keyCode === 229
  )
    return;
  event.preventDefault();
  if (event.repeat) return;
  const form = event.currentTarget.form;
  const submit = form?.querySelector(
    'button:not([type]), button[type="submit"], input[type="submit"]',
  );
  if (submit && !submit.disabled) form.requestSubmit(submit);
}
