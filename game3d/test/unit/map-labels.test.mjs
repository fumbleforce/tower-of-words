import assert from 'node:assert/strict';
import test from 'node:test';
import { placeLabels } from '../../js/ui/map/labels.js';
const hit = (a,b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
test('phone labels avoid pin touch targets, each other, screen edges and controls', () => {
  const points = [
    {id:'forecourt',x:90,y:220,width:90}, {id:'gate',x:62,y:245,width:115},
    {id:'plaza',x:230,y:225,width:120}, {id:'lane',x:310,y:200,width:95},
  ];
  const controls = {x0:280,x1:385,y0:290,y1:445};
  const results = placeLabels(points,390,450,86,[controls]);
  const boxes=[];
  for (const r of results.filter(r=>!r.hidden)) {
    const p=points.find(p=>p.id===r.id);
    const box={x0:p.x+r.dx,x1:p.x+r.dx+p.width,y0:p.y+r.dy-15,y1:p.y+r.dy+15};
    assert.ok(box.x0>=8 && box.x1<=382 && box.y0>=86 && box.y1<=442);
    assert.ok(!hit(box,controls));
    for(const o of points) assert.ok(!hit(box,{x0:o.x-23,x1:o.x+23,y0:o.y-23,y1:o.y+23}));
    for(const o of boxes) assert.ok(!hit(box,o));
    boxes.push(box);
  }
  assert.ok(boxes.length>=2,'crowded local map retains useful labels');
  assert.equal(results[0].hidden,undefined,'selected destination has label priority');
});
test('crowded or covered labels hide without moving their geographic pin', () => {
  const points=[{id:'covered',x:90,y:150,width:150}];
  assert.deepEqual(placeLabels(points,180,180,86,[{x0:0,x1:180,y0:0,y1:180}]),[{id:'covered',hidden:true}]);
  assert.deepEqual(points,[{id:'covered',x:90,y:150,width:150}]);
});
