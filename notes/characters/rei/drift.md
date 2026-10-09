# Rei drift list

These are the Rei lines in game3d/story/ that break [voice.md](voice.md), checked on 2026-10-09 after Jørgen's notes on character-voices-1: Rei bosses Eric openly, treats him as a subordinate she plays with, is ruthless at work, and softens only slowly. Eric is 37 with a lot of experience, and she bosses him anyway. Nothing in game3d/ has been changed.

B means she offers or asks where she would tell him ("You can...", "Would you like..."). S means she apologises or goes sheepish. C means the line breaks the setting canon. F means the line is flat and has no edge.

How to read a rewrite: 「…」 is an overheard Japanese line (`overheard: true`), and すみません, もう一度 and 大丈夫 come through sharp once known. Text in [brackets] is a gesture or a hook. "…" in quotes is an English line. Each rewrite needs a new voice clip, and the `emo` tag should drop `sheepish` and `hesitant` where the rewrite does.

Lines not listed are fine as they are, such as her serve demonstration's first line, her Japanese request to the opponent in `ms_rei_waits`, and her evening walk on the sea terrace.

## Day 3

| Id | Line | Why | Current | Rewrite |
|---|---|---|---|---|
| `d3_rei_lunch` (day3/shotengai.js) | 114 | F | Could I reach past you? My drink’s there. | 「すみません、そこ、どいてください。」 [points at the drinks behind Eric] |
| `d3_rei_practice` (day3/sports.js) | 13 | F | The club meets tomorrow. I’m just getting a few serves in. | "The club plays here tomorrow, so I’m getting some serves in today. Stay off the court while I’m hitting." Or replace the node with the scene in [sample.md](sample.md). |
| `d3_rei_practice` (day3/sports.js) | 14 | B | You can watch from the bench. The balls sometimes go further than I mean. | "If you want to watch, sit on the bench, and throw the balls back when they come your way." |

## Day 4

| Id | Line | Why | Current | Rewrite |
|---|---|---|---|---|
| `d4_rei` (day4/sports.js) | 19 | B | You can use the spare racket. Leave it by the basket when you finish. | "Take the spare racket, and put it back by the basket when you’ve finished. Not on the bench." |
| `d4_rei`, `d4_aoi` (day4/sports.js) | 20, 29 | B | You can join at the plaza board. Take a slip, then come back if you want to play. | "You’re not a member yet. Go to the plaza board, take a slip, and bring it back here if you want to play." |
| `d4_display` (day4/sports.js) | 38 | B | Could you look at the score display for us? I sent a request this morning. Watch when I press this. | "You’re from IT, so have a look at the score display. I sent a request this morning and nobody’s come. Watch what happens when I press this." |
| `d4_display_fix` (day4/sports.js) | 51 | F | Good. I was having to remember the score and which button to avoid. | "Good. I’ve been keeping the score in my head for a week. Next time I send a request, come the same day." |
| `d4_rei_name` (day4/tennis.js) | 4 | F | I’m Rei. Are you here to play, or about the display? | "I’m Rei. Are you here to play, or have you finally come about the display?" |
| `d4_tennis_offer` (day4/tennis.js) | 21 | B | Yes, until they finish their game. Have you brought a racket? | "Yes, until they finish their game. Where’s your racket? You haven’t brought one, have you?" |
| `d4_tennis_offer` (day4/tennis.js) | 22 | B | We’ve got the practice court until they finish. Have you brought a racket? | "We’ve got the practice court until they finish. Where’s your racket? You haven’t brought one, have you?" |
| `d4_tennis_offer` (day4/tennis.js) | 25 | B | You can both borrow one. Aoi, you can put the basket down. | "Take one each from the bag. Aoi, put the basket down, you didn’t come here to carry it." |
| `d4_tennis_offer` (day4/tennis.js) | 30 | B | She’s asking you to play with her. You can have a go together. | "She wants you to play with her. Go on, the two of you, over there." |
| `d4_tennis_invite` (day4/tennis.js) | 53 | B | You want to go over together? Yes, that court is free. | "Yes, go over together, that court’s free. Don’t hit anything into ours." |
| `d4_rei_serve` (day4/tennis.js) | 69 | S | Sorry, I’m getting ahead. Watch my feet for this one. | "Watch my feet, then. And don’t talk until I’ve finished the serve." |
| `d4_rei_serve` (day4/tennis.js) | 73 | F | Your turn, Aoi. I’ll move back. | "Your turn, Aoi. Do exactly what I did, feet first." |
| `d4_tennis_finish` (day4/tennis.js) | 78 | F | They’ve finished. I’m going over for doubles. Keep the spare, Aoi, I’ve got mine. | "They’ve finished, so I’m going over for doubles. Keep the spare, Aoi, and bring it back next Sunday." |
| `d4_tennis_repeat` (day4/tennis.js) | 99 | B | We can fit you in after this game. Aoi’s over there if you want to warm up. | "You’re playing after this game. Go and warm up with Aoi until then." |

## Day 5

| Id | Line | Why | Current | Rewrite |
|---|---|---|---|---|
| `d5_rei_lunch` (day5/shotengai.js) | 34 | F | I’m taking lunch back today. Somebody moved the afternoon meeting forward. | "I’m eating at my desk today. Somebody moved the afternoon meeting forward without asking me, and I’m going to find out who." |
| `d5_rei_lunch` (day5/shotengai.js) | 37 | F | Excuse me, can I get past? | 「すみません、通ります。」 [already moving past him] |
| `d5_rei` (day5/east_coast.js) | 4 | F | Good evening. There’s room to get past. | 「こんばんは。どうぞ、通ってください。」 [steps aside] She speaks Japanese to a stranger. |

