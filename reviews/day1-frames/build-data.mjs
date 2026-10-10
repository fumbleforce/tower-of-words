// Frozen review excerpts. Run from any directory; no story files are changed.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import gate from "../../game3d/story/gate.js";
import office from "../../game3d/story/office.js";
import transitions from "../../game3d/story/transitions.js";

const hashes = {
  gate: "59ae37906ef3bf458628fe670e81bc8db6ad383f0b00554bd0d7e641c458930a",
  office: "9a5b66b4f6d1cb90104ec7cd2a0e6d474d5eca0a181317ac99c77efc02bb6210",
  transitions:
    "1903dff2890d4525ef221c0dd851b591830f43ad029b5a4c71f6ec1d0672ae71",
};
for (const [name, expected] of Object.entries(hashes)) {
  const bytes = readFileSync(
    new URL(`../../game3d/story/${name}.js`, import.meta.url),
  );
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    throw new Error(
      `${name}.js differs from the reviewed baseline; update excerpts deliberately.`,
    );
  }
}
const action = (text, focus = false) => ({
  speaker: null,
  kind: "action",
  text,
  ...(focus && { focus }),
});
const line = (text, speaker = null, face) => ({
  speaker,
  kind: "line",
  text: text.replace(/^>\s*/, ""),
  ...(face && { face }),
});
const mark = (frame) => ({ ...frame, focus: true });
const frame = (value) => {
  if (typeof value === "string") return line(value);
  if (value.say) return line(value.text, value.say, value.face);
  if (value.choice)
    return {
      speaker: null,
      kind: "choice",
      text: (value.prompt || "Choose a reply").replace(/^>\s*/, ""),
      options: value.choice.map((x) => x.text),
    };
  if (value.do === "type") {
    const spoken = value.prompt.match(/^(\w+):\s*(.*)$/);
    return {
      speaker: spoken ? spoken[1] : null,
      kind: "prompt",
      text: spoken ? spoken[2] : value.prompt.replace(/^>\s*/, ""),
      options: [`Type ${value.word}`],
    };
  }
  throw new Error(`Expected a visible frame: ${JSON.stringify(value)}`);
};
const g = (node, index) => frame(gate.nodes[node][index]);
const o = (node, index) => frame(office.nodes[node][index]);
const l = (index) => frame(transitions.gate_to_office.ride[index]);
const change = (id, title, summary, kind, before, after, source) => ({
  id,
  title,
  summary,
  kind,
  before,
  after,
  source,
});
const gateChanges = [];
const G = (...args) => gateChanges.push(change(...args));

