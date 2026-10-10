# Good morning at the gate

The station security room before nine. Mr. Ishibashi, the guard, is strict about a proper おはようございます. Eric's new card won't work until nine, so he's sent to the bench to wait, which is where [`sleeping-man`](sleeping-man.md) catches up with him. Jørgen asked for the gate to be a real situation with friction and life, not badge-and-walk (2026-09-28). Built.

## Cast

`guard`, `commuter`, `gatev`, `eric`, `worker_a`, `worker_b`, `commuter_1`, `commuter_2`, `commuter_3`

## Beats

1. Eric comes in through the glass doors. The guard says おはようございます to people coming in for work, and they say it back, so Eric sees how it's done. Goal: say good morning to the guard in Japanese, with a hint under it that stays until he has: press Q by him on desktop, tap him and Say a word on the phone. Until then Interact (E, a click or tap) on the guard opens the Say menu, and he has no Chat (Jørgen, 2026-10-10: "really need that Q. indicator, and specify that you say good morning in Japanese. Maybe even remove the E option form him, and remove the chat option also", #394).
2. おはようございます (or よろしくおねがいします, which amuses him) gets a greeting and card request in one line, a bow back, and a point toward the card reader.
3. The card is red. The gate's voice asks him to see staff. The guard beckons him over: it's a new card, registration starts at nine (politely, with an apology, if Eric greeted him first; sternly if not). He holds up nine fingers and points at the bench. Eric: "Right, Mio did say nine." Eric waits on the bench, and the jam starts.
4. Once through, the station exit. Eric crosses the forecourt to the separate head-office lift ([places.md](../places.md), Getting between places).

The two stationary office workers answer optional Talk with a greeting or a brief apology. The three commuters can answer only while stopped by the jam; they glance at the gate and comment that it is still blocked. Their replies teach no words and change no story flags.

## Choices and flags

Skipping the greeting doesn't block anything; it changes the guard's tone and what he remembers.

| Flag | Set when | Read by |
|---|---|---|
| `greeted_guard` | Greeted him | His tone at the reader and in the mime |
| `guard_asked` | The card was red once | The reader, the guard |
| `gate_through` | Walked past the gate | The station exit |

## Words taught

None.

## Nodes

| File | Nodes |
|---|---|
| `forecourt.js` | `outside`, `head_office`, `to_b2` |
| `gate.js` | `lobby_in`, `guard_look`, `ohayo_guard`, `yoroshiku_guard`, `guard_points_reader`, `greet_again_guard`, `card_red`, `card_red_again`, `guard_again`, `bench`, `past_gate`, `to_lift`, `idle_worker_a`, `idle_worker_b`, `idle_commuter_1`, `idle_commuter_2`, `idle_commuter_3` |
