# Conversation reciprocity, 8 October 2026

Candidate for #344. Held on `wt/codex-conversation-reciprocity`; not released. The parent coordinates Claude's required cold read and subsequent voice work. Research #317, Kenji's outing #339 and proposed histories #327 remain untouched.

## Source and diagnosis

GUIDE Writing, `game3d/story/VOICE.md`, `FORMAT.md`, the Mio/Emi cast entries, Emi's budget storyline and the existing conversation files are the sources. Applied dialogue, story-sense, humanizer, cliche-transcendence and interactive-fiction diagnostic skills; `.claude/agents/story-reader.md` supplies the cold-read checklist. RPG-scenes confirms that ordinary spoken exchanges need no invented physical performance or descriptive narration.

The existing topics mostly ask an NPC for information and close. Several choices fold to the same repeat line. This is dialogue's single-function problem and interactive-fiction's weak consequence problem. The needed consequence here is someone remembering how the player asked to be treated.

Default versions considered: the helpful coworker explains life; a tired woman admits a hidden tragedy; the player fixes everybody's boundaries; an instant intimate confession rewards a correct answer; a promise unlocks an off-screen date; every NPC becomes a language tutor. These versions would introduce unsupported history or treat characters as services. The retained conflict comes from how two coworkers respond differently to being asked for help.

## Two separate approaches

Both drafts below were made by this writer, not by independent teams. The parent supplied the independent cold read afterward.

Approach A started from a work handover, with the player's preference affecting how a later report was discussed:

> Emi: Tell me what you've checked, even if it still isn't working.
> Player: I need to understand the request first.
> Emi: Bring it over. We can work out what they're asking for before you start.
> On return, Emi asks whether this is another request to go over.

Mio's matching thread began with an offer to practise Japanese. This was too close to turning both women into support menus, and a promised practical demonstration would require engine work and fresh staging. GUIDE checks: no unshown handover, no unsolicited ticket, no reward for picking a compliant answer.

Approach B started from the existing mother's-food conversation:

> Mio: How about you? After work, I mean. Is it okay here?
> Player: I like having some time to myself.
> Mio: Mm. You spend all day trying to understand everybody. I wouldn't want to do that in English.
> On return, she asks whether today is for company or a quick hello.

Emi's matching thread turned a work question into an awkward attempt to ask how she herself is doing. This creates reciprocity but needs a prior choice to remember. GUIDE checks: player chooses their own feeling; no new family fact or instant romantic confession; no narration of visible actions.

The merged candidate keeps A's durable preference and B's reciprocal question. Both characters have neutral exits, revisable preferences and a later visible response. Neither scene grants bond points or claims a meeting occurred.

## Independent root cold read and revisions

The root reader found five issues in the initial branch:

1. The new mother-rest question bypassed the Japanese clue. It now requires `know_yasumi && chat_mio_break_understood`. The ordinary mother question gives no translation of that clue.
2. Emi's reciprocal question did not match her existing answer choices. She now asks whether her request is workable or help is needed first.
3. Mio and Emi appeared to promise behavior throughout the game. Mio now gives the player a reply turn immediately; Emi's boundary is specifically hearing them out before advice, with another choice after her apology and a changed next hello.
4. Once-only People memories could contradict a revised preference. The work memory now records the historical conversation, while the mutable flag controls the current response.
5. Older saves had heard the mother topic but could never enter the new check-in. `chat_mio_home` now also offers it; without `chat_mio_checkin_offered`, the entry asks the first question.

The author's subsequent read retained short, complete speech and removed universal promises. English remains appropriate to these two established speakers. Mio's original Japanese quote is unchanged. No new backstory from #327 enters canon.

## Validation

- `npm run check`: PASS across its full CPU check suite, including the new Runner tests, syntax, lint, choices, story, language, budgets, dependencies and facts. Existing language audit reports 14 warnings; facts report four pre-existing removal items.
- Eight dedicated Runner tests cover all preference values, neutral deferral, revision, old saves, actual restored conversation frames, historical memory wording, optional learning, callback knowledge conditions, Emi's boundary and later personal answer.
- Existing everyday conversation tests and word-choice rendering tests pass. The latter selected Leave by numeric position; it now chooses its exact label, preserving the same markup and knowledge assertions after a new topic is added.
- Story and facts checks pass separately. The facts checker does not recursively validate the early-optional documents; runtime Runner tests cover this candidate's new graph.
- Strict fast tests attempted at 390×844 and 1366×860. Both stop at the voice build gate with 40 missing new clips, before launching a browser. No warning/bypass environment setting was used. These are held authored lines, awaiting story review before generation.
- Browser presentation and public Continue are not yet verified. The restored-frame unit test exercises the real Runner with rendering/audio boundaries stubbed. It does not replace the release browser test.

