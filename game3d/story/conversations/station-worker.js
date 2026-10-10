const leave = [{ do: 'gardenWorker', state: 'end' }, { end: true }];
const GARDEN = {
  speakers: { station_worker: { name: 'Grounds worker' } },
  on: {
    'talk:station_worker': 'garden_worker',
    'talk:garden_bench_1': 'garden_sit_1',
    'talk:garden_bench_2': 'garden_sit_2',
  },
  nodes: {
    garden_worker: [
      { do: 'gardenWorker', state: 'begin' },
      { do: 'face', who: 'eric', to: 'station_worker' },
      { do: 'face', who: 'station_worker', to: 'eric' },
      { do: 'cam', on: 'station_worker', zoom: 1.3, conversation: 'station_worker' },
      { if: 'garden_worker_busy', then: [{ go: 'garden_worker_busy' }] },
      {
        if: '!garden_worker_met && garden_bench_free',
        then: [
          { do: 'gesture', who: 'station_worker', kind: 'point', to: 'garden_free_bench' },
          {
            say: 'station_worker',
            name: 'Grounds worker',
            overheard: true,
            emo: 'polite',
            text: 'あ、こんにちは。そちらのベンチ、どうぞ。',
          },
          { say: 'eric', emo: 'warm', text: 'Oh, thanks.' },
        ],
        else: [
          {
            if: 'garden_worker_done',
            then: [
              {
                say: 'station_worker',
                name: 'Grounds worker',
                overheard: true,
                emo: 'casual',
                text: 'じゃあ、ちょっと休憩します。',
              },
            ],
            else: [
              { do: 'gesture', who: 'station_worker', kind: 'point', to: 'garden_next_patch' },
              {
                say: 'station_worker',
                name: 'Grounds worker',
                overheard: true,
                emo: 'casual',
                text: '次は、あっちを掃いてきます。',
              },
            ],
          },
        ],
      },
      { set: 'garden_worker_met' },
      ...leave,
    ],
    garden_worker_busy: [
      {
        say: 'station_worker',
        name: 'Grounds worker',
        overheard: true,
        emo: 'apologetic',
        text: 'すみません、これだけ集めてしまうので。',
      },
      { say: 'eric', emo: 'warm', text: 'Sure. I’ll leave you to it.' },
      ...leave,
    ],
    garden_sit_1: [{ do: 'sit', who: 'eric', at: 'garden_bench_1' }, { end: true }],
    garden_sit_2: [{ do: 'sit', who: 'eric', at: 'garden_bench_2' }, { end: true }],
  },
};

export default GARDEN;
export function withStationGarden(story) {
  return {
    ...story,
    speakers: { ...GARDEN.speakers, ...story.speakers },
    on: { ...GARDEN.on, ...story.on },
    nodes: { ...GARDEN.nodes, ...story.nodes },
  };
}
