# The island's south half

The south half of Amakawa, mapped for day 2 and later: every building and outdoor place in it, who works, lives or spends time there, its doors, whether it can be entered later, how it connects, and one idea for using Japanese there. Jørgen asked for it on 2026-10-02: "I want mapping of half the island so we can make an interesting day 2 eventually". Nothing here is built unless the row says so. Built places are described in [places.md](places.md) and only linked from here. Jørgen confirmed this half as the set to build out (Review island-half-1, 2026-10-02: "Correct"); the districts are built one at a time: the shop street and seafront is built (chunk `shotengai`), and so are the east lane (chunk `east_lane`), the east coast from the dorms' sea terrace to the onsen's front (chunk `east_coast`), the sports ground from the north street's top along the gym, the pool and the courts to the onsen path (chunk `sports`), the office street from the gym's corner past the offices and the bank (chunk `office_quarter`), the harbour from the office street's west end: the harbour walk, the supply yard and pier, the ferry landing and pier (chunk `harbour`), and the old works north of it: the works lane, yard and street, the factory's and the power plant's fronts, the server hall, the recycling centre and the research walk to Amakawa Research (chunk `works`). The island as a whole (what is on it, no cars, no commute) is in [setting.md](setting.md).

The hooks are ideas for using Japanese in each place. Story, dialogue and secrets are Codex's ([collab/PROTOCOL.md](../../collab/PROTOCOL.md)).

## Which half

The south half. It holds the whole day-1 route (station, head office, plaza, dorms) and the island's everyday life: shops, food, baths, the clinic, the harbour and the old works. Day 2 can start where day 1 ends. Of Jørgen's picks on [island-places](../../reviews/island-places/review.json), it has the shotengai, ramen and izakaya, the sento and coin laundry, the clinic, karaoke and the game centre, the harbour and the old industry. The north half is the leisure ground: the park with the cherry-tree path and the matsuri stage, the sports field, the history hall and the founder's statue, the shrine headland, the viewpoint and the university.

The edge runs east from the west coast north of the old power plant to the works street, south to the park's south edge, east along it, and north round the onsen to the east coast. The south half is a little more than half the land.

The map: `?map=1`, then M, then "Day 2 plan". The planned streets, courts and green are data in game3d/js/scenes/island-plan.js, in the island frame of [places.md](places.md) ("Where the places sit on the island"). They are drawn on the map only; the half's coast and every building are the layout's. When an area is built, its entries move into the layout proper with its chunk (the east coast's walks, the onsen's court, the tennis courts, the onsen's grounds and the coast past the onsen are in game3d/js/scenes/island-baths.js; the sports lane, the pool walk, the courts walk, the two short walks off it and the pool's deck in game3d/js/scenes/island-sports.js; the office street, gym_link and the walks to Amakawa Foods and Amakawa Construction in game3d/js/scenes/island-offices.js; the harbour walk, the supply yard and pier, the ferry landing and pier and the harbour's coast in game3d/js/scenes/island-harbour.js, squared up so the landing meets the yard along a side and the ferry pier runs south from the landing's corner; the works lane, yard and street, the research walk, and the aprons before the factory's gates and the server hall's door in game3d/js/scenes/island-works.js). `node tools/facts/check.mjs` checks the place ids and names below, and the street list, against that file.

## How it fits together

Seven districts, all on the town grid, reached on foot or by bike (no cars):

- Arrival and head office, on the west coast: the station, the forecourt, head office and its wing.
- The office quarter, north of head office: one block for each Amakawa division, along the office street.
- The plaza, the canteen and the clinic, in the middle.
- The shop street and the seafront, along the south coast.
- The east lane and the dorms, in the south-east.
- Sports and baths, in the north-east: the gym, the pool, the courts and the onsen.
- The harbour and the old works, in the north-west.

