# Aoi lines that drift from her voice

These are existing lines in game3d/story/ that don't match [voice.md](voice.md). Each row gives the file and node, the line number on 2026-10-09, the current text and a rewrite. The rewrites keep what each line does in the scene (the hint, the flag, the word it uses). Lines not listed here are fine as they are. Nothing here has been applied yet.

Most of her lines already fit. They are short, polite and Japanese only, and they carry the beats of her route. What they miss is her cheek. Her few lines that sound like a resolution or a slogan (がんばります, "next time I'll only ask about the part I lost") turn her into a dutiful new hire, and two places where she could tease Eric back let the moment pass.

| Where | Now | Rewrite | Why |
|---|---|---|---|
| day3/plaza.js `d3_aoi_missed` (46) | よかった…… (Phew...) | よかった……。じゃあ、聞かなかったことにしてください。 (Phew. Then let's say you didn't hear it.) Add `{ do: 'emote', who: 'aoi', kind: '♪' }` after it as a wink. | She is relieved for one line and then turns it into a joke between them, which is where her cheek first shows. |
| day3/plaza.js `d3_aoi_again` (72) | 日曜日のテニス、がんばります。 (I'll do my best at Sunday's tennis.) | 日曜日、テニスです。ラケット、まだ持ってないけど。 (Tennis on Sunday. I haven't got a racket yet, though.) | がんばります is a stock sign-off. The rewrite gives a real detail that pays off when she borrows the racket on day 4. |
| ongoing/plaza.js `ongoing_aoi` (22) | 日曜日のテニス、がんばります。 | 日曜日、テニスです。ラケット、借りられるかな。 (Tennis on Sunday. I wonder if I can borrow a racket.) | The same stock line, repeated every week before day 4's tennis. This version still works after the day 3 line above. |
| conversations/aoi.js `chat_aoi_questions_again` (33) | 今度は、分からなくなったところだけ聞いてみます。 (Next time I'll only ask about the part I lost track of.) | 今度は、ちゃんとメモします。……メモ、どこに置いたかな。 (Next time I'm writing it down. ...Where did I put my notes?) | The current line is a tidy lesson learned. The rewrite keeps the plan and lets her laugh at herself. |
| day4/tennis.js `d4_tennis_drink` (93) | でも、来週も来ます。 (But I'll come next week too.) | でも、来週も来ます。靴は、そのうち慣れますよね？ (I'm still coming next week, though. The shoes will break in, won't they?) | The bare line closes the scene too neatly. She asks Eric something, which keeps the conversation going as his next line expects. |