## Every day (ongoing/)

| Id | Line | Why | Current | Rewrite |
|---|---|---|---|---|
| `reiIntroduction` (ongoing/east_coast.js) | 7 | F | Hello. I’m Rei. I’ve seen you around the office. | "You’re the new one from B2. I’m Rei, from Sales. I’ve seen you wandering around the office." |
| `ongoing_rei_practice` (ongoing/east_coast.js) | 55 | B | Come again on Sunday. We can change partners this time. | "Come on Sunday. You’re playing with me this time, so don’t be late." |
| `ongoing_rei_practice` (ongoing/east_coast.js) | 56 | B | Sunday evening, by the gym. We have spare rackets if you want to try. | "Sunday evening, by the gym, at six. There’s a spare racket, so you’ve got no excuse." |
| `ongoing_rei_practice` (ongoing/east_coast.js) | 58 | F | When I can find someone. Walking is easier to arrange. | "When I can find someone good enough. Most of Sales can’t play, so I walk instead." |
| `ongoing_rei_shopping` (ongoing/shotengai.js) | 69 | F | I’m getting something before I go back. Have you found a place you like yet? | "I’m getting something to eat at my desk. Have you found anywhere decent yet, or are you still living on konbini food?" |

## Conversations (conversations/rei.js)

| Id | Line | Why | Current | Rewrite |
|---|---|---|---|---|
| `chat_rei_game`, `chat_rei_game_again` | 20, 25 | S | 負けると、{mouichido}って頼んじゃうんです。 | 「負けたら、{mouichido}。勝つまでやります。」 (If I lose, once more. I play until I win.) Tag `emo` as `stern`, not `sheepish`. |
| `chat_rei_repeat_word` | 36 | F | Once more. I mean another game. | "Once more. Another game, and another one after that until I win." |
| `chat_rei_game_question` | 50 | S | Yes. I’ve lost the second game too. Then I go home. | "Yes. If I lose that one as well, I tell my partner why it was their fault, and then I go home." |
| `chat_rei_more` | 59 | F | You might have to find somebody else. I do have to go home eventually. | "Then you’ll be asking someone else. Once I’ve lost twice, I’m going home to read." |
| `chat_rei_one` | 64 | F | All right. I’ll remember that. | "Then don’t partner me. I’ll remember you said that." |
| `chat_rei_calls` | 83 | C | Sometimes a customer calls just as I’m leaving. If I answer, I miss my train. | "They call just as I’m leaving the office. I always answer, because if I don’t, someone else in Sales will, and then he’s their customer." Nobody commutes on the island. |
| `chat_rei_answer` | 92 | F | Usually. Some of them only call when something has actually gone wrong. | "Always. I’ve never let one go to somebody else, and I’m not starting now." |
| `chat_rei_ring` | 97 | C, S | I’ve tried that. Then I spend the train ride wondering what happened. | "I tried that once. I spent the whole evening wondering who’d picked it up instead." |
| `chat_rei_calls_again` | 101 | F | I try to call them before I leave now. It doesn’t always work. | "I call them all before I leave now, so they’ve got no reason to call me." |

## Bond milestones (milestones/rei.js and aoi.js)

cast.md marks this Rei route as superseded and says not to build it. These rewrites only cover the lines while they are still in the game.

| Id | Line | Why | Current | Rewrite |
|---|---|---|---|---|
| `ms_rei_remembers` (milestones/rei.js) | 8 | B | Want to try the serve yourself? I’ll keep the explanation shorter. | "You’re serving today. I’ll keep the explanation short, so pay attention." |
| `ms_rei_remembers` (milestones/rei.js) | 9 | B | You were hitting with Aoi. Would you like me to send you a few this time? | "Last week you hit with Aoi. Today you’re hitting with me, so stand over there." |
| `ms_rei_remembers` (milestones/rei.js) | 9 | B | What would you like to try? We’ve got some space now. | "We’ve got the court for twenty minutes. Serves first, then I’ll feed you some forehands." |
| `ms_rei_remembers` (milestones/rei.js) | 13 | B | Try another serve. I’ll watch where you throw the ball. | "Serve again, and throw the ball up in front of you this time. I’m watching." |
| `ms_rei_remembers` (milestones/rei.js) | 13 | B | Try that again. I’ll put the next ball in the same place. | "Do that again. I’m putting the next one in the same place until you hit it properly." |
| `ms_rei_half` (milestones/rei.js) | 17 | B | Come on my side for doubles. I’ll take the left. | "You’re on my side for doubles. I’m taking the left, you’ve got the right, and don’t drift into the middle." |
| `ms_rei_try_again` (milestones/rei.js) | 23 | S | Yes. I got there before I thought about it. | "Fine, have another one. You were too slow, so I took it." |
| `ms_rei_your_half` (milestones/rei.js) | 24 | S | All right. I’ll stay over here. | "Your half, then. Let’s see what you do with it." |
| `ms_rei_waits` (milestones/rei.js) | 27 | F | Where did you want the next one? Closer to the middle? | "Where do you want the next one? Tell me now, I’m not going to guess." |
| `ms_aoi_asks` (milestones/aoi.js) | 29 | F | Thirty minutes for beginners? Yes, put that on the booking so everyone can see it. | "Thirty minutes for beginners, then doubles. Write it on the booking so nobody argues with me about it later." |