Three streets run east-west: the lane (day 1's walk from head office to the dorms), the back lane behind the canteen, and the office street from the harbour to the gym, which carries on as the sports lane. Streets run north-south at the shed, behind the tower (the quarter street), past the pocket park (the north street), past the dorm court (the dorm street) and up to the old works (the works street). Walks follow both coasts, and the promenade runs along the sea. The far corners are three to four minutes' walk apart: about 230 m from the station to the ferry, and about 200 m from the dorm court to the onsen.

## Streets and paths

The planned ones (island-plan.js PLAN_PATHS). Built and backdrop paths are in island-layout.js.

| Id | Kind | Runs |
|---|---|---|
| `shed_street_far` | Street | The shed street carried on north from behind the head office wing to the office street. |
| `quarter_street` | Street | North from the cross street behind the tower (the tower's rear door) to the office street. |
| `back_lane_west` | Street | The back lane carried west past the canteen's loading yard to the quarter street. |

## Places

One row per place. Where: the building ids in island-layout.js (or island-plan.js) and the layout's path ids. Later: Built (on day 1), Enter (planned with an inside), or Outside (seen and walked past, not entered).

### Arrival and head office

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `station` | Honsha station (本社駅) | `station` | Built as `gate` ([places.md](places.md)): the security room and the gate. The monorail's only stop. | Glass front from the covered walkway; north door to the forecourt | Built | The fare chart and ticket machine: a return to the mainland (往復, 片道). |
| `platforms` | Monorail platforms (ホーム) | `platform_shed` | Built; `train` arrives here. One island platform under the long roof. | Stairs at the south end down to the covered walkway | Built | The departure board and the announcements: 次, 発車, 何番線. |
| `forecourt` | Station forecourt (駅前広場) | `court` | Built as `forecourt`. | Station north door, head office south door, the lane east, the shed street north | Built | An island guide map board with 現在地, and asking the way: 右, 左, まっすぐ. |
| `bike_court` | Bike parking (駐輪場) | `bike_court` | Built, the forecourt's racks. Company bikes are how everyone gets round the island. | From the court | Outside | Borrowing a company bike: the rules sign, the lock number (番号), 返却. |
| `head_office` | Head office (本社) | `head_office` | Lobby, lift and B2 built ([places.md](places.md)). Twelve storeys; Sales on 5F, Accounts on 12F ([cast.md](cast.md)). | South door on the court; rear door on the cross street | Enter | The lobby's floor directory: 階 and department names, to find a floor. |
| `general_affairs` | General affairs (総務部) | `head_office_wing` | The five-storey wing west of the tower: ID cards, forms, lost property and dorm assignments, clerks behind a long counter. | Staff door on the west face from the shed street; service door to the yard | Enter | Filling in a form: a name in katakana, 住所, 生年月日, a signature. |
| `facilities_office` | Facilities office (施設課) | `office_e1` | Four storeys north-east of the tower. Takes the island's repair requests and passes the IT ones down to B2. | Door at the cross street's east end | Enter | A repair request slip (修理依頼): place, machine, 故障, date. |
| `west_coast_walk` | West coast walk (海沿いの道) | `coast_path`, `harbour_walk` | Built as the forecourt's backdrop, with two lookouts; its north end, the harbour walk, is walked in `harbour`. Early joggers, anglers on the rocks. | From the shed street and the station garden; north to the office street | Outside | A fishing sign (釣り禁止) and a passing jogger's おはようございます. |

### Office quarter

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `trading_office` | Amakawa Trading (天川商事) | `w1` | Four storeys at the harbour end of the office street: imports, exports, trade with the mainland. Its front is built and walked past in `office_quarter` ([places.md](places.md)), the door shut. | Door on the office street | Enter | Exchanging business cards (名刺): a name and a title, 部長, 課長. |
| `print_shop` | Print shop (印刷所) | `w3` | Three storeys. Prints the island's signs, menus, forms and the company newsletter; presses on the ground floor. | Door on the shed street | Enter | Proofreading a sign or a menu to find the one wrong kana. |
| `foods_office` | Amakawa Foods (天川食品) | `m1` | Four storeys. The food division, which runs the canteen and stocks the shops; a test kitchen on the ground floor. Its front is built in `office_quarter`, the door shut. | Door on a walk north from the office street, on the shed street's line | Enter | Tasting and saying how it is: おいしい, 甘い, 辛い, しょっぱい. |
| `electric_office` | Amakawa Electric (天川電機) | `m2` | Five storeys. Made most of the island's machines in the nineties and still keeps their manuals. Its front is built in `office_quarter`, the door shut. | Door on the office street | Enter | A manual or a machine plate: 電源, 入, 切, 注意. |
| `logistics_office` | Amakawa Logistics (天川物流) | `m3` | Four storeys. Runs the supply quay, the ferry's freight and the cargo-bike deliveries round the island. Its front is built in `office_quarter`, the door shut. | Door on the office street | Enter | A delivery slip and counting boxes: 一箱, 二箱, 三箱. |
| `construction_office` | Amakawa Construction (天川建設) | `m4` | Five storeys behind m3 and m5. Keeps the island's buildings standing; hard hats on hooks inside the door. Its front is built in `office_quarter`, the door shut. | Door on a court at the end of a walk north from the office street between m3 and m5 | Enter | Safety signs: 危険, 立入禁止, 工事中. |
| `insurance_office` | Amakawa Life (天川生命) | `m5` | Three storeys. The life insurer every employee is signed up with; quiet and carpeted. Its front is built in `office_quarter`, the door shut. | Door on the office street | Enter | Polite counter phrases: お名前は, 少々お待ちください. |
| `personnel_office` | Personnel (人事部) | `m6` | Five storeys north of the canteen's yard: hiring, transfers and the new-staff intake. | Door on the walk from the canteen's loading yard (built as backdrop) | Enter | The transfers notice (異動): names, departments, dates. |
| `bank` | Company bank (天川銀行) | `b_h` | A long two-storey branch. Salaries land here, and the ATM corner stays open late. Its front is built in `office_quarter`, the door shut. | Door and ATM corner on its east face, in the quarter street's mouth at the office street | Enter | The ATM screen: お引き出し, 残高, 暗証番号, amounts in 円. |

### Plaza, canteen and clinic

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `plaza` | Fountain plaza (噴水広場) | `fountain_plaza` | Built as `plaza`. | The lane west and east, the canteen link north, the cross walk south to the south walk, which leads on to the shop street | Built | Day-2 posters on the notice board: dates, times, places. |
| `canteen` | Canteen (社員食堂) | `canteen` | Terrace and front built in `plaza`. Inside: a counter line with trays, about two hundred seats, cooks and a cashier. Most of head office eats here at noon. | Doors on the fountain's axis; kitchen door on the back lane | Enter | The meal-ticket machine (食券機): 定食, カレー, うどん, the right button. |
| `canteen_yard` | Canteen loading yard (搬入口) | `canteen_yard` | Built as backdrop. Morning deliveries come in by cargo bike from the quay. | From the back lane; m6's walk north | Outside | Crate labels: 割れ物注意, 冷蔵, 天地無用. |
| `clinic` | Clinic (クリニック) | `clinic` | The island's one clinic; its front is built as backdrop ([places.md](places.md)). Internal medicine and paediatrics, a nurse at reception, a pharmacy window. | Door off its entrance court on the back lane | Enter | The questionnaire (問診票) and saying what hurts: 頭が痛い, 熱, 咳. |
| `clinic_grove` | Grove (木立の広場) | `grove_square` | Built as backdrop: a gravel square with benches between the clinic and block_e2. A quiet lunch spot for office workers. | Walk from the back lane | Outside | Lunchtime talk on the benches, overheard ([systems.md](systems.md)). |

### Shop street and seafront

The shop rows have fifteen bays each, numbered 0 to 14 from the west (island-south.js BAYS).

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `shotengai` | Shop street (商店街) | `shops_north`, `arcade`, `shops_south` | Built as `shotengai` ([places.md](places.md)): two rows of small shops facing each other under a glass arcade. Some bays have their shutters down. Busiest after work. | West mouth from the station walk, east mouth to the dorm street, three alleys down to the promenade | Built | Shop signs in kana and katakana, read bay by bay. |
| `store` | Konbini, 100-yen and drugstore (コンビニ) | north row, bay 7 | The island's one combined konbini, 100-yen shop and drugstore; its front is built, the door shut. Open late, a clerk at the till. | Door on the arcade | Enter | At the till: 袋いりますか, 温めますか, paying in 円. |
| `bakery` | Bakery (パン屋) | north row, bay 10 | Front built, the door shut; its flyer is in Eric's mailbox. Trays and tongs, breads labelled in katakana. | Door on the arcade | Enter | Picking breads by their katakana labels: メロンパン, カレーパン. |
| `bike_shop` | Bike shop (自転車屋) | north row, bay 2 | At the station end; front built, the door shut. Repairs, tyres and the company bikes' servicing; an old mechanic. | Door on the arcade | Enter | Saying what is wrong: パンク, ブレーキ, いくらですか. |
| `game_centre` | Game centre (ゲームセンター) | north row, bays 12 and 13 | Front built, the door shut, crane games outside. Inside: crane games, rhythm games and a change machine. | Door on the arcade | Enter | Crane-game instructions and the change machine (両替): 100円玉. |
| `karaoke` | Karaoke box (カラオケ) | south row, bays 13 and 14 | Front built, the door shut. Front desk downstairs, booths upstairs, open late; office groups after work. | Door on the arcade by the east mouth | Enter | The front desk (何名様, 何時間) and song titles in katakana. |
| `izakaya` | Izakaya (居酒屋) | `izakaya` | Three storeys at the shop street's east end, a red lantern by the door; front built, the door shut. Where people drink after work. | Door on the walk out of the arcade's east mouth | Enter | The menu on the wall and ordering: すみません, とりあえずビール, 乾杯. |
| `ramen` | Ramen shop (ラーメン屋) | `ramen` | Across the dorm street from the izakaya: eight stools at a counter. | Door on the dorm street | Enter | The ticket machine, then how firm: かため, ふつう, やわらかめ. |
| `promenade` | Seafront promenade (海辺の遊歩道) | `promenade` | Built in `shotengai`: walked from the alleys and the mouths' walks. Benches and lamps, people walking in the evening. | The station walk at the west end, the arcade walk at the east end, the three alleys | Outside | A fingerpost with places and minutes: 駅, 浜辺, 5分. |
| `beach` | Beach (浜辺) | `beach` | Built in `shotengai` with three beach huts, seen and not walked: the stairs' heads are chained off. | Three flights of stairs down from the promenade | Outside | The beach rules board: 遊泳, 禁止, the hours. |

### East lane

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `training_centre` | New-staff training centre (研修センター) | `block_e1` | Two storeys; its front and door are built in `plaza` ([places.md](places.md)). New hires spend their first weeks here. | Door at the head of the cross walk | Enter | The training timetable: times (9時半), rooms, 研修. |
| `cafe` | Café (カフェ) | `m_e1` | A café on the ground floor; its front and sign are built, walked past in `east_lane` ([places.md](places.md)), the door shut. | Door on the south walk | Enter | Ordering a drink: ホット, アイス, サイズ, 店内 or 持ち帰り. |
| `liquor_shop` | Liquor and rice shop (酒屋) | `m_e2` | One storey under a tiled roof, its sign on the roof and a cedar ball by the door; front built in `east_lane`, the door shut. Sake, beer and rice by the bag, run by an old couple. | Door at the foot of the cross walk | Enter | Sake labels, and rice bags by the kilo: 重い. |
| `barber` | Barber (床屋) | `r8` | Two storeys, the striped pole by the door; front built in `east_lane`, the door shut. The barber lives upstairs. | Door on the pocket park's axis, across the south walk | Enter | Saying how to cut it: 短く, 少しだけ, 前髪. |
| `pocket_park` | Pocket park (小さな公園) | `pocket_park` | Built in `east_lane` ([places.md](places.md)): a cross of walks, one tree, benches. | Walks from the lane and the dorm street | Outside | Small talk about the weather on a bench: 暑いですね. |
| `travel_office` | Amakawa Travel (天川トラベル) | `block_e2` | Four storeys of offices; the ground floor books the ferry and trips to the mainland. Its front and sign are built, reached in `east_lane` up the north street and along the back lane, the door shut. | Door on a short walk from the back lane | Enter | Booking a trip: 何月何日, 往復, 何名. |
| `family_flats` | Family flats (家族寮) | `block_e3`, `r3` | Three-storey blocks on the north street for staff with families; washing on the balconies. block_e3 is walked past in `east_lane`. | Doors on the north street | Outside | Name plates (表札) by the doors: reading family names. |
| `director_house` | Director’s house (所長の家) | `r9` | A detached two-storey house, one of the island's few better homes; walked past in `east_lane`. | Door on the north street | Outside | The gate intercom: はい, どちら様ですか. |

### Dorms

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `dorm_court` | Dorm courtyard (寮の前庭) | chunk `dorm_court` | Built ([places.md](places.md)). | Gate from the dorm street; the hall doors | Built | The drinks machines: ホット, つめたい, 売切. |
| `coin_laundry` | Coin laundry (コインランドリー) | the court's west frontage | Front built. Inside: six washers, four driers and a folding table. | Door on the court's walk | Enter | The machine panels: 洗濯, 乾燥, 分, which coins. |
| `sento` | Sento (銭湯) | the court's east frontage | Front built (the ゆ noren and the chimney). Inside: shoe lockers, the front desk, the men's and the women's baths. Dorm residents after work. | Door on the court's walk | Enter | 男 and 女 on the noren, the rules board, paying at the desk (大人). |
| `eric_dorm` | Eric’s dorm (社員寮) | `dorm_1` | Hall, stairs, 2F and room 203 built ([places.md](places.md), "Eric's dorm building"). The manager's room and the other floors are not. | Hall doors on the court | Enter | The manager's notices: rubbish days (燃えるゴミ, 月, 木). |
| `dorm_commons` | Dorm common building (共用棟) | `dorm_gallery` | Two storeys on the inner court: a lounge with a TV, a shared kitchen, a shelf of books. | Glazed door on the inner court | Enter | Kitchen rules, and names on the food in the fridge. |
| `inner_court` | Dorm inner court (中庭) | `dorm_inner_court` | Built as backdrop, on the map only. | Walks from the dorm row and between the blocks | Outside | Neighbours' evening greetings: こんばんは, お疲れさまです. |
| `dorm_blocks` | Dorm blocks (社員寮) | `dorm_1e`, `dorm_2`, `dorm_3`, `dorm_4`, `dorm_annex`, `dorm_entry`, `dorm_5`, `dorm_6` | Everyone else's dorms, three to nine storeys (built as backdrop). | Doors on the inner court, the dorm row and the back walk | Outside | Room and floor numbers: 号室, 階. |
| `north_residence` | North residence (北レジデンス) | `housing_n` | The roomier block on the cluster's quiet north edge, for senior staff, with a concierge desk. Walked past in `sports`: its door at the end of a short walk off the courts walk, its name on a low wall by the walk. | Door on a short walk from the courts walk | Outside | The concierge's polite Japanese: いらっしゃいませ, ご用件は. |
| `sea_terrace` | Sea terrace (海のテラス) | `sea_terrace` | Built and walked in `east_coast` ([places.md](places.md)): three benches looking out over the coast, a black pine in a raised bed, a drinks machine. | The dorm row's east end; the east coast walk north | Outside | Watching the ferry go out: 船, 島, 本土. |

### Sports and baths

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `gym` | Gym (体育館) | `gym` | The arched hall: badminton and basketball courts, a weights room, changing rooms. Clubs in the evening. Its outside is built and its front walked past in `sports` and `office_quarter` ([places.md](places.md)); inside the main doors its south end is walked as `gym`, as far as the divider net. | Main door on the sports lane | Enter | The club board and booking sheet: 曜日, 時間, club names. |
| `pool` | Pool and showers (プール) | `pool_hall`, `pool_deck` | An outdoor 25 m pool, and the low shower pavilion on its deck with separate men's and women's changing rooms. Open in summer, and in October for the swimming club's last session of the season. The deck, the pool and the pavilion's outside are built in `sports`, seen through the fence from the pool walk; through the pavilion's door the deck is walked as `pool` ([places.md](places.md)). | Pavilion door at the end of the pool walk | Enter | The pool rules (飛び込み禁止) and the changing room signs (男子, 女子). |
| `tennis_courts` | Tennis courts (テニスコート) | `court_hall`, `courts` | Two hard courts and a one-storey clubhouse; the courts and their fence are built in `east_coast` and `sports`, seen from the onsen path and the courts walk. The gate stands open and the west court is walked in `sports` ([places.md](places.md)); the clubhouse is a front. | Gate from the courts walk | Enter | Keeping score in Japanese numbers. |
| `onsen` | Onsen (温泉) | `onsen_main`, `onsen_pav` | On the east shore: a red entrance gate, a reception hall, separate men's and women's bath courtyards with outdoor pools over the sea, a pavilion up the slope. The gate, the court, the hall's front and the bath courtyards' fences are built in `east_coast` ([places.md](places.md)), the door shut. | The red gate at the end of the onsen path | Enter | Blue 男湯 and red 女湯 noren, the bathing rules, the milk machine (牛乳). |
| `east_coast_walk` | East coast walk (東の海岸道) | `east_coast_walk`, `onsen_path` | A path along the rocks from the dorms to the onsen; built and walked in `east_coast`. | The sea terrace at the south end; the courts walk at the west end | Outside | A trail sign: 温泉まで, metres. |

### Harbour

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `ferry_terminal` | Ferry terminal (フェリー乗り場) | `ferry_terminal`, `ferry_landing`, `ferry_pier` | A one-storey waiting room with a ticket window on the landing's north side; the mainland ferry ties up along the pier. A ticket clerk, staff going home for the weekend. Its front, the landing and the pier, with the ferry moored, are built and walked in `harbour` ([places.md](places.md)), the door shut. | Doors on the landing; the landing from the supply yard | Enter | The timetable (時刻表) and buying a ticket: 往復, 片道, 何時. |
| `supply_quay` | Supply quay (荷揚げ場) | `dock_shed`, `dock_hut`, `supply_yard`, `supply_pier` | Where the freighter unloads: a crane, containers, the warehouse (dock_shed) and the foreman's hut (dock_hut). Dock workers from Amakawa Logistics. The yard and the pier, with the freighter moored, are built and walked in `harbour`. | The office street's west end; the works lane north | Outside | Warehouse labels and counting out loud: いち, に, さん. |
| `harbour_office` | Harbour office (港の事務所) | `works_orange` | Two storeys on the supply yard's north edge by the landing: the harbourmaster and the ferry's paperwork. Its front is built in `harbour`, the door shut. | Door on the yard, beside the works lane's mouth | Enter | The weather board: 晴れ, 雨, 風, 欠航. |

### Old works

| Id | Place | Where | What and who | Ways in | Later | Day 2 hook |
|---|---|---|---|---|---|---|
| `old_factory` | Old factory (旧工場) | `factory` | Three storeys of disused works under saw-tooth roofs, the gates chained. Its front and gates are built in `works` ([places.md](places.md)). | Chained gates on the factory apron off the works yard | Outside | Faded signs: 安全第一, 立入禁止. |
| `old_power_plant` | Old power plant (旧発電所) | `nw_old`, `chimney` | The island's old power plant, four storeys and the tall chimney, disused. Its outside and the chimney are built in `works`, the door chained. | Door on the works lane | Outside | A switchboard's labels: 電源, 停止, 運転. |
| `server_hall` | Old server hall (旧サーバー棟) | `works_blue` | A low early-nineties server hall; some racks still hum. Its outside is built in `works`, the door shut. | Door on its east face, on the hall apron off the works yard | Enter | Old machine labels and the logbook: 再起動, 異常, dates. |
| `works_yard` | Works yard (工場跡の広場) | `works_yard`, `works_shed`, `works_kiosk` | Cracked concrete between the sheds; the gatehouse (works_kiosk) is empty. Built and walked in `works`. | The works lane and the works street | Outside | The gatehouse's visitor book: 名前, 時間, 用件. |
| `recycling_centre` | Recycling centre (リサイクルセンター) | `w2` | Three storeys where the island's rubbish is sorted. Its front is built in `works`, the door shut. | Door on the works street | Enter | The sorting chart (分別): 燃える, 燃えない, 缶, びん. |
| `research_lab` | Amakawa Research (天川研究所) | `n4` | Six storeys at the quarter's north edge: labs, and a library of the company's technical papers. Its front is built in `works`, the door shut. | Door at the end of the research walk | Enter | Door signs and the library card: 貸出, 返却日. |