## Complete branch text

The following transcript preserves every line, condition and choice in both candidate conversation files. It is generated from their exported data for cold reading; camera hooks are included where relevant.

### mio

#### chat_mio

```text
{"do":"sender","action":"available"}
IF place == 'office' && period_morning && (day == 1 || day == 2 || day == 5 || ongoing_workday)
  mio: Give me until lunch? I’m trying to finish this before somebody adds another request.
  IF sender_available
    CHOICE
      [sender_available && sender_complaint_heard && !sender_delivered] Did you get the log off that machine? -> sender_offer
      [sender_available && !sender_complaint_heard && !sender_delivered] What are you trying to catch? -> sender_offer
      [sender_available && sender_delivered && !sender_partial] What are you trying to catch? -> sender_later
      [sender_available && sender_partial] Ask about the held item. -> sender_later
      I’ll let you get on. -> chat_mio_leave
  {"end":true}
{"do":"face","who":"eric","to":"mio"}
{"do":"face","who":"mio","to":"eric"}
{"do":"cam","on":"mio","zoom":1.3,"conversation":"mio"}
CHOICE
  [sender_available && sender_complaint_heard && !sender_delivered] Did you get the log off that machine? -> sender_offer
  [sender_available && !sender_complaint_heard && !sender_delivered] What are you trying to catch? -> sender_offer
  [sender_available && sender_delivered && !sender_partial] What are you trying to catch? -> sender_later
  [sender_available && sender_partial] Ask about the held item. -> sender_later
  [!chat_mio_home] Do you go back to the mainland much? -> chat_mio_mainland
  [chat_mio_home] Does your mother still send food back with you? -> chat_mio_food_again
  Do you ever eat away from the servers? -> chat_mio_lunch
  [chat_mio_home || chat_mio_checkin_offered] About settling in here... -> chat_mio_settling_again
  I’ll let you get on. -> chat_mio_leave
```

#### chat_mio_understood

```text
{"do":"sender","action":"available"}
IF place == 'office' && period_morning && (day == 1 || day == 2 || day == 5 || ongoing_workday)
  mio: Give me until lunch? I’m trying to finish this before somebody adds another request.
  IF sender_available
    CHOICE
      [sender_available && sender_complaint_heard && !sender_delivered] Did you get the log off that machine? -> sender_offer
      [sender_available && !sender_complaint_heard && !sender_delivered] What are you trying to catch? -> sender_offer
      [sender_available && sender_delivered && !sender_partial] What are you trying to catch? -> sender_later
      [sender_available && sender_partial] Ask about the held item. -> sender_later
      I’ll let you get on. -> chat_mio_leave
  {"end":true}
{"do":"face","who":"eric","to":"mio"}
{"do":"face","who":"mio","to":"eric"}
{"do":"cam","on":"mio","zoom":1.3,"conversation":"mio"}
CHOICE
  [sender_available && sender_complaint_heard && !sender_delivered] Did you get the log off that machine? -> sender_offer
  [sender_available && !sender_complaint_heard && !sender_delivered] What are you trying to catch? -> sender_offer
  [sender_available && sender_delivered && !sender_partial] What are you trying to catch? -> sender_later
  [sender_available && sender_partial] Ask about the held item. -> sender_later
  [!chat_mio_home] Do you go back to the mainland much? -> chat_mio_mainland
  [chat_mio_home] Does your mother still send food back with you? -> chat_mio_food_again
  Do you ever eat away from the servers? -> chat_mio_lunch
  [!chat_mio_break_understood] {yasumi}… Was your mother telling you to take a break? -> chat_mio_break
  [chat_mio_break_understood] Does your mother still ask about your weekends? -> chat_mio_break_again
  [chat_mio_home || chat_mio_checkin_offered] About settling in here... -> chat_mio_settling_again
  I’ll let you get on. -> chat_mio_leave
```

#### chat_mio_mainland

```text
eric: Do you go back to the mainland much?
mio: Sometimes I stay with my mother. Then she sends me back with enough food for everybody.
CHOICE
  That sounds nice. -> chat_mio_home_nice
  Does she think you can’t feed yourself here? -> chat_mio_home_shops
```

#### chat_mio_home_nice

