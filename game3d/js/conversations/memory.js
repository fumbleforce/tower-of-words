// Heard evidence survives the rolling dialogue log. Understanding is evaluated
// against today's vocabulary, without rewriting what the player knew then.
const copyClear = (entries) =>
  structuredClone(
    (Array.isArray(entries) ? entries : []).filter(
      (entry) =>
        typeof entry === 'string' ||
        (entry &&
          typeof entry.ja === 'string' &&
          ['ro', 'en'].every((key) => entry[key] === undefined || typeof entry[key] === 'string')),
    ),
  );

export function createConversationMemory(catalogue) {
  const definitions = new Map(catalogue.map((entry) => [entry.id, entry]));
  let records = new Map();
  const understood = (definition, words) => definition.words.every((word) => words.has(word));
  return {
    hear({ who, text, source, known, clear = [], voiceKey = null }) {
      for (const definition of catalogue) {
        if (definition.who !== who || !definition.lines.includes(text) || records.has(definition.id)) continue;
        records.set(definition.id, {
          id: definition.id,
          who,
          text,
          source: { ...source },
          ...(clear.length ? { clear: copyClear(clear) } : {}),
          knownAtTime: known ? [...known] : null,
          understoodAtTime: known ? understood(definition, known) : null,
          ...(voiceKey ? { voiceKey } : {}),
          revisited: false,
        });
      }
    },
    has(id) {
      return records.has(id);
    },
    ready(id, words) {
      return records.has(id) && understood(definitions.get(id), words);
    },
    revisit(id, words) {
      const record = records.get(id);
      if (record && understood(definitions.get(id), words)) record.revisited = true;
    },
    entries() {
      return structuredClone([...records.values()]);
    },
    toJSON() {
      return { v: 1, records: this.entries() };
    },
    load(saved) {
      records = new Map();
      if (saved?.v !== 1 || !Array.isArray(saved.records)) return;
      for (const record of saved.records) {
        const definition = definitions.get(record?.id);
        if (!definition || record.who !== definition.who || !definition.lines.includes(record.text)) continue;
        if (
          record.knownAtTime !== null &&
          (!Array.isArray(record.knownAtTime) || !record.knownAtTime.every((word) => typeof word === 'string'))
        )
          continue;
        if (records.has(record.id)) continue;
        records.set(record.id, {
          id: record.id,
          who: record.who,
          text: record.text,
          source: {
            day: Number.isInteger(record.source?.day) ? record.source.day : null,
            period: typeof record.source?.period === 'string' ? record.source.period : '',
            place: typeof record.source?.place === 'string' ? record.source.place : '',
            node: typeof record.source?.node === 'string' ? record.source.node : '',
          },
          ...(Array.isArray(record.clear) && record.clear.length ? { clear: copyClear(record.clear) } : {}),
          knownAtTime: record.knownAtTime ? [...record.knownAtTime] : null,
          understoodAtTime: record.knownAtTime ? understood(definition, new Set(record.knownAtTime)) : null,
          ...(typeof record.voiceKey === 'string' ? { voiceKey: record.voiceKey } : {}),
          revisited: record.revisited === true,
        });
      }
    },
  };
}