G(
  "g01",
  "Greeting and card request",
  "Combine the guard’s reply and card request. Both greetings still work, with the same bows and pointing.",
  "merge",
  [
    action("If you say good morning to the guard:"),
    mark(g("ohayo_guard", 3)),
    action("You and the guard bow. He points to the reader."),
    mark(g("guard_points_reader", 1)),
    action("Tap your card on the reader."),
    action("Or, if you introduce yourself instead:"),
    mark(g("yoroshiku_guard", 3)),
    action("The guard bows and points to the reader."),
    mark(g("guard_points_reader", 1)),
    action("Tap your card on the reader."),
  ],
  [
    action("If you say good morning to the guard:"),
    mark(line("{ohayo}。カードを、どうぞ。", "guard")),
    action("You and the guard bow. He points to the reader."),
    action("Tap your card on the reader."),
    action("Or, if you introduce yourself instead:"),
    mark(line("はい、{yoroshiku}。カードを、どうぞ。", "guard", "amused")),
    action("The guard bows and points to the reader."),
    action("Tap your card on the reader."),
  ],
  "gate.md G1–G3; ohayo_guard[3], yoroshiku_guard[3], guard_points_reader[1]",
);
G(
  "g04",
  "A commuter apologises",
  "Remove the commuter’s extra apology after your card is refused. The guard still beckons you over. This shows his reply if you greeted him.",
  "remove",
  [
    action("You tap your card. The reader turns red."),
    g("card_red", 1),
    mark(g("card_red", 2)),
    action("The guard beckons you to his desk."),
    frame(gate.nodes.card_red[8].then[0]),
  ],
  [
    action("You tap your card. The reader turns red."),
    g("card_red", 1),
    action("The guard beckons you to his desk."),
    frame(gate.nodes.card_red[8].then[0]),
  ],
  "gate.md G4; card_red[2]; polite registration response shown",
);
G(
  "g05",
  "The guard points to the bench",
  "Remove his separate waiting instruction. He still shows nine, points at the bench, and you go over to it.",
  "remove",
  [
    g("card_red", 10),
    action("The guard points to the bench."),
    mark(g("card_red", 13)),
    action("Wait on the bench until nine."),
    action("Eric sits on the bench."),
  ],
  [
    g("card_red", 10),
    action("The guard points to the bench."),
    action("Wait on the bench until nine."),
    action("Eric sits on the bench."),
  ],
  "gate.md G5; card_red[13]",
);
G(
  "g06",
  "The exact time on the bench",
  "Remove the separate 8:52 text. Your card still becomes valid at nine.",
  "remove",
  [
    action("Eric sits on the bench."),
    mark(g("bench_wait", 3)),
    action("The man from the train arrives."),
    g("bench_wait", 6),
  ],
  [
    action("Eric sits on the bench."),
    action("The man from the train arrives."),
    g("bench_wait", 6),
  ],
  "gate.md G6; bench_wait[3]",
);
G(
  "g07",
  "The gate’s fault announcement",
  "Remove the machine’s Japanese fault message. The red gate and the explanation of its count remain.",
  "remove",
  [
    g("bench_wait", 6),
    action("The gate jams around the man and his briefcase."),
    mark(g("bench_wait", 10)),
    g("bench_wait", 11),
    g("bench_wait", 13),
  ],
  [
    g("bench_wait", 6),
    action("The gate jams around the man and his briefcase."),
    g("bench_wait", 11),
    g("bench_wait", 13),
  ],
  "gate.md G7; bench_wait[10]",
);
G(
  "g08",
  "Explain why he is stuck",
  "Name the counting error and its result in the same line.",
  "replace",
  [
    action("The gate jams."),
    g("bench_wait", 10),
    mark(g("bench_wait", 11)),
    g("bench_wait", 13),
  ],
  [
    action("The gate jams."),
    g("bench_wait", 10),
    mark(
      line(
        "The gate counts the man and his briefcase as two people. He's stuck.",
      ),
    ),
    g("bench_wait", 13),
  ],
  "gate.md G8; bench_wait[11]",
);
G(
  "g09",
  "Hamada repeats “open”",
  "Keep one slow “open” and the meaning cue. Remove his two further attempts. You still type the word if you help him.",
  "merge",
  [
    g("bench_wait", 11),
    mark(g("bench_wait", 13)),
    g("bench_wait", 14),
    mark(g("bench_wait", 15)),
    mark(g("bench_wait", 16)),
    g("bench_wait", 18),
  ],
  [
    g("bench_wait", 11),
    action("He says the next word slowly."),
    mark(g("bench_wait", 13)),
    g("bench_wait", 14),
    g("bench_wait", 18),
  ],
  "gate.md G9; bench_wait[13,15,16]; retained [13] gets slow:true",
);
G(
  "g10",
  "Hamada’s gesture",
  "Shorten the description of his attempt to open the gate.",
  "replace",
  [g("bench_wait", 13), mark(g("bench_wait", 14)), g("bench_wait", 15)],
  [
    g("bench_wait", 13),
    mark(line("He mimes pulling the gate open.")),
    g("bench_wait", 15),
  ],
  "gate.md G10; bench_wait[14]",
);
G(
  "g11",
  "Mio’s phone messages",
  "Combine her two messages. Keep her suspicion and point you toward the guard.",
  "merge",
  [
    g("bench_wait", 18),
    action("Mio sends you a message."),
    mark(g("bench_wait", 22)),
    mark(g("bench_wait", 23)),
    action("The man is stuck. Help him, or get the guard."),
  ],
  [
    g("bench_wait", 18),
    action("Mio sends you a message."),
    mark(
      line(
        "the lobby gate again? is that you? say {sumimasen} to the guard and show him",
        "miotext",
      ),
    ),
    action("The man is stuck. Help him, or get the guard."),
  ],
  "gate.md G11; bench_wait[22,23]; C-0092 correction",
);
G(
  "g12",
  "Talk to the stuck man",
  "Replace his repeated explanation with a prompt on the choice. Helping him and leaving him alone remain available.",
  "flow",
  [
    action("You talk to the man caught in the gate. He turns toward you."),
    mark(g("hamada_stuck", 2)),
    mark(g("hamada_stuck", 4)),
    action("If you choose to help:"),
    g("word_type", 0),
  ],
  [
    action("You talk to the man caught in the gate. He turns toward you."),
    mark({ ...g("hamada_stuck", 4), text: "He's still stuck in the gate." }),
    action("If you choose to help:"),
    g("word_type", 0),
  ],
  "gate.md G12; hamada_stuck[2,4]",
);
G(
  "g13",
  "Your word opens the gate",
  "Add a direct line about the gate opening at your word; remove the guard’s second phone exchange. Eric still connects it to the train.",
  "replace",
  [
    action("You say {akete}. The gate snaps open with the word’s effect."),
    g("word_say", 5),
    action("Hamada gets through the gate."),
    mark(g("word_say", 10)),
    g("word_say", 12),
    action("The guard points you toward the lift."),
  ],
  [
    action("You say {akete}. The gate snaps open with the word’s effect."),
    mark(line("The gate snaps open at your word.")),
    g("word_say", 5),
    action("Hamada gets through. The guard ends his call."),
    g("word_say", 12),
    action("The guard points you toward the lift."),
  ],
  "gate.md G13; word_say after[2], delete[10]",
);
const originalMenu = g("mime_menu", 0);
const choiceFrame = (options, focus = true) => ({
  ...originalMenu,
  options,
  ...(focus && { focus }),
});
G(
  "g14",
  "Show the guard how to free the man",
  "Offer the useful mime immediately. Remove the two pointing choices, his explanation of the count, and the repeated description after you choose to lift. The squeeze and cat detours remain.",
  "flow",
  [
    g("way_social", 2),
    choiceFrame([
      "Point at the briefcase",
      "Point at the man",
      "Point at the cat under his desk",
    ]),
    action("You point at the briefcase."),
    choiceFrame(["Point at the man", "Point at the cat under his desk"]),
    action("You point at the man. He bows to the guard."),
    mark(g("guard_knows", 1)),
    choiceFrame([
      "Point at the cat under his desk",
      "Mime squeezing sideways through a gap",
      "Mime lifting something over your head",
    ]),
    action("You choose to mime lifting."),
    mark(g("mime_lift", 1)),
    action("The guard understands and gestures to Hamada."),
    g("mime_lift", 6),
  ],
  [
    g("way_social", 2),
    choiceFrame([
      "Mime lifting the briefcase over the gate",
      "Mime squeezing sideways through a gap",
      "Point at the cat under his desk",
    ]),
    action("You choose to mime lifting. Eric makes the gesture."),
    action("The guard understands and gestures to Hamada."),
    g("mime_lift", 6),
  ],
  "gate.md G14,G15,G17; mime_menu, pt_case, pt_man, guard_knows, mime_lift[1]; shortest social route, optional cat/squeeze not taken",
);
G(
  "g16",
  "Try squeezing through",
  "Name the briefcase in the optional failed mime.",
  "replace",
  [
    action("You choose “Mime squeezing sideways through a gap”."),
    mark(g("mime_squeeze", 2)),
    g("mime_squeeze", 4),
    action("The mime choices return."),
  ],
  [
    action("You choose “Mime squeezing sideways through a gap”."),
    mark(line("You mime squeezing past the briefcase.")),
    g("mime_squeeze", 4),
    action("The mime choices return."),
  ],
  "gate.md G16; mime_squeeze[2]",
);
G(
  "g18",
  "The guard laughs",
  "If you greeted him, remove his separate laugh after he understands your mime. His warmer permission at the end remains.",
  "remove",
  [
    action(
      "You greeted the guard earlier. You now mime lifting the briefcase.",
    ),
    g("mime_lift", 1),
    mark(frame(gate.nodes.mime_lift[3].else[0])),
    g("mime_lift", 6),
  ],
  [
    action(
      "You greeted the guard earlier. You now mime lifting the briefcase.",
    ),
    g("mime_lift", 1),
    action("The guard understands."),
    g("mime_lift", 6),
  ],
  "gate.md G18; mime_lift[3].else[0]; greeted route only",
);
G(
  "g19",
  "Eric thanks the guard",
  "Remove Eric’s final thanks. Hamada’s thanks, bow and the guard’s permission stay. This shows the warmer permission after greeting him.",
  "remove",
  [
    g("mime_lift", 13),
    action("Hamada bows and leaves."),
    frame(gate.nodes.mime_lift[22].else[0]),
    mark(g("mime_lift", 23)),
    action("Take the lift down to B2."),
  ],
  [
    g("mime_lift", 13),
    action("Hamada bows and leaves."),
    frame(gate.nodes.mime_lift[22].else[0]),
    action("Take the lift down to B2."),
  ],
  "gate.md G19; mime_lift[23]; warm permission shown; curt route unchanged too",
);
G(
  "g20",
  "Ask Tama to wait",
  "Name Tama in the description of her stopping at the bowl.",
  "replace",
  [
    action("You say {matte} to Tama."),
    mark(g("tama_matte", 0)),
    g("tama_matte", 1),
  ],
  [
    action("You say {matte} to Tama."),
    mark(line("Tama freezes with her head in the bowl.")),
    g("tama_matte", 1),
  ],
  "gate.md G20; tama_matte[0]",
);
G(
  "g21",
  "The visitor book",
  "Shorten the line that reveals Tama signed in first.",
  "replace",
  [
    action("You read the visitor book."),
    mark(g("signin", 0)),
    action("You can explore the lobby again."),
  ],
  [
    action("You read the visitor book."),
    mark(line("TAMA is the first name in today's visitor book.")),
    action("You can explore the lobby again."),
  ],
  "gate.md G21; signin[0]",
);

