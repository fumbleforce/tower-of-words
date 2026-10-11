import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeComposition, assembleComposition} from '../web/image-compose.js';
import {stageWords, stageSummary, placeOf, cameraKind, cameraSetup, figures, poseShape, stageCast} from '../web/image-stage.js';
import {exampleJob} from '../web/block-examples.js';

const rec = (id, data) => ({id, v: 1, data});
const presets = {
  character: [rec('ana', {name: 'Ana', gender: 'female', look: 'short hair'}), rec('ben', {name: 'Ben', gender: 'male', look: 'long hair'}),
    rec('extra', {name: 'Unnamed man', generic: true, gender: 'male'})],
  style: [rec('house', {name: 'House', quality: 'best quality'})], model: [rec('m', {name: 'M', file: 'm.safetensors'})],
  framing: [rec('landscape', {name: 'Landscape', w: 1216, h: 832})], negative: [],
  camera: [rec('close', {name: 'Close-up', prompt: 'close-up'}), rec('above', {name: 'From above', prompt: 'seen from above'}),
    rec('cowboy-shot', {name: 'Cowboy shot', prompt: 'cowboy shot', group: 'shot', diagram: 'thighs'}), rec('telephoto', {name: 'Telephoto', prompt: 'telephoto lens', group: 'lens', diagram: 'long'}),
    rec('pov', {name: 'Point of view', prompt: 'pov'})],
  pose: [rec('seated', {name: 'Seated', text: 'seated on a bench'})], location: [rec('office', {name: 'Office', text: 'in an office'})], light: [rec('evening', {name: 'Evening', text: 'evening light'})],
};
const people = [{id: 'ana', name: 'Ana', female: true}, {id: 'ben', name: 'Ben', female: false}];

test('camera blocks sort into rows by their own group, else by the ids the dashboard shipped with', () => {
  assert.deepEqual(cameraKind(presets.camera[0]), {group: 'shot', diagram: 'head'});
  assert.deepEqual(cameraKind(presets.camera[1]), {group: 'angle', diagram: 'high'});
  assert.deepEqual(cameraKind(presets.camera[2]), {group: 'shot', diagram: 'thighs'});
  assert.deepEqual(cameraKind(presets.camera[4]), {group: 'other', diagram: 'pov'});
  assert.deepEqual(cameraKind(rec('mine', {name: 'Mine', prompt: 'x'})), {group: 'other', diagram: ''});
  assert.deepEqual(cameraSetup({cameras: ['cowboy-shot', 'above', 'telephoto']}, presets), {shot: 'thighs', angle: 'high', lens: 'long', tilt: false, chosen: true});
});

test('nothing about the stage is said until the author places, turns or describes someone', () => {
  assert.deepEqual(stageWords({}, people), {people: '', light: '', mood: ''});
  assert.equal(stageSummary({}, people), '');
  assert.deepEqual([placeOf({}, 'ana', 0, 2).x, placeOf({}, 'ben', 1, 2).x], [0.22, 0.78]);
});

test('placement, facing, gaze, expression, heights, distance and contact become prompt words', () => {
  const stage = {people: {ana: {x: 0.2, d: 0, placed: true, facing: 'partner', gaze: 'partner', expression: 'smiling'},
    ben: {x: 0.8, d: 0.7, placed: true, facing: 'away', gaze: 'down', height: 'tall'}}, contact: 'her hand on his shoulder', lightFrom: 'back', mood: 'tense'};
  const w = stageWords({stage}, people);
  assert.equal(w.people, 'Ana on the left in the foreground, turned toward Ben, looking at Ben, smiling. Ben on the right in the background, his back to the viewer, looking down. '
    + 'Ben is taller than Ana. They stand far apart. Her hand on his shoulder');
  assert.equal(w.light, 'backlighting, rim light');
  assert.equal(w.mood, 'tense mood');
  assert.equal(stageSummary({stage}, people), 'Placed: Ana left, in front. Ben right, at the back.');
  // one person: where in the picture, no depth
  assert.equal(stageWords({stage: {people: {ana: {x: 0.8, d: 0.9, placed: true}}}}, people.slice(0, 1)).people, 'Ana on the right of the picture');
});

test('the stage goes into the prompt after the action and is kept with the composition, so a saved shot reopens with it', () => {
  const stage = {people: {ana: {x: 0.2, d: 0, placed: true}, ben: {x: 0.8, d: 0.3, placed: true, gaze: 'viewer'}}, lightFrom: 'left', mood: 'calm'};
  const c = normalizeComposition({characters: ['ana', 'ben'], model: 'm', style: 'house', framing: 'landscape', scene: 'Ana hands Ben a mug.', environment: 'office', light: 'evening', stage});
  const body = assembleComposition(c, presets, 'scene');
  assert.match(body.positive, /Ana hands Ben a mug\. Ana on the left in the foreground\. Ben on the right further back, looking at the viewer\. They stand far apart\. in an office\. evening light\. light coming from the left\. calm mood/);
  assert.deepEqual(body.compose.stage, stage);
  const reopened = normalizeComposition(JSON.parse(JSON.stringify(body.compose)));
  assert.deepEqual(reopened.stage, stage);
  assert.notEqual(reopened.stage, body.compose.stage);
  assert.equal(assembleComposition(reopened, presets, 'scene').positive, body.positive);
});

test('the unnamed person is "the other person" on the stage', () => {
  assert.deepEqual(stageCast({characters: ['ana'], man: true}, presets).map(p => p.name), ['Ana', 'the other person']);
});

test('the drawing follows the shot: a nearer person is bigger, a further one smaller, a pose reads from its words', () => {
  const c = {characters: ['ana', 'ben'], cameras: ['cowboy-shot'], stage: {people: {ben: {d: 0.8, placed: true}}}};
  const geo = figures(c, presets, people);
  const ana = geo.people.find(p => p.id === 'ana'), ben = geo.people.find(p => p.id === 'ben');
  assert.ok(ana.unit > ben.unit);
  assert.equal(geo.people.at(-1).id, 'ana', 'the nearest is drawn last');
  assert.equal(poseShape('seated on a bench'), 'sit');
  assert.equal(poseShape('lying down on the sofa'), 'lie');
  assert.equal(poseShape('Standing naturally'), 'stand');
});

test('an example picture is a small stand-in render tagged with its block', () => {
  const body = exampleJob('location', 'office', presets);
  assert.match(body.positive, /an empty place, no people\. in an office/);
  assert.deepEqual([body.w, body.h, body.steps, body.count], [640, 512, 20, 1]);
  assert.equal(body.compose.example, 'location:office');
  assert.deepEqual(body.presets.location, {id: 'office', v: 1});
  assert.equal(exampleJob('pose', 'seated', presets).compose.example, 'pose:seated');
});
