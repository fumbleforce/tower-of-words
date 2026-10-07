# Canteen dining dialogue draft

Cold-read draft, 2026-10-07. No speech generated. Prices and lunch service approved; exact utterances await review. All new NPC Japanese uses normal heard-text rendering; glosses below are review notes, never subtitles. Protagonist text uses MC-neutral wording. Existing worker water/tray/closing lines remain unless this draft explicitly replaces their interaction. Existing help-with-chairs acknowledgement remains conditional on the real flag.

## Speakers and visible opening

- `canteen_worker`: same apron variant25 and approved sales2 reference. Polite, practical, speaks while serving. Keep her established closing conversation.
- `canteen_shirt`: existing shirt variant64 at west rear table; proposed existing sales1 reference. Finishes a workday lunch at his own pace. Ordinary polite Japanese, no fluent English.
- `canteen_cardigan`: existing cardigan variant65 at west front table; proposed existing sales2 reference. Brought a rice container; buys the vegetable side here. Calm, slightly conversational Japanese.
- `canteen_polo`: existing polo variant66 at east rear table; proposed existing reader reference. Finished his plate, staying for water. Unhurried polite Japanese, no English.

No additional bodies or main-cast schedule moves. Each diner has a real occupied setting and visible cup/utensil handling. Their body/pose remains unchanged except for supported local hand actions. All first/repeat/busy words are tied to actual state, with no invented meeting history.

## Worker and order

The worker's existing greeting and chair-help recognition open her menu. Choices: “Order lunch” during lunch, “Get some water”, existing tray-return question, existing closing question, Leave. Ordering is valid with zero learned words. The menu displays the actual two meal models and single canonical prices.

1. Optional already-known opening, while calling to worker: protagonist `{sumimasen}。` Unknown branch: “Excuse me.” Same physical wave, no lesson.
2. Worker points to the two real dishes: `カレーと、野菜の定食です。`
   Review gloss: Curry and the vegetable set meal.
3. Choices “Curry rice · ¥420”, “Rice and vegetables · ¥480”, “Not now”. Each choosing action points to that actual meal. If `know_tabetai`, protagonist says `これ、{tabetai}です。`; otherwise “This one, please.” The pointer carries the object; no claim that bare tabetai identifies a meal.
4. Worker places selected dish on the real tray and indicates cashier/payment dish: `はい。こちらでお願いします。`
   Review gloss: Yes. Here, please.
5. Visible payment/handoff. Insufficient funds leaves both money and food unchanged; protagonist: “Sorry, I haven’t got enough.” Worker nods and returns tray to her side; no moralising response.
6. Successful handoff, worker points toward genuinely available player chairs: `お好きな席へどうぞ。`
   Review gloss: Please take whichever seat you like.
7. Choices choose the actual empty usable table seat or carry under ordinary movement. Paid tray remains owned until eaten/returned; scene replay cannot charge again. Do not voice a second transaction on Continue.

If meal service is closed, the covered wells and existing worker visibility agree with the menu. When staff present outside lunch, worker: `お食事は、お昼だけなんです。お水はどうぞ。`
Review gloss: We only serve meals at lunchtime. You're welcome to water. Evening has no indoor worker, retaining existing exterior closure. Seating and water remain available.

## Eating and water

Eating is one brief visible sequence: place tray, take spoon/utensil, mouth contact, food portion changes, return utensil. No click for every bite. Then ordinary table choices can continue. If `know_oishii`, optional protagonist reaction: `{oishii}。` Otherwise no automatic lesson, thought or translated claim. Other meals remain available irrespective of this reaction.

Water: take the actual room cup, fill beneath tap, sip and put down. No automatic speech or Bag reward. Return tray: one action places the tray and utensil correctly on the existing return trolley. Present worker may use existing `ありがとうございます。` only if an exact approved clip already exists; otherwise silence and a nod is sufficient. No new line just to fill the action.

## Shirt diner, first and ordinary return

Player points at the new usable seat beside his table before speaking.

Protagonist: “Is this seat free?”
Diner puts his spoon down and shifts his own cup onto his setting: `はい、どうぞ。`
Player can sit there immediately. This is a real affordance, not flavour-only permission.

His first meal topic occurs only when player has a visible curry tray:
Diner points at it, keeping his own bowl in view: `あ、カレーにしたんですね。`
Protagonist: “Yes. Yours looks good too.”
Diner lifts his spoon slightly toward his own actual vegetable dish: `こっちも、なかなかいいですよ。`
Review gloss: Ah, you chose curry. This one is quite good too. The reply identifies visible food; it does not assume English comprehension beyond the player's pointing.

