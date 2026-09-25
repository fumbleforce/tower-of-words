// Kanji levels for the per-player reading track. Level 1 = JLPT N5, level 2 = N4, anything else = 3.
// A kanji's starting state for a player comes from their kanji band (the level check); play then moves it.
export const KANJI_N5 = '日一国人年大十二本中長出三時行見月後前生五間上東四今金九入学高円子外八六下来気小七山話女北午百書先名川千水半男西電校語土木聞食車何南万毎白天母火右読友左休父雨';
export const KANJI_N4 = '部回顔側数働誰変押寝次階室機会同事自社発者地業方新場員立開手力問代明動京目通言理体田主題意不作用度強公持野以思家世多正安院心界教文元重近考画海売知道集別物使品計死特私始朝運終台広住真有口少町料工建空急止送切転研足究楽起着店病質待試族銀早映親験英医仕去味写字答夜音注帰古歌買悪図週室歩風紙黒花春赤青館屋色走秋夏習駅洋旅服夕借曜飲肉貸堂鳥飯勉冬昼茶弟牛魚兄犬妹姉漢';
const LV = {};
for (const c of KANJI_N5) LV[c] = 1;
for (const c of KANJI_N4) if (!LV[c]) LV[c] = 2;
export const kanjiLevel = c => LV[c] || 3;
