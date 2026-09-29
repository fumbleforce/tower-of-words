# Mio notices

Mio is there when the train doors stop for Eric, and she keeps count through the day. By the evening she lists what she's seen, word by word, and asks him how he does it. Then the station's repair request about the doors lands on B2, and she puts it on his list. Built for day 1. What happens at the station the next morning isn't decided.

## Cast

`mio`, `eric`, `ann`, `kuroda`

## Beats

1. On the platform, after 待って held the doors ([`sleeping-man`](sleeping-man.md)): "...Doors don't do that. They stop for a bag or something, but yelling does nothing, I've tried like a hundred times." Eric can ask "Did I do that?" ("I don't know. I said it too and nothing happened") or say nothing. She asks him not to tell anyone: if somebody reports it broken, it goes on her list.
2. Her phone buzzes. After a short buzz beat (600 ms), she looks at it and continues without another tap on her: a server is down again. His card won't work until nine, so talk to the guard, and おはようございます first. She runs. (Warmer if she's warmed to him: "see you downstairs"; otherwise "Bye, 外人".) Talking to her again: "Sorry, I really have to go!"
3. On B2, if he opens the machine room door with 開けて: "...That door has a card reader, you know." ([`b2-welcome`](b2-welcome.md))
4. When he closes the copier request: "Asked it nicely. Like the doors, this morning?" ([`copier`](copier.md)) At lunch in the machine room she tells him she told the station it was the sensor ([`lunch`](lunch.md)).
5. 18:05, after Emi has gone. Mio comes to his desk: she's going home. "Um. Eric." if they had lunch, otherwise "Hey, 外人." She lists it: 待って and the doors; Mori's 動いて for thirty years, and today it works for Eric; if the gate burst open, "everybody upstairs is talking about the lobby gate"; the rack and 止まって ("that one is my fault") if they ate together; or Mori's seven clean cups if he ate with Mori. "How are you doing that?" Eric: "I don't know" ("...Yeah. Me neither."), "I asked nicely" ("Mm. Very funny."), or nothing.
6. Her phone: the station sent a repair request about the doors. She told them it's the sensor, so now they want B2 to check the sensor. It was supposed to go on her list; she puts it on his. "REPAIR REQUEST #2. Train doors, Honsha station. Assigned to: ERIC." "You're the IT guy. You tell them it's the sensor." If they're closer she'll come along tomorrow morning ("I want to see how you, um... fix a sensor"); otherwise "Don't sleep through it, 外人." She leaves, the game saves, and the day ends.

## Choices and flags

The choices here change only her answers. What she lists depends on flags from the other storylines.

| Flag | Set when | Read by |
|---|---|---|
| `held_doors` | The doors held | |
| `phone_buzz` | Her phone buzzed on the platform | Her goodbye |
| `can_exit` | She's leaving | Leaving the station |
| `gate_magic` | The gate burst open ([`sleeping-man`](sleeping-man.md)) | Her list |
| `lunch_mio`, `lunch_mori` | The lunch choice | Her list, her last line |
| `mio_warm` | ([`mio-train`](mio-train.md)) | Her goodbye, her last line |

## Words taught

None.

## Nodes

| File | Nodes |
|---|---|
| `train.js` | `platform`, `did_i`, `did_quiet`, `mio_tests`, `mio_phone`, `mio_after` |
| `office.js` | `akete_machine`, `ticket_done`, `mio_doors`, `ending`, `end_dunno`, `end_nicely`, `end_quiet`, `end_ticket` |
