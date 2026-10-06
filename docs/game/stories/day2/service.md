# The station report

The station job compares an ordinary passing door test with the effect of the player's spoken words. The report then determines whether Emi orders a sensor. T-0002 remains open until the station confirms it on day 3.

## Taking and testing the request

Mio asks the player to take T-0002 at the start of the day. The ticket app shows the actual request before acceptance. The player can get ready first and accept at the room computer; arriving at the requested job also begins it. Both computers share the same list and read state. T-0001 records the completed day-1 copier repair and pays once; reading or returning never pays again.

At the empty stationary carriage, Mio joins when `lunch_mio || mio_warm >= 2`; otherwise she helps by phone. The ordinary sensor test passes. She models “once more”; the player types it and runs a second ordinary test. The player then speaks the already-learned matte and ugoite with the doorway empty. The motor holds the doors open until released. This experiment happens before either report choice.

The player can report the passing sensor or keep Mio's earlier sensor explanation. Both choices explicitly send a report. Mio responds in person or by message; the warm branch walks her back to work. She models “okay” for the guard's question about the doors, and the player types it. At the gate, the learned word is a direct dialogue reply. Emi later reads the report and either orders the replacement or keeps the budget. No bond penalty or hidden correct-answer reward is attached.

## Work and conversations

Emi asks what the player can maintain and accepts a cautious answer. Kenji invites the whole department to the izakaya; Emi joins after her meeting. At the desk, the player can browse requests without advancing time. Mori's old copier request reveals why an apparently stale queue matters: removing jammed paper never solved the underlying fault. Choosing to review the requests with him spends the afternoon; getting up preserves it. The computer remains usable after work.

Mio has separate work and weekend topics, including a lunch-history-sensitive pickles callback. After both topics she needs to finish her work. Kuro has work and day-off topics at reception, direct known-word replies, and an invitation to swim tomorrow after six on both experienced and beginner branches. Her personal name still belongs to the day-3 introduction.

## State

`d2_ticket_taken` records accepting the request. `d2_checked` prevents repeated initial tests. `d2_voice_tested` records the experiment; `d2_mio_saw_test` separately records whether Mio witnessed it. `d2_order_sensor` selects the report, and `d2_ticket_done` means report submitted, not repair paid. `d2_brief_done` opens the afternoon review; `d2_shift_done` advances to evening. Kuro's work/weekend/greeting flags and Mio's two topic flags prevent repeated social introductions and support later callbacks.

## Words taught

| Word | By | Node |
|---|---|---|
| `mouichido` | `mio` | `d2_check` |
| `daijoubu` | `mio` | `d2_submit` |
| `yasumi` | `kuro` | `d2_kuro_work` |

Mouichido and daijoubu are part of the station route. Yasumi is learned through the optional reception conversation. Pronunciation models and typed attempts use the chosen protagonist's clips. Japanese speech remains blurred except for known words, names and loanwords; there are no English replacement subtitles.

## Nodes

| File | Nodes |
|---|---|
| `day2/train.js` | `d2_platform`, `d2_check`, `d2_report`, `d2_voice_test`, `d2_order_sensor`, `d2_keep_sensor`, `d2_submit`, `d2_checked_again`, `d2_mio_before`, `d2_mio_after`, `d2_mio_idle`, `d2_to_gate`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/gate.js` | `d2_gate`, `d2_guard_report`, `d2_guard_ok`, `d2_guard_sent`, `d2_guard`, `d2_guard_idle`, `d2_reader`, `d2_cat`, `d2_guard_food`, `d2_guard_drink`, `d2_cat_food`, `d2_cat_drink`, `d2_to_platform`, `d2_to_forecourt`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/forecourt.js` | `d2_to_shotengai`, `d2_kuro_talk`, `d2_kuro_topics`, `d2_kuro_greet`, `d2_kuro_work`, `d2_kuro_weekend`, `d2_kuro_swimmer`, `d2_kuro_beginner`, `d2_kuro_ok`, `d2_kuro_end`, `d2_arrive`, `d2_to_station`, `d2_to_office`, `d2_to_plaza`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
| `day2/office.js` | `d2_office`, `d2_brief`, `d2_assess`, `d2_limits`, `d2_invitation`, `d2_work`, `d2_leave_desk`, `d2_notes`, `d2_review_requests`, `d2_emi_waiting`, `d2_emi_later`, `d2_desk_wait`, `d2_desk_later`, `d2_mio_work`, `d2_mio_job`, `d2_mio_weekend`, `d2_mio_idle_work`, `d2_social_end`, `d2_mori_work`, `d2_kenji_work`, `d2_kenji_invite_again`, `d2_leave`, `d2_food_away`, `d2_see_away`, `d2_go_away`, `d2_drink_away` |
