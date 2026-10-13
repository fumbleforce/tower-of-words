// Rebuild physical staging on replay; a completed hook may omit an already-closed modal.
export async function replayWorldHook(hook, step, context, key, persist) {
  const marker = key + ':hook',
    completed = context.frame.done.includes(marker);
  if (completed && !context.replaying) return;
  await hook(step, { completedReplay: context.replaying && completed });
  if (!completed) context.frame.done.push(marker);
  persist();
}
