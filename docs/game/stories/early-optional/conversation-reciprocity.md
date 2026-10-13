# Being asked back

These extensions use Mio and Emi's ordinary conversation menus and their existing camera staging. They add no biography, new outing, repair, relationship milestone or reward.

## Cast

`mio`, `emi`, `eric`

## Beats

Mio's established conversation about her mother's food now turns back to the player: how is life here after work? The player can ask for quiet, time to get started, or ordinary conversation, or defer without choosing a feeling. Choosing time to get started immediately opens a reply menu and leaves it waiting for input. A later visit recalls the answer. The player can revise it or just say hello. Existing saves that already heard the mother topic can reach the check-in through the normal menu.

The follow-up about her mother's advice requires both learned `yasumi` and the completed understanding of the earlier Japanese remark. Another question about her mother is available without vocabulary. This keeps the earlier language discovery intact.

Emi's work topic asks whether the player needs help understanding requests or wants to bring checked results. Later she asks whether that arrangement is working, with a direct option to keep it. The player can voice a worry about appearing unable to do the job, ask to be heard before receiving advice, or simply say hello. Emi responds to that boundary at the next hello and when the same worry is raised again. On the repeat worry she asks whether the player wants her answer; declining it completes the conversation without advice. Asking how she herself is doing gets a personal answer that distinguishes whether the club conversation happened. It never claims a club meeting or repair was completed.

## Choices and flags

| Flag | Set when | Read by |
|---|---|---|
| `chat_mio_checkin_offered` | Mio asks how the player is settling in | First and repeat check-in entries |
| `chat_mio_evenings` | Player chooses `quiet`, `try` or `english` | Later check-in; a first deferred answer has its own neutral entry, and a deferred revision preserves the previous answer |
| `chat_emi_work_talked` | Player chooses how to handle requests | Changes the ordinary work topic to the follow-up |
| `chat_emi_work_help` | Player chooses `results` or `request` | Emi's next work-topic opener |
| `chat_emi_ask_first` | Player asks to be heard before advice | Emi's repeated worry and next no-work hello |

`settling_in`, `work_agreement` and `ask_first` are historical People memories. Their wording remains true if a later answer changes. No conversational preference changes the broader ticket system or promises altered scheduling. Existing busy-morning limits and personal-topic knowledge requirements still apply. Both first and repeat work conversations with Emi require day 3 or later.

## Words taught

No new words. The existing optional `mouichido` lesson remains at `chat_emi_repeat_word`, reached only when requested. New replies reuse already-known `yasumi` and `daijoubu`. No `en` subtitle fields are added; Mio and Emi retain their established English voices.

## Nodes

| File | Nodes |
|---|---|
| `conversations/mio.js` | `chat_mio_settling`, `chat_mio_settling_choice`, `chat_mio_quiet_evening`, `chat_mio_try_evening`, `chat_mio_wait_for_me`, `chat_mio_english_fine`, `chat_mio_not_sure`, `chat_mio_settling_memory`, `chat_mio_settling_again`, `chat_mio_return_questions`, `chat_mio_her_break`, `chat_mio_mother_asks`, `chat_mio_short_hello` |
| `conversations/emi.js` | `chat_emi_work_choice`, `chat_emi_team_again`, `chat_emi_still_agree`, `chat_emi_worry`, `chat_emi_worry_listen`, `chat_emi_worry_answer`, `chat_emi_ask_first`, `chat_emi_heard`, `chat_emi_unsure`, `chat_emi_hello`, `chat_emi_herself` |
