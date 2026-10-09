// The anime trial's light per phase of the day (#383). The phase comes from the lighting kit's period table
// (kit/light/looks.js phaseOf), and a place on a light rig hands it over with the sun's direction on every change
// (rig.listen); a place not yet on a rig is followed through its onPeriod. Linear multipliers:
//   shade   the shadow and ambient side (cool, never just darker)    lit   the sunlit side (warm)
//   sat     the shadow side's saturation    satAll  the whole surface's    mid  the middle tone as a share of full sun
//   water   the fountain's colours: shallow, deep and the sky it mirrors (sRGB)
import { phaseOf } from '../../kit/light/looks.js';

export const ANIME_LOOKS = {
  day: {
    shade: [0.88, 0.98, 1.24],
    lit: [1.03, 1.0, 0.94],
    sat: 1.25,
    satAll: 1.16,
    mid: 0.62,
    water: { shallow: '#6fd6d6', deep: '#1f8fa6', sky: '#cdeef0', foam: '#f4fbfb' },
  },
  dusk: {
    shade: [0.84, 0.88, 1.26],
    lit: [1.08, 0.98, 0.88],
    sat: 1.2,
    satAll: 1.12,
    mid: 0.58,
    water: { shallow: '#4f9fb4', deep: '#1b4f73', sky: '#d7b3a8', foam: '#e9ecf2' },
  },
};

export const animeLook = (period) => ANIME_LOOKS[phaseOf(period)] || ANIME_LOOKS.day;