const liftChanges = [
  change(
    "l01",
    "Someone pressed five",
    "Remove the floor-button narration. The lift still stops at five before B2.",
    "remove",
    [
      action("The lift doors close."),
      mark(l(1)),
      action("The lift rises toward floor 3."),
      l(3),
      l(4),
    ],
    [
      action("The lift doors close."),
      action("The lift rises toward floor 3."),
      l(3),
      l(4),
    ],
    "gate.md L1; transitions gate_to_office.ride[1]",
  ),
  change(
    "l02",
    "Sales reacts to the newcomer",
    "Remove the man’s extra question. The meeting gossip and their reaction to your card stay.",
    "remove",
    [l(3), l(4), mark(l(5)), l(6), action("The lift opens at floor 5.")],
    [l(3), l(4), l(6), action("The lift opens at floor 5.")],
    "gate.md L2; transitions gate_to_office.ride[5]",
  ),
  change(
    "l03",
    "They notice your card",
    "Shorten the line about why the conversation stops.",
    "replace",
    [
      l(4),
      l(5),
      mark(l(6)),
      action("The lift opens at floor 5, then continues to B2."),
    ],
    [
      l(4),
      l(5),
      mark(line("They notice your card and stop talking.")),
      action("The lift opens at floor 5, then continues to B2."),
    ],
    "gate.md L3; transitions gate_to_office.ride[6]",
  ),
];
const officeChanges = [];
const O = (...args) => officeChanges.push(change(...args));
O(
  "o01",
  "Mori waits for a greeting",
  "Remove “He waits.” Mori still bows and the greeting control remains.",
  "remove",
  [
    o("office_in", 3),
    action("Mori bows deeply."),
    mark(o("office_in", 5)),
    action("Greet Mr. Mori."),
    action("If you introduce yourself:"),
    o("yoroshiku_mori", 3),
  ],
  [
    o("office_in", 3),
    action("Mori bows deeply."),
    action("Greet Mr. Mori."),
    action("If you introduce yourself:"),
    o("yoroshiku_mori", 3),
  ],
  "office.md O1; office_in[5]",
);
O(
  "o02",
  "Kenji introduces himself",
  "Merge his introduction and chair apology. Keep the forest-cat detour and Mio’s ban.",
  "merge",
  [
    o("kenji_first", 4),
    mark(o("kenji_first", 5)),
    mark(o("kenji_first", 6)),
    o("kenji_first", 9),
    o("kenji_first", 10),
  ],
  [
    o("kenji_first", 4),
    mark(
      line(
        "Eric-san? I am Kenji! Two months here, so now I am not the newest. Ah, sorry, your chair... I borrowed it. Mine is broken.",
        "kenji",
        "grin",
      ),
    ),
    o("kenji_first", 9),
    o("kenji_first", 10),
  ],
  "office.md O2; kenji_first[5,6]",
);
O(
  "o04",
  "From the cat chair to your first request",
  "Let Mio give you the request while you are already talking. Remove the invitation and extra Talk action, and bridge into the request. Keep the 1996 card and Eric’s reaction.",
  "flow",
  [
    action("You roll your chair out, with Tama still on it."),
    o("chair_push", 2),
    mark(o("chair_push", 3)),
    action("Talk to Mio.", true),
    mark(o("ticket", 2)),
    o("ticket", 3),
    o("ticket", 4),
    o("ticket", 6),
  ],
  [
    action("You roll your chair out, with Tama still on it."),
    o("chair_push", 2),
    mark(
      line(
        "Oh, and... I put your screen in English. Here, your first repair request.",
        "mio",
        "neutral",
      ),
    ),
    o("ticket", 3),
    o("ticket", 4),
    o("ticket", 6),
  ],
  "office.md O4,O5; chair_push[3,4], ticket[2]",
);
O(
  "o06",
  "Mori’s copier gesture",
  "Move the gesture description into the typing prompt. Keep both pronunciations and your submission.",
  "flow",
  [
    o("copier", 9),
    action("The copier does not respond."),
    mark(o("copier", 13)),
    o("copier", 14),
    mark(o("copier", 15)),
    action("You say the word. The copier runs."),
    o("copier", 21),
  ],
  [
    o("copier", 9),
    action("The copier does not respond."),
    o("copier", 14),
    mark({
      speaker: null,
      kind: "prompt",
      text: "Mori rolls his hands like an engine turning. Try saying it to the copier.",
      options: ["Type ugoite"],
    }),
    action("You say the word. The copier runs."),
    o("copier", 21),
  ],
  "office.md O6; copier[13,15]",
);
O(
  "o07",
  "Tell Mio the copier is fixed",
  "Merge her reply and move into lunch. Keep her echo of “asked it nicely” and the connection to the train doors.",
  "merge",
  [
    o("ticket_done", 1),
    o("ticket_done", 2),
    o("ticket_done", 3),
    mark(o("ticket_done", 5)),
    mark(o("ticket_done", 6)),
    o("lunch_start", 2),
    o("lunch_start", 4),
  ],
  [
    o("ticket_done", 1),
    o("ticket_done", 2),
    o("ticket_done", 3),
    mark(
      line(
        "...Asked it nicely. Like the doors this morning? Okay, I'll close it. It's lunch anyway.",
        "mio",
        "deadpan",
      ),
    ),
    o("lunch_start", 2),
    o("lunch_start", 4),
  ],
  "office.md O7; ticket_done[5,6]",
);
O(
  "o08",
  "Mio’s rack-alarm gesture",
  "At lunch with Mio, move the flat-palm description into the typing prompt. Both pronunciations and the result remain. Her warmer reply is shown here; her cooler reply also stays.",
  "flow",
  [
    o("mio_bond", 4),
    o("mio_bond", 6),
    mark(o("mio_bond", 7)),
    o("mio_bond", 8),
    mark(o("mio_bond", 9)),
    action("You say the word. The rack alarm stops."),
    frame(office.nodes.mio_bond[12].then[0]),
  ],
  [
    o("mio_bond", 4),
    o("mio_bond", 6),
    o("mio_bond", 8),
    mark({
      speaker: null,
      kind: "prompt",
      text: "Mio holds a flat palm over the rack alarm. Try saying it to the rack.",
      options: ["Type tomatte"],
    }),
    action("You say the word. The rack alarm stops."),
    frame(office.nodes.mio_bond[12].then[0]),
  ],
  "office.md O8; mio_bond[7,9]; warm response shown; cool response retained",
);
O(
  "o09",
  "Mori’s pouring gesture",
  "At lunch with Mori, move his pouring mime into the typing prompt. Keep the seven cups and his response to them.",
  "flow",
  [
    o("mori_cups", 0),
    o("mori_bond", 3),
    action("The pot does not respond."),
    mark(o("mori_bond", 6)),
    o("mori_bond", 7),
    mark(o("mori_bond", 8)),
    o("mori_bond", 11),
    o("mori_bond", 13),
  ],
  [
    o("mori_cups", 0),
    o("mori_bond", 3),
    action("The pot does not respond."),
    o("mori_bond", 7),
    mark({
      speaker: null,
      kind: "prompt",
      text: "Mori mimes pouring tea into his cup. Try saying it to the pot.",
      options: ["Type irete"],
    }),
    o("mori_bond", 11),
    o("mori_bond", 13),
  ],
  "office.md O9; mori_bond[6,8]",
);
O(
  "o10",
  "Mio’s evening opening",
  "Merge her goodbye and the way she addresses you. She still uses your name if you ate together.",
  "merge",
  [
    action("If you had lunch with Mio:"),
    mark(o("ending", 2)),
    mark(frame(office.nodes.ending[4].then[0])),
    o("ending", 5),
    action("Or, if you had lunch with Mori:"),
    mark(o("ending", 2)),
    mark(frame(office.nodes.ending[4].else[0])),
    o("ending", 5),
  ],
  [
    action("If you had lunch with Mio:"),
    mark(line("Okay, I'm going home. Um... Eric?", "mio", "neutral")),
    o("ending", 5),
    action("Or, if you had lunch with Mori:"),
    mark(line("Okay, I'm going home. Hey, {gaijin}.", "mio", "neutral")),
    o("ending", 5),
  ],
  "office.md O10; ending[2,3,4]",
);
O(
  "o11",
  "The sensor excuse, again",
  "Remove Mio’s repeated instruction after the new request card. Keep the card and both goodbyes.",
  "remove",
  [
    o("end_ticket", 3),
    o("end_ticket", 4),
    o("end_ticket", 7),
    mark(o("end_ticket", 8)),
    action("If Mio warmed to you:"),
    frame(office.nodes.end_ticket[9].then[0]),
    action("Otherwise:"),
    frame(office.nodes.end_ticket[9].else[0]),
  ],
  [
    o("end_ticket", 3),
    o("end_ticket", 4),
    o("end_ticket", 7),
    action("If Mio warmed to you:"),
    frame(office.nodes.end_ticket[9].then[0]),
    action("Otherwise:"),
    frame(office.nodes.end_ticket[9].else[0]),
  ],
  "office.md O11; end_ticket[8]",
);

