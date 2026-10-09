import { withStationGarden } from '../conversations/station-worker.js';
import { BAKERY_OPEN, KONBINI_OPEN } from '../../js/gameplay/shop-hours.js';
import { place } from './shared.js';
export default withStationGarden(
  place(
    {
      forecourt: ['talk:office_lane', 'zone:office_exit'],
      plaza: ['talk:plaza_lane', 'zone:plaza_exit'],
      karaoke: ['talk:karaoke'],
    },
    {
      labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
      on: {
        'talk:store_door': 'konbini_enter',
        'talk:bakery_door': 'bakery_enter',
        'talk:mori': 'd4_mori',
        'talk:kenji': 'd4_kenji',
        'talk:kuroda': 'd4_hamada',
        'talk:kuro': 'd4_kuro',
        'talk:bakery': 'd4_bakery',
        'talk:game_centre': 'd4_arcade',
        'talk:store': 'd4_store',
      },
      nodes: {
        konbini_enter: [{ if: KONBINI_OPEN, then: [{ go: 'konbini_open' }], else: ['> The shop is closed.'] }],
        konbini_open: [{ do: 'trip', to: 'konbini' }],
        bakery_enter: [{ if: BAKERY_OPEN, then: [{ go: 'bakery_open' }], else: ['> The bakery is closed.'] }],
        bakery_open: [{ do: 'trip', to: 'bakery' }],
        d4_mori: [
          { say: 'mori', overheard: true, emo: 'warm', text: 'こんにちは。これから、お昼を買いに。' },
          { do: 'gesture', who: 'mori', kind: 'point', to: 'bakery' },
          { say: 'eric', emo: 'warm', text: 'I’ll let you get your lunch.' },
        ],
        d4_kenji: [
          {
            if: "period == 'evening'",
            then: [{ say: 'kenji', emo: 'sheepish', text: 'Game... I win!' }, { say: 'kenji', emo: 'sheepish', overheard: true, text: 'もう帰ります。また負けるから。' }],
            else: [
              { say: 'kenji', emo: 'bright', overheard: true, text: 'またカレーパンです。', clear: ['カレーパン'] },
              { say: 'kenji', emo: 'bright', text: 'Yesterday... hot! Today, wait.' },
            ],
          },
        ],
        d4_hamada: [
          {
            say: 'kuroda',
            overheard: true,
            emo: 'polite',
            text: '{sumimasen}。パンを取りに来ただけなんです。',
            clear: ['パン'],
          },
          { do: 'gesture', who: 'kuroda', kind: 'point', to: 'bakery' },
          { say: 'eric', emo: 'warm', text: 'Oh, am I in the way? Sorry.' },
        ],
        d4_kuro: [
          {
            if: 'd3_kuro_intro',
            then: [
              { say: 'kuro', name: 'Kuro', overheard: true, emo: 'amused', text: '洗剤、洗剤……' },
              { say: 'kuro', name: 'Kuro', overheard: true, emo: 'dry', text: '言ってないと忘れるんです。' },
            ],
            else: [
              { say: 'kuro', overheard: true, emo: 'amused', text: '洗剤、洗剤……' },
              { say: 'kuro', overheard: true, emo: 'dry', text: '言ってないと忘れるんです。' },
            ],
          },
        ],
        d4_bakery: ['> “Bread reserved by phone is on the shelf behind the till.”'],
        d4_arcade: [{ say: 'eric', emo: 'curious', text: 'I can hear that machine from halfway down the street.' }],
        d4_store: [
          {
            if: 'konbini_visited',
            then: ['> Milk cartons · 150 yen'],
            else: [
              {
                say: 'eric',
                emo: 'casual',
                text: 'I should try a small carton first. I don’t know which one I like yet.',
              },
            ],
          },
        ],
      },
    },
  ),
);
