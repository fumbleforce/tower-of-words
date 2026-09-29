# A drink for someone

The afternoon's small social move: buy a drink at the B2 vending machine and give it to someone. The machine sticks on the first coin until Eric says 動いて to it. Each person takes each drink their own way ([cast.md](../cast.md), What they like). Built.

## Cast

`eric`, `mio`, `mori`, `kenji`

## Beats

1. After lunch Mio mentions that Mori drinks corn soup, from a can, every afternoon. A hint says to buy a drink by the lift and press Give next to someone ([systems.md](../systems.md), Gifts).
2. The first coin goes in and nothing comes out; a side goal says the machine is stuck, and it takes no new order. 動いて shakes the drink loose (Eric: "Thanks."). After that it works normally.
3. Giving:
   - Mio and a black coffee: "Oh, black. Nice, thank you." She drinks half without looking away from her screen. Anything else is "a bit sweet for me".
   - Mori and corn soup: ちょうど飲みたかった, and later a cup of tea turns up next to Eric's keyboard. Anything else he puts on his desk, square to the edge, and leaves.
   - Kenji and melon soda: マジで？神！ "Now I owe you, I fix anything for you. Well... I try." Anything else he doesn't open.
4. A second drink for the same person: "They've already had one from you." It stays in the Bag.

## Choices and flags

The drink (coffee, royal milk tea, melon soda, corn soup, or nothing) and who gets it.

| Flag | Set when | Read by |
|---|---|---|
| `vend_tried` | The first coin went in | The stuck machine |
| `vend_stuck` | The machine is stuck | 動いて, its goal |
| `vend_want` | Which drink was paid for (1 to 4) | What 動いて drops |
| `gifted_mio`, `gifted_mori`, `gifted_kenji` | Gave that person a drink | The refusal |

## Words taught

None.

## Nodes

| File | Nodes |
|---|---|
| `office.js` | `vending`, `buy_coffee`, `buy_tea`, `buy_melon`, `buy_cornsoup`, `vend_stuck`, `vend_ugoite`, `vend_ugoite_idle`, `vend_still_stuck`, `gift_mio_coffee`, `gift_mio_other`, `gift_mori_cornsoup`, `gift_mori_other`, `gift_kenji_melon`, `gift_kenji_other`, `gift_again` |