```text
mio: It is. I still have to carry it all on the train, though.
{"go":"chat_mio_home_quote"}
```

#### chat_mio_home_shops

```text
mio: I told her there are shops here. She asked what I actually buy.
{"go":"chat_mio_home_quote"}
```

#### chat_mio_home_quote

```text
mio: Then, when I leave, I get the same thing every time.
mio [Japanese, unknown words blurred]: 休みの日ぐらい、仕事を忘れなさい。
mio: She has opinions about my weekends, also.
{"set":"chat_mio_home"}
{"go":"chat_mio_settling"}
```

#### chat_mio_settling

```text
mio: How about you? After work, I mean. Is it okay here?
{"set":"chat_mio_checkin_offered"}
{"go":"chat_mio_settling_choice"}
```

#### chat_mio_settling_choice

```text
CHOICE
  I like having some time to myself. -> chat_mio_quiet_evening
  I’d like to talk more. I keep losing the words. -> chat_mio_try_evening
  I’m still working that out. -> chat_mio_not_sure
```

#### chat_mio_quiet_evening

```text
eric: I like having some time to myself.
mio: Mm. You spend all day trying to understand everybody. I wouldn’t want to do that in English.
mio: We can leave it there if you like. I only wanted to ask.
{"set":{"chat_mio_evenings":"quiet"}}
{"go":"chat_mio_settling_memory"}
```

#### chat_mio_try_evening

```text
eric: I’d like to talk more. I keep losing the words.
mio: Oh. I keep answering in English because it’s faster. You can tell me to wait, you know.
CHOICE
  Give me a moment before you help. -> chat_mio_wait_for_me
  English is fine. I just wanted to say it. -> chat_mio_english_fine
```

#### chat_mio_wait_for_me

```text
mio: Okay. Go on, then.
{"set":{"chat_mio_evenings":"try"}}
{"do":"remember","who":"mio","id":"settling_in","text":"Asked how life here felt after work, and listened to what you wanted."}
{"go":"chat_mio_return_questions"}
```

#### chat_mio_english_fine

```text
mio: Okay. We can just talk, then.
{"set":{"chat_mio_evenings":"english"}}
{"go":"chat_mio_settling_memory"}
```

#### chat_mio_not_sure

```text
mio: Fair enough. You don’t have to give me an answer now.
{"go":"chat_mio_leave"}
```

#### chat_mio_settling_memory

```text
{"do":"remember","who":"mio","id":"settling_in","text":"Asked how life here felt after work, and listened to what you wanted."}
{"go":"chat_mio_leave"}
```

#### chat_mio_settling_again

```text
IF !chat_mio_checkin_offered
  {"go":"chat_mio_settling"}
IF chat_mio_evenings == 'quiet'
  mio: You said you liked some time to yourself. Do you want company today, or just a quick hello?
ELSE
  IF chat_mio_evenings == 'try'
    mio: You wanted a moment to find the words. Okay, I’m listening.
  ELSE
    IF chat_mio_evenings == 'english'
      mio: We can use English. What did you want to talk about?
    ELSE
      mio: Have you figured out what you want to do after work?
{"go":"chat_mio_return_questions"}
```

#### chat_mio_return_questions

```text
CHOICE
  [know_yasumi && chat_mio_break_understood] {yasumi}… Does your mother take her own advice? -> chat_mio_her_break
  Does your mother ask how you’re doing? -> chat_mio_mother_asks
  I feel differently about it now. -> chat_mio_settling_choice
  Just saying hello today. -> chat_mio_short_hello
```

#### chat_mio_her_break

```text
IF know_yasumi
  eric: {yasumi}… Does your mother take her own advice?
ELSE
  eric: Does your mother take her own advice about resting?
mio: She’s packing food while she tells me. I’ve tried pointing that out.
mio: Then she asks if I don’t want it. So I take the food.
{"go":"chat_mio_leave"}
```

#### chat_mio_mother_asks

```text
eric: Does your mother ask how you’re doing?
mio: Yes, and I say it’s fine. Then she asks what I’ve eaten, and I have to give an actual answer.
{"go":"chat_mio_leave"}
```

#### chat_mio_short_hello

```text
mio: Hi, then. See you around.
{"go":"chat_mio_leave"}
```

#### chat_mio_food_again

```text
eric: Does your mother still send food back with you?
mio: Yes. I have to take the empty containers back before she runs out.
{"go":"chat_mio_leave"}
```

#### chat_mio_lunch

