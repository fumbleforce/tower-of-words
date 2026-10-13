import { found } from '../../finds/index.js';
import { showFind } from '../../ui/finds-view.js';
import { pt } from '../../scenes/works/plan.js';
// A retained illustration can be compared with the three existing instruments.
const POINTS = { box: [-42.9, 1.42, -108.4], rain: [-40, 0.3, -108.8], wind: [-39.6, 2.3, -106.05] };
export function worksReferences(game, P) {
  let owned = null,
    generation = 0;
  const release = () => {
    generation++;
    if (P.cam.close === owned) P.cam.release();
    owned = null;
  };
  const leave = P.leave;
  P.leave = (...a) => {
    release();
    return leave?.(...a);
  };
  return {
    async act(a) {
      if (game.place !== P) return false;
      if (a.state === 'release') {
        release();
        return true;
      }
      if (a.state === 'plan') {
        if (!found('research_weather_plan') && !found('research_weather_shapes')) return false;
        const token = generation;
        await showFind(found('research_weather_plan') ? 'research_weather_plan' : 'research_weather_shapes');
        return game.place === P && token === generation;
      }
      const point = POINTS[a.state];
      if (!point) throw new Error('Unknown weather referent');
      const token = generation;
      await game.hooks.walk({ who: 'eric', to: P.spots.weather_station });
      if (game.place !== P || token !== generation) return false;
      game.hooks.face({ who: 'eric', to: pt([point[0], point[2]]) });
      P.cam.closeOn(pt([point[0], point[2]]), 3.2, point[1]);
      owned = P.cam.close;
      return true;
    },
  };
}
