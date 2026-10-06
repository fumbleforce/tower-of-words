// Authored scenes; Claude's place dispatcher checks each descriptor before offering its node.
// Step 2 expresses an existing friendship. It never manufactures points or calls bondStep.
export const leave = [{ do: 'milestone', state: 'free' }, { do: 'cam', back: true }];
export const finish = (who, step, text, daytime = false) => [
  { set: `ms${step}_${who}` },
  ...(step >= 3 ? [{ do: 'bondStep', who, to: step }] : []),
  { do: 'remember', who, id: `milestone${step}`, text }, ...leave,
  ...(typeof daytime === 'string' ? [{ if: daytime, then: [{ unset: daytime }, { do: 'period', to: 'next' }] }] : daytime ? [{ do: 'period', to: 'next' }] : []), { do: 'save' },
];
export const offer = (key, eligible, text, accept, body) => ({
  [key]: [{ if: eligible, then: [
    ...text, { choice: [{ text: accept, go: key + '_play' }, { text: 'Another time.', go: 'milestone_leave' }] },
  ] }],
  [key + '_play']: body,
});