```text
eric: Do you ever eat away from the servers?
IF ms3_mio
  mio: More than I used to. The bench by the water is quite good, when it’s not windy.
ELSE
  mio: I mean to. Then I come down to check one thing, and I’ve brought my lunch with me anyway.
CHOICE
  [know_nomitai] {nomitai}. I was going to get a drink. -> chat_mio_drink
  I’ll try the water when I want a quiet lunch. -> chat_mio_quiet
  I’ll leave you to it. -> chat_mio_leave
```

#### chat_mio_drink

```text
eric: {nomitai}. I was going to get a drink.
mio: Go while you’ve got time. I start making tea here and find something else to do before I drink it.
{"go":"chat_mio_leave"}
```

#### chat_mio_quiet

```text
mio: Mm. You can hear the trains from there, but you don’t have to be on one.
{"go":"chat_mio_leave"}
```

#### chat_mio_break

```text
eric: {yasumi}… Was she telling you to take a break?
mio: Yes. Or at least forget about work on my days off. You got that part?
IF ms3_mio
  mio: I did tell her I’d been out. Then she wanted to know who with.
ELSE
  mio: She asks why I come back to B2 when I’m not even supposed to be working.
CHOICE
  I know a few words now. I still have to guess. -> chat_mio_guess
  She might have a point. -> chat_mio_mother_right
```

#### chat_mio_guess

```text
mio: That was a good guess. Just ask if you’re not sure, okay?
{"go":"chat_mio_break_memory"}
```

#### chat_mio_mother_right

```text
mio: I know. She can tell when I’m checking something while we talk.
{"go":"chat_mio_break_memory"}
```

#### chat_mio_break_again

```text
mio: Yes. It’s usually the first thing she asks when I call.
{"go":"chat_mio_leave"}
```

#### chat_mio_break_memory

```text
{"do":"remember","who":"mio","id":"mother_weekends","text":"Her mother asks her to forget about work on her days off."}
{"set":"chat_mio_break_understood"}
{"go":"chat_mio_leave"}
```

#### chat_mio_leave

```text
{"do":"cam","back":true}
{"do":"save"}
```

### emi

#### chat_emi

```text
IF place == 'office' && period_morning && (day == 1 || day == 2 || day == 5 || ongoing_workday)
  emi: Can we catch up later? I need to get these requests upstairs before the meeting starts.
  {"end":true}
{"do":"face","who":"eric","to":"emi"}
{"do":"face","who":"emi","to":"eric"}
{"do":"cam","on":"emi","zoom":1.3,"conversation":"emi"}
CHOICE
  [!chat_emi_club_known] What made you join the swimming club? -> chat_emi_club
  [chat_emi_club_known] Are you getting much time to join in? -> chat_emi_turn
  [!chat_emi_work_talked] What makes things easier for you at work? -> chat_emi_team
  [chat_emi_work_talked] Can we talk about how work is going? -> chat_emi_team_again
  [!know_mouichido] How do I ask someone to say it again? -> chat_emi_repeat_word
  I’ll let you get on. -> chat_emi_leave
```

#### chat_emi_club

```text
eric: What made you join the swimming club?
emi: I wanted an evening where I wasn’t somebody’s team lead. Kuro said I could just come along.
emi: Then someone asked about the booking and I knew who to call.
CHOICE
  You don’t have to volunteer every time. -> chat_emi_volunteer
  Do you still enjoy going? -> chat_emi_enjoy
```

#### chat_emi_volunteer

```text
emi: I know. I hear a question and I’ve answered it before I remember I could have kept quiet.
{"go":"chat_emi_club_memory"}
```

#### chat_emi_enjoy

```text
emi: Yes, I do. Once we actually start, I’m glad I came.
{"go":"chat_emi_club_memory"}
```

#### chat_emi_club_memory

```text
{"set":"chat_emi_club_known"}
{"do":"remember","who":"emi","id":"club_member","text":"Joined the club to spend an evening away from being a team lead."}
{"go":"chat_emi_leave"}
```

#### chat_emi_turn

```text
eric: Are you getting much time to join in?
IF ms3_emi
  emi: Yes. I got a turn this time. Someone else kept the booking sheet.
  eric: Good. I thought you wanted that turn.
ELSE
  emi: Some. Next time, if I start collecting everybody’s names, remind me I came to do something else.
  eric: I can do that.
{"go":"chat_emi_leave"}
```

#### chat_emi_team