For a player without curry, skip those lines. Ordinary Talk still has “Ask about his break” and Leave.

Break topic, player indicates his own badge and the diner's meal, then: “On your break?”
Diner: `ええ。午後は、機械の音がすごくて。`
Diner lowers his cup and settles back toward his bowl: `ここでは、ゆっくり食べたいんです。`
Protagonist: “I’ll let you eat.”
Review gloss: Yes. The machines are loud in the afternoon. I'd like to eat slowly here. No new lesson or player claim to understand the whole explanation; his settling back supplies the cue to leave him to his meal.

Repeat: diner briefly nods, `どうぞ。` He gestures to the real free seat only if it is free; otherwise he simply nods. No “welcome back today” flag shortcut. Busy while raising utensil: he finishes lowering it, `すみません、ちょっと。` No timed text; player can leave at once.

## Cardigan diner, recommendation and later understanding

First greeting: she moves the closed container lid beside her actual rice container, making a shared surface clear. Protagonist points at the container: “You brought your own?”
Diner: `ご飯だけ、家から持ってきたんです。`
She indicates the actual vegetable side on her tray: `これ、{oishii}ですよ。`
Review gloss: I only brought the rice from home. This is good. Persist this exact heard recommendation through the existing remembered-remark system. Do not set know_oishii.
Protagonist: “Thanks.” Ends normally. The player need not understand or order anything.

Later follow-up requires this actual heard remark AND `know_oishii`, in either order and on any later visit, including a return on the same day. Ordinary meal ordering never requires it. Label: “Ask about the vegetables she recommended.” The player points at her visible side dish while it remains. After her meal is cleared, the pointer goes to the actual matching service display; closed-service covers stay in place. No speaking from a distant service counter.
Protagonist: `{oishii}……this one?`
Diner points to her dish, then the actual matching service well: `はい、これです。お昼に、カウンターで買えるんです。`
Protagonist: “I’ll try it.”
If hot service is open, the choice “Order the vegetable set” leads into the normal paid order with price confirmation. If closed, omit that immediate choice and use protagonist “I’ll try it at lunch.” No reservation or free reward is granted. The recommendation stays in memory.

Second personal topic, player gestures to her container: “You do this every day?”
Diner: `家で炊いたご飯が好きなんです。おかずは、ここのほうが楽ですけど。`
She closes the now-empty rice container. The vegetable side remains visible until she actually finishes it; the recommendation pointer then uses the service display.
Review gloss: I like rice cooked at home. The side dishes are easier here, though. Player does not paraphrase Japanese he has not understood; Leave closes the exchange with a nod. The line is optional ordinary life, not setup for an unbuilt cooking quest.

Repeat: `こんにちは。` with a small nod. Busy while handling lid: `あ、少し待ってください。` Then the lid completes its visible placement and the player remains free to leave or start Talk again. Do not force a timer-driven follow-up line.

## Polo diner, the indoor table

Opening follows him setting down his actual water cup. Protagonist points toward the existing terrace exit: “You don’t sit outside?”
Diner looks toward that exit: `外は、風が強いので。`
He steadies the small paper wrapper at his place setting and indicates his current chair: `ここは落ち着きます。`
Protagonist: “Fair enough.”
Review gloss: It's windy outside. It's peaceful here. No invented view; the real exit and protected indoor setting carry the comparison. Do not animate outdoor gusts inside.

If player actually helped the terrace worker, an optional follow-up points at the terrace exit: protagonist “I helped put those chairs away.” Diner nods toward the worker if present: `ああ、あの椅子。けっこう重いでしょう。`
Review gloss: Ah, those chairs. They're quite heavy, aren't they? This recognises the visibly identified furniture, not an unwitnessed claim that he saw the player do it.
Otherwise leave that branch absent.

Repeat: `どうも。` Cup returns to table. Busy when drinking: he sets down the cup before a brief nod, no new voiced line required. Ordinary Talk remains available afterwards.

## Cold-read checks

No new vocabulary, automated learned marks, mandatory ordering, lesson sequence, offscreen food, invented prior acquaintance or main-cast schedule changes. New meal/quiet-work topics are deliberately small and complete. The only knowledge connection is a physically grounded existing-word recommendation, stored only after its actual spoken line. More fluent Japanese is heard normally; English protagonist choices do not force NPCs to understand it where the actual gesture supplies the reference.
