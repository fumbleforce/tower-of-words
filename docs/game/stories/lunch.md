# Lunch

Day 1's one real choice of who to spend time with: lunch with Mio in the machine room, or with Mori in the kitchenette. Each teaches a word, and each echoes once in the afternoon. Built.

## Cast

`mio`, `mori`, `kenji`, `eric`

## Beats

1. 12:10. Mori goes to the kitchenette table. Mio: "I usually eat in the machine room. It's quiet, and nobody talks to me there." Who does Eric eat with?
2. With Mio, on the floor of the machine room ("it's warm from the servers"), the only real English conversation of the day. He can ask why B2 (upstairs you bow all day; these machines are from the nineties and die if she doesn't watch them; now they pay him to babysit them with her), ask about the doors (she told the station it was the sensor; "It's probably the sensor"), or eat and say nothing (after a while she pushes the pickles toward him). Then a rack alarm goes off. She wants to see something: 止まって, it means stop. The typing prompt describes her flat palm over the rack and asks Eric to try the word on it. Eric types it and the alarm stops. If she's warmed to him: "You can eat here tomorrow also, if you want."
3. With Mori, at the kitchenette table. He went to Lillehammer in 1994 and does the ski jump with his hand. Eric can mime the landing (three small claps, and they both laugh) or pour Mori's tea first. There are seven cups on the tray, three of them dusty. Mori says 入れて to the pot, and nothing. The typing prompt describes his pouring mime and asks Eric to try the word on the pot. Eric types it: the pot fills his cup, then Eric's, then all seven. Mori looks at them for a while, then starts washing a dusty one.
4. 14:00. Lunch is packed away. If Eric helped Hamada the guard's way, the crackers come ([`sleeping-man`](sleeping-man.md)). If the gate burst open, Kenji has heard: 朝、ゲートが勝手に開いたって, and he looks at Eric. Mio mentions Mori's corn soup, which starts [`vending-gift`](vending-gift.md). Goal: get someone a drink, or get back to work at the desk ([`emi-budget`](emi-budget.md)).
5. The echo, once, in the afternoon: after lunch with Mio, her phone alarm won't stop for her 止まって ("Only for you, I guess"); after lunch with Mori, he whispers 入れて to his own cup, and nothing (やっぱり、だめですね).

## Choices and flags

- Who to eat with. The choice decides the word taught, the echo, bond points (3 for the person) and part of Mio's evening ([`mio-notices`](mio-notices.md)).
- With Mio: why B2, the doors, or quiet (quiet raises `mio_warm`). With Mori: the landing or pouring his tea.

| Flag | Set when | Read by |
|---|---|---|
| `lunch_on` | Lunch started | |
| `lunch_mio` | Ate with Mio | The echo, the evening, her last line |
| `lunch_mori` | Ate with Mori | The echo, the evening |
| `mio_bond_done` | The rack scene played | |
| `mori_bond_done` | The seven cups scene played | |
| `afternoon_on` | 14:00 | The echoes, the desk, Mio's busy line |
| `mio_echo`, `mori_echo` | The echo played | |

## Words taught

| Word | By | Node |
|---|---|---|
| `tomatte` | `mio` | `mio_bond` |
| `irete` | `mori` | `mori_bond` |

## Nodes

| File | Nodes |
|---|---|
| `office.js` | `lunch_start`, `lunch_mio`, `mio_b2`, `mio_doors`, `mio_quiet`, `mio_lunch_end`, `mio_bond`, `lunch_mori`, `mori_landing`, `mori_pour`, `mori_cups`, `mori_bond`, `lunch_end`, `mio_tomatte_echo`, `mori_irete_echo` |