```text
eric: What makes things easier for you at work?
emi: Tell me what you’ve actually checked. If something still fails, I’d rather hear that than promise upstairs that it’s fixed.
emi: I’m trying to stop making the promise first.
emi: Is that workable, or do you need help with something first?
{"go":"chat_emi_work_choice"}
```

#### chat_emi_work_choice

```text
CHOICE
  [know_daijoubu] {daijoubu}. I’ll tell you if I’m stuck. -> chat_emi_ok
  I’ll bring you the result, even if it’s bad. -> chat_emi_result
  I’m still learning what people are asking for. -> chat_emi_language
```

#### chat_emi_ok

```text
eric: {daijoubu}. I’ll tell you if I’m stuck.
{"go":"chat_emi_result_reply"}
```

#### chat_emi_result

```text
eric: I’ll bring you the result, even if it’s bad.
{"go":"chat_emi_result_reply"}
```

#### chat_emi_result_reply

```text
emi: Good. And I’ll ask what you’ve checked before I tell anyone it’s finished.
{"set":{"chat_emi_work_help":"results","chat_emi_work_talked":true}}
{"do":"remember","who":"emi","id":"work_agreement","text":"Talked about what each of you needs when handling requests."}
{"go":"chat_emi_leave"}
```

#### chat_emi_language

```text
eric: I’m still learning what people are asking for.
emi: Ask them to show you. If you still aren’t sure, bring the question to me before you start taking anything apart.
emi: I can help with the request. You can still do the repair.
{"set":{"chat_emi_work_help":"request","chat_emi_work_talked":true}}
{"do":"remember","who":"emi","id":"work_agreement","text":"Talked about what each of you needs when handling requests."}
IF !know_mouichido
  CHOICE
    How do I ask them to say it again? -> chat_emi_repeat_word
    Thanks. I’ll try that. -> chat_emi_leave
ELSE
  {"go":"chat_emi_leave"}
```

#### chat_emi_team_again

```text
IF chat_emi_work_help == 'request'
  emi: Is it a request you want to go over? You said that was the difficult part.
ELSE
  emi: Have you got a result for me, or are you still checking? Either is all right.
CHOICE
  I worry that asking makes me look unable to do the job. -> chat_emi_worry
  I need a different sort of help now. -> chat_emi_work_choice
  Nothing to report. I just came to say hello. -> chat_emi_hello
```

#### chat_emi_worry

```text
eric: I worry that asking makes me look unable to do the job.
emi: You can tell me you didn’t understand someone. I need to know that before I send you off with another request.
CHOICE
  Could you hear me out before giving me advice? -> chat_emi_ask_first
  I’ll try saying when I’m unsure. -> chat_emi_unsure
```

#### chat_emi_ask_first

```text
eric: Could you hear me out before giving me advice?
emi: Yes. Sorry, I went straight into sorting it out. Was there more you wanted to say?
{"set":"chat_emi_ask_first"}
{"do":"remember","who":"emi","id":"ask_first","text":"Asked her to hear you out before offering advice."}
CHOICE
  That was it. I just wanted you to know. -> chat_emi_heard
  I could use help understanding the requests. -> chat_emi_language
```

#### chat_emi_heard

```text
emi: All right. Thanks for telling me.
{"go":"chat_emi_leave"}
```

#### chat_emi_unsure

```text
emi: Please do. I may need a moment to change what I was going to tell upstairs.
emi: That doesn’t mean I wish you’d kept quiet.
{"go":"chat_emi_leave"}
```

#### chat_emi_hello

```text
IF chat_emi_ask_first
  emi: Hello. I was about to offer advice again. I’ll let you tell me what you came over for.
ELSE
  emi: Oh, hello. Sorry, you came over and I went straight to work.
CHOICE
  How are you doing? -> chat_emi_herself
  I’ll see you later. -> chat_emi_leave
```

#### chat_emi_herself

```text
eric: How are you doing?
emi: All right, thanks. I was about to tell you how the requests were going.
IF chat_emi_club_known
  emi: I do want to keep going to the club. It helps having something else to talk about with Kuro.
ELSE
  emi: Kuro keeps asking me that as well. She usually gets a better answer if we’re away from work.
{"go":"chat_emi_leave"}
```

#### chat_emi_repeat_word

```text
emi: {mouichido}. Once more.
{"do":"type","word":"mouichido","from":"emi","prompt":"Ask Emi to say it once more: mouichido."}
emi: {mouichido}.
emi: There. You can use that when you need another look at something, too.
{"go":"chat_emi_leave"}
```

#### chat_emi_leave

```text
{"do":"cam","back":true}
{"do":"save"}
```
