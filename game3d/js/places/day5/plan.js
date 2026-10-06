// Monday's office day. The unavailable canteen terrace stays offstage.
import { PLANS as SATURDAY } from '../day3/plan.js';
import { benchNear } from '../day3/seats.js';
const home = { home: true };
export const PLANS = {
  gate: { ...SATURDAY.gate, tama: { morning: home } },
  train: {
    guard: { morning: home, lunch: home, afternoon: home },
    kuro: {},
    aoi: {},
    rei: {},
    kuroda: {},
  },
  forecourt: { kuro: { morning: home, afternoon: home }, tama: {} },
  office: {
    mio: {
      morning: { at: [5.1, -2.8], face: [5.5, -3.4] },
      lunch: { at: [4.7, -2], face: [5.2, -2] },
      afternoon: { seat: 'mio_seat' },
      evening: { at: [-3.75, -0.8], face: [-4.62, -2.3] },
    },
    kenji: {
      morning: home,
      afternoon: home,
      evening: { at: [-4.3, -0.9], face: [-4.62, -2.3] },
    },
    mori: {
      morning: { at: [2.3, -2.5], face: [2.9, -3] },
      afternoon: { at: [2.3, -2.5], face: [2.9, -3] },
      evening: { at: [-5.95, -0.7], face: [-4.62, -2.3] },
    },
    emi: { morning: home },
    aoi: {},
    rei: {},
    tama: { lunch: home, afternoon: home },
  },
  plaza: { aoi: { lunch: { at: [18.1, -6.6], face: [18.1, -5.7] } }, tama: {} },
  shotengai: {
    mori: {},
    kenji: {},
    kuroda: {},
    kuro: {},
    aoi: {},
    rei: { lunch: { at: [1.45, -1.8], face: [2.25, -1.8] } },
  },
  east_coast: {
    emi: {},
    mio: {},
    kuroda: {},
    aoi: {},
    rei: { evening: { seat: (P) => benchNear(P, [0, 0]) } },
  },
  dorm_commons: {
    kenji: {},
    mori: { lunch: { at: [0.2, -1.4], face: [0.4, -2.5] } },
    aoi: {
      evening: { seat: () => ({ x: -0.4, z: -1.75, top: 0.25, ry: Math.PI }) },
    },
  },
  karaoke_booth: { kenji: { lunch: { at: [0.6, -1.1], face: [0, -2.1] } } },
  karaoke: { kuroda: {} },
  gym: { attendant: SATURDAY.gym.attendant, mori: {}, emi: {}, kuro: {} },
  pool: { emi: {}, kuro: {}, attendant: {}, member: {} },
  sports: { rei: {}, aoi: {}, member: {} },
  dorm_court: { tama: { evening: { at: [-2.5, 0.6], pose: 'sit' } } },
};
