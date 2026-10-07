import assert from 'node:assert/strict';
import test from 'node:test';
import { fitMap, clampMap, mapFrame } from '../../js/ui/map/viewport.js';
import { BOUNDS, toView } from '../../js/ui/map/base.js';

test('island fit keeps every canonical corner between the real header and lower controls', () => {
  for (const [w, h, top, bottom] of [[1046, 860, 82, 682], [390, 754, 88, 586], [375, 510, 112, 342]]) {
    const frame = {left: 12, right: w - 12, top, bottom};
    const view = { w, h, ...fitMap(BOUNDS, {w,h}, frame) };
    clampMap(view, BOUNDS, frame, view.scale);
    for (const x of [BOUNDS.x0, BOUNDS.x1]) for (const z of [BOUNDS.z0, BOUNDS.z1]) {
      const [px,py] = toView(view,x,z);
      assert.ok(px >= frame.left - 1e-8 && px <= frame.right + 1e-8);
      assert.ok(py >= frame.top - 1e-8 && py <= frame.bottom + 1e-8);
    }
    const projected = toView(view, (BOUNDS.x0+BOUNDS.x1)/2, (BOUNDS.z0+BOUNDS.z1)/2);
    assert.ok(Math.abs(projected[1] - (top+bottom)/2) < 1e-8, 'asymmetric chrome must not recenter on the whole canvas');
  }
});

test('zoomed panning reaches each geographic edge at the usable viewport edge', () => {
  const frame = {left:12,right:378,top:88,bottom:586};
  const view = {w:390,h:754,scale:5,cx:-1e6,cz:-1e6};
  clampMap(view, BOUNDS, frame, 1);
  toView(view,BOUNDS.x0,BOUNDS.z0).forEach((value,i) => assert.ok(Math.abs(value-[frame.left,frame.top][i]) < 1e-8));
  view.cx=1e6;view.cz=1e6;
  clampMap(view, BOUNDS, frame, 1);
  toView(view,BOUNDS.x1,BOUNDS.z1).forEach((value,i) => assert.ok(Math.abs(value-[frame.right,frame.bottom][i]) < 1e-8));
});


test('expanded phone Places retains a usable island to the left of its toolbar', () => {
  const rect = {left:0, top:0, right:375, bottom:360, width:375, height:360};
  const element = (left, top, right, bottom) => ({hidden:false, offsetWidth:right-left, getBoundingClientRect:()=>({left,top,right,bottom})});
  const header = element(0,0,375,74), goal = element(12,88,363,144);
  const tools = element(268,160,363,348), scale = element(16,322,100,340);
  const frame = mapFrame(rect,[header,goal],[tools,scale],45,BOUNDS);
  const view = {w:375,h:360,...fitMap(BOUNDS,{w:375,h:360},frame)};
  const [left,top] = toView(view,BOUNDS.x0,BOUNDS.z0);
  const [right,bottom] = toView(view,BOUNDS.x1,BOUNDS.z1);
  assert.ok(right <= 256 && left >= 12 && top >= 156 && bottom <= 310);
  assert.ok(bottom-top >= 100, 'island must remain usable when the area above the tools is too short');
});
