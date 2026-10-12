import test from 'node:test';
import assert from 'node:assert/strict';
import { gpuClass } from '../../js/perf/gpu.js';

const integrated = [
  'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Mesa Intel(R) Xe Graphics (TGL GT2)',
  'ANGLE (Intel, Intel(R) Arc(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'AMD Radeon 780M (radeonsi, gfx1103_r1, LLVM 17.0.6, DRM 3.57)',
  'ANGLE (AMD, Radeon Vega 8 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)',
  'Apple GPU',
];
const discrete = [
  'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Max, Unspecified Version)',
  'unknown',
];

test('integrated laptop GPUs are recognised', () => {
  for (const n of integrated) assert.deepEqual(gpuClass(n), { software: false, integrated: true }, n);
});
test('discrete GPUs and unknown names are not', () => {
  for (const n of discrete) assert.equal(gpuClass(n).integrated, false, n);
});
test('software GL is software, not integrated', () => {
  const c = gpuClass('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)');
  assert.deepEqual(c, { software: true, integrated: false });
});
