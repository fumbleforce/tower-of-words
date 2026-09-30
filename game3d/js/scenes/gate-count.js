// The gate's head-count screen (scenes/lobby.js gate arch): one little person and a 1, or, when Hamada tailgates, a
// person and a briefcase and a red 2, because it counts his case as a second person (story/gate.js bench_wait).
import { textTexture, JP_FONT } from '../props.js';

export function countTex(col, n) {
  return textTexture(
    (g, W, H) => {
      g.fillStyle = '#15181d';
      g.fillRect(0, 0, W, H);
      g.fillStyle = col;
      const person = (x) => {
        g.beginPath();
        g.arc(x, 44, 17, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(x - 26, 118);
        g.quadraticCurveTo(x - 26, 68, x, 68);
        g.quadraticCurveTo(x + 26, 68, x + 26, 118);
        g.fill();
      };
      // a briefcase standing where the second person would be: body, a clasp line, and the handle on top
      const briefcase = (x) => {
        g.fillRect(x - 26, 70, 52, 48);
        g.fillRect(x - 11, 56, 22, 6);
        g.fillRect(x - 11, 56, 6, 16);
        g.fillRect(x + 5, 56, 6, 16);
        g.fillStyle = '#15181d';
        g.fillRect(x - 26, 86, 52, 3);
        g.fillStyle = col;
      };
      if (n === 2) {
        person(46);
        briefcase(116);
      } else person(82);
      g.font = '700 104px ' + JP_FONT;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n), 196, 76);
      if (n === 2) {
        g.fillRect(0, 0, W, 6);
        g.fillRect(0, H - 6, W, 6);
      }
    },
    256,
    140,
  );
}