// Review-only reading aids; the source dialogue stays unchanged.
const translations = {
  "カードを、どうぞ。": [
    "Kādo o, dōzo.",
    "Your card, please."
  ],
  "はい、{yoroshiku}。": [
    "Hai, yoroshiku onegaishimasu.",
    "Yes, nice to meet you."
  ],
  "{ohayo}。カードを、どうぞ。": [
    "Ohayō gozaimasu. Kādo o, dōzo.",
    "Good morning. Your card, please."
  ],
  "はい、{yoroshiku}。カードを、どうぞ。": [
    "Hai, yoroshiku onegaishimasu. Kādo o, dōzo.",
    "Yes, nice to meet you. Your card, please."
  ],
  "カードを確認できません。係員にお声がけください。": [
    "Kādo o kakunin dekimasen. Kakariin ni okoegake kudasai.",
    "Unable to verify your card. Please speak to a member of staff."
  ],
  "新しいカードですね。申し訳ありません、登録は九時からです。": [
    "Atarashii kādo desu ne. Mōshiwake arimasen, tōroku wa kuji kara desu.",
    "It's a new card, I see. I'm sorry; registration starts at nine."
  ],
  "あちらで、お待ちください。": [
    "Achira de, omachi kudasai.",
    "Please wait over there."
  ],
  "{sumimasen}、{sumimasen}、通ります！": [
    "Sumimasen, sumimasen, tōrimasu!",
    "Excuse me, excuse me, coming through!"
  ],
  "共連れを検知しました！": [
    "Tomozure o kenchi shimashita!",
    "Tailgating detected!"
  ],
  "お願い、{akete}…いい子だから…": [
    "Onegai, akete… ii ko dakara…",
    "Please, open… be good, won't you…"
  ],
  "はい、アマカワ{honsha}、正面ゲートです。…はい。待ちます。": [
    "Hai, Amakawa honsha, shōmen gēto desu. …Hai. Machimasu.",
    "Yes, Amakawa head office, main gate. …Yes. I'll wait."
  ],
  "あ…すみません、ゲートが…": [
    "A… sumimasen, gēto ga…",
    "Ah… excuse me, the gate…"
  ],
  "Say 開けて (akete, open) with him": [
    "Akete.",
    "Open."
  ],
  "え？今の…？": [
    "E? Ima no…?",
    "Huh? What was that just now…?"
  ],
  "…あ、もしもし。いえ…開きました。": [
    "…A, moshi moshi. Ie… akimashita.",
    "…Ah, hello. No… it opened."
  ],
  "はい？": [
    "Hai?",
    "Yes?"
  ],
  "はい、わかってます。二人だと思ってるんです。": [
    "Hai, wakattemasu. Futari da to omotterun desu.",
    "Yes, I know. It thinks there are two people."
  ],
  "浜田さん！かばん、頭の上！": [
    "Hamada-san! Kaban, atama no ue!",
    "Mr. Hamada! Your bag, above your head!"
  ],
  "…無理ですね。": [
    "…Muri desu ne.",
    "…That won't work, will it."
  ],
  "ははっ。": [
    "Haha.",
    "Ha ha."
  ],
  "ありがとうございます！本当に、{sumimasen}…": [
    "Arigatō gozaimasu! Hontō ni, sumimasen…",
    "Thank you! I'm really sorry…"
  ],
  "どうぞ、どうぞ。": [
    "Dōzo, dōzo.",
    "Go ahead, go ahead."
  ],
  "猫はいません。": [
    "Neko wa imasen.",
    "There is no cat."
  ],
  "十時の会議、四番目の議題見た？": [
    "Jūji no kaigi, yonbanme no gidai mita?",
    "Did you see the fourth item on the agenda for the ten o'clock meeting?"
  ],
  "B2のやつでしょ。コンサルタントが来るって。": [
    "Bī tsū no yatsu desho. Konsarutanto ga kuru tte.",
    "The B2 thing, right? I hear a consultant's coming."
  ],
  "え、今日から？": [
    "E, kyō kara?",
    "Huh, starting today?"
  ],
  "{ohayo}。森と申します。ITサポートへ、ようこそ。": [
    "Ohayō gozaimasu. Mori to mōshimasu. Ai tī sapōto e, yōkoso.",
    "Good morning. My name is Mori. Welcome to IT support."
  ],
  "こちらこそ、{yoroshiku}。": [
    "Kochira koso, yoroshiku onegaishimasu.",
    "Likewise, nice to meet you."
  ],
  "あ！新しい人！": [
    "A! Atarashii hito!",
    "Ah! The new person!"
  ],
  "…三十年。": [
    "…Sanjūnen.",
    "…Thirty years."
  ]
};

const data = {
  translations,
  baseline: {
    commit: "52144e90d7873882d8f3111451c364bed9a41e7b",
    sha256: hashes,
  },
  note: "Each comparison shows one proposed change against the original scene. Other proposals remain unchanged in its context. Action frames describe controls or staging; dialogue and narration reproduce the story. Route alternatives are labelled. No story changes are applied by this review.",
  sections: [
    { id: "gate", title: "Lobby gate", changes: gateChanges },
    { id: "lift", title: "Lift to B2", changes: liftChanges },
    { id: "office", title: "First day in B2", changes: officeChanges },
  ],
};
for (const section of data.sections) for (const change of section.changes) {
  for (const frame of [...change.before, ...change.after]) {
    const texts = [frame.text, ...(frame.options || []).map(o => typeof o === "string" ? o : o.text)];
    for (const text of texts) if (/[ぁ-ヿ㐀-鿿]/u.test(text) && !translations[text]) {
      throw new Error(`Missing review reading/translation: ${text}`);
    }
  }
}
writeFileSync(
  new URL("frames.json", import.meta.url),
  `${JSON.stringify(data, null, 2)}\n`,
);
console.log(
  data.sections.map((s) => `${s.id}: ${s.changes.length} decisions`).join("\n"),
);
