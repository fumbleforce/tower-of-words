# Day 4

## day4_morning
[scene: office]
[clock 09:10]
[show aoi panic]
[show mio bored]
Aoi [panic]: ごめんなさい！　コンペの企画書、消しちゃった……！  /  "I'm so sorry! I deleted the proposal for the pitch...!"
Mio [suspicious]: ……ファイル、ぜんぶ？  /  "...The whole file?"
Aoi [panic]: ぜんぶ。真壁さんのパソコンで、ボタンを押したら……。  /  "All of it. I pressed a button on Makabe's computer and..."
(Emi is out all afternoon. The pitch draft is due to Sales at five, sharp.)
[task: 五時まで・企画書]
Mio [bored]: バックアップは、地下一階の倉庫にある。でも、かぎがない。  /  "There's a backup in the storage room on basement level 1. But we don't have the key."
Mio [bored]: かぎは、五階の役員室。……私は行かない。こわいから。  /  "The key's on the fifth floor, in the executive offices. ...I'm not going. It's scary."
CHOICE: Before you go, you need Mio's help with the computer. Ask her.
  1) You: このパソコン、使ってもいい？  /  "Can I use this computer?"
    Mio [bored]: いいよ。パスワードは「天川123」。……だれにも言わないで。  /  "Sure. The password is 'amakawa123'. ...Don't tell anyone."
  2) You: このパソコン、使って。  /  "Use this computer."
    Mio [suspicious]: ……私に言ってるの？　何それ、命令？  /  "...Are you telling me to? What is that, an order?" The te-form alone is a request for someone else to act. To ask permission, add もいい: 使ってもいい？
    Mio [bored]: ……まあ、いいけど。パスワードは「天川123」。  /  "...Fine, whatever. The password is 'amakawa123'."
Aoi [panic]: あたしも行ってもいい？　何か、手伝いたい！  /  "Can I come too? I want to help somehow!"
CHOICE: Your reply
  1) You: いいよ。一緒に行こう。  /  "Sure. Let's go together."
    [set aoiWithYou]
  2) You: ここで待ってて。  /  "Wait here."
    Aoi [panic]: は、はい……。  /  "O-okay..."
[everyone leaves the frame]
→ day4_route

## day4_route
[scene: elevator]
CHOICE: The key, or the door?
  1) You: 五階　役員室（かぎ）  /  Fifth floor, executive offices (the key)
    → day4_exec
  2) You: 地下一階　倉庫（ドア）  /  Basement level 1, storage (the door)
    → day4_storage

## day4_exec
[scene: execfloor]
(Thick carpet. A secretary looks up, and her smile arrives a second after her eyes.)
[show secretary neutral]
Secretary [neutral]: はい。どのようなご用件でしょうか。  /  "Welcome. How may I help you?" (Polite speech. You don't need to understand every word yet.)
CHOICE: Your reply
  1) You: 倉庫のかぎを、かしてください。  /  "Please lend me the storage key."
    Secretary [neutral]: かしこまりました。少々お待ちください。  /  "Certainly. Please wait a moment."
    (The moment is not short. Forms, a signature, a phone call to someone called 部長, another form.)
    [time +45]
  2) You: かぎ、ちょうだい。  /  "Gimme the key."
    Secretary [neutral]: ……失礼ですが、どちらの部署の方でしょうか。  /  "...Excuse me, but which department are you from?" Casual speech on the executive floor lands badly.
    (It takes twice as long to get the key now, and she writes something down.)
    [time +70]
[everyone leaves the frame]
[set hasKey]
→ day4_storage

## day4_storage
[scene: storage]
IF aoiWithYou:
  [show aoi panic]
IF hasKey:
  (The key turns. The door opens like any normal door.)
ELSE:
  (The storage door is locked. At the end of the corridor, footsteps: Ishibashi on his rounds, coming this way.)
  [show ishibashi suspicious]
  IF ishibashi < 0:
    (He has been watching you since Monday. Anything strange now counts double.)
    [set ishibashiWary]
  CHOICE: Ishibashi is ten metres away.
    1) You: （言霊を使う）  /  (Use kotodama. Ishibashi is watching, and he already keeps notes: 2 witnesses if Aoi is with you)  [kotodama]
      SPELL: Open the locked door. (verbs 開ける, 動く; answer 開けて)
        cast 開けて (works):
          (Click. The lock opens by itself.)
          IF ishibashiWary:
          Ishibashi [suspicious]: ……今、かぎ、開いたか？　倉庫のかぎは上にあるはずだ。  /  "...Did that lock just open? The storage key should be upstairs."
          CHOICE: Your reply
            1) You: 開いてたよ。  /  "It was already open."
              Ishibashi [suspicious]: ……ふん。書いておく。  /  "...Hmph. I'll write that down."
            2) You: 入ってもいいですか。  /  "May I go in?" (polite)
              Ishibashi [neutral]: ……早くしろ。  /  "...Make it quick."
        cast 動いて (retry):
          (The whole door rattles in its frame, loudly. Ishibashi speeds up.)
        cast default (anything else) (retry):
          (Nothing. The lock stays shut.)
    2) You: 上に行って、かぎをもらう  /  Go up and get the key
      [everyone leaves the frame]
      → day4_exec
[everyone leaves the frame]
(Shelves of old hard drives, each labelled in marker. You need the one for Planning 7.)
[find label: 営業部　バックアップ | 企画室7　バックアップ | 広報　写真 | 社内報　2025 → 企画室7　バックアップ]
→ day4_finish

## day4_finish
[scene: office]
IF time after 17:00:
  [set missedDeadline]
IF missedDeadline:
  (The file is restored at 5:20. Sales has already closed the submissions.)
  [show emi surprised]
  Emi [surprised]: ……間に合わなかった？　そっか。  /  "...We didn't make it? I see."
  Emi [smile]: 大丈夫。私が黒田さんと話す。  /  "It's fine. I'll talk to Kuroda."
ELSE:
  (The file is back, and it goes out at 4:48. Aoi sits on the floor and cries a little from relief. Emi walks in at five, and Mio tells her everything.)
  [show emi smile]
  Emi [smile]: ミオから聞いた。……助かった。ありがとう。  /  "Mio told me. ...You saved us. Thank you."
[everyone leaves the frame]
→ day4_night

## day4_night
[clock 21:30]
[scene: office]
(You come back for the umbrella you forgot. The light in Planning 7 is still on.)
[show emi surprised]
(Emi is alone at her desk with a single sheet of paper. She turns it over when she hears you.)
Emi [surprised]: ……あ、まだいたの？　何でもない。早く帰って。  /  "...Oh, you're still here? It's nothing. Go home."
CHOICE: Your reply
  1) You: それ、何？  /  "What's that?"
    Emi [smile]: ただの紙。……おやすみ。  /  "Just paper. ...Good night."
    [set askedMemo]
  2) You: エミさんも、早く帰ってね。  /  "You go home soon too, Emi."
    Emi [smile]: ……うん。ありがと。  /  "...Yeah. Thanks."
(On your way out you see the paper's shadow through the thin sheet. Two words are larger than the rest: 企画室7　閉鎖.)
[everyone leaves the frame]
[end of day summary]
