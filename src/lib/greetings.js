const greetings = [
  (name) => `Got an idea, ${name}? Let's ship it.`,
  (name) => `What are we shipping today, ${name}?`,
  (name) => `Big idea or wild idea, ${name}?`,
  (name) => `Your next “what if” starts here, ${name}.`,
  (name) => `What's been living in your head, ${name}?`,
  (name) => `Let's turn that tab-hoarding into a launch, ${name}.`,
  (name) => `Ready to make something real, ${name}?`,
  (name) => `Less someday. More shipped, ${name}.`,
  (name) => `What deserves a launch button, ${name}?`,
  (name) => `Got five minutes and a bold idea, ${name}?`,
];
export function nextGreeting(user) {
  const name = user.firstName?.trim().split(/\s+/)[0] || 'builder';
  const key = 'gotcha-greeting:' + user.id;
  let previous = -1;
  try {
    previous = Number(sessionStorage.getItem(key) ?? -1);
  } catch {}
  let index = Math.floor(Math.random() * (greetings.length - 1));
  if (previous >= 0 && previous < greetings.length && index >= previous) index++;
  try {
    sessionStorage.setItem(key, String(index));
  } catch {}
  return greetings[index](name);
}
