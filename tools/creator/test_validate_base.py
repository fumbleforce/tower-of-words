import copy
import unittest

from validate_base import validate


def tetra(offset=0):
    points = [(offset, 0, 0), (offset+1, 0, 0), (offset, 1, 0), (offset, 0, 1)]
    triangles = [(0, 2, 1), (0, 1, 3), (0, 3, 2), (1, 2, 3)]
    return {'T': 4, 'pos': [v for face in triangles for i in face for v in points[i]],
            'uv': [0, 0] * 12, 'si': [0, 0, 0, 0] * 12, 'sw': [1, 0, 0, 0] * 12}


def reference():
    data = tetra()
    data.update(id='fixture', bones=['hand', 'head'], P={'hand': [0, 0, 0], 'head': [4, 0, 0]}, height=99)
    # The second region makes a whole-body box broad enough to hide a limb
    # displaced into the head. Source topology is deliberately irrelevant here.
    data['pos'] += [4, 0, 0, 4, 1, 0]
    data['si'] += [1, 0, 0, 0] * 2
    data['sw'] += [1, 0, 0, 0] * 2
    return data


class BaseValidationTests(unittest.TestCase):
    def test_welds_face_corners(self):
        result = validate(tetra(), 24)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['metrics']['welded_vertices'], 4)

    def test_rounded_unit_normals_pass(self):
        data = tetra()
        data['normal'] = [0.57735, -0.57735, 0.57735] * 12
        result = validate(data, 24)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['metrics']['nonunit_normal_vertices'], 0)
        self.assertLess(result['metrics']['normal_max_unit_error'], 0.001)

    def test_malformed_optional_normals_fail(self):
        for value in [None, [], [1, 0, 0] * 11, [1, 0, 0] * 13,
                      [float('nan'), 0, 0] * 12, [float('inf'), 0, 0] * 12,
                      [True, 0, 0] * 12, ['1', 0, 0] * 12]:
            with self.subTest(value=value):
                data = tetra()
                data['normal'] = value
                result = validate(data, 24)
                self.assertFalse(result['ok'])
                self.assertTrue(any('normal' in error for error in result['errors']))

    def test_zero_or_scaled_normal_fails_without_masking_topology(self):
        for normal in [[0, 0, 0], [0, 0.98, 0], [0, 1.02, 0], [1e300, 0, 0]]:
            with self.subTest(normal=normal):
                data = tetra()
                data['normal'] = [0, 1, 0] * 12
                data['normal'][0:3] = normal
                result = validate(data, 24)
                self.assertFalse(result['ok'])
                self.assertEqual(result['metrics']['nonunit_normal_vertices'], 1)
                self.assertEqual(result['metrics']['boundary_edges'], 0)

    def test_missing_face_is_hole(self):
        data = tetra()
        data['T'] -= 1
        for key, stride in [('pos', 9), ('uv', 6), ('si', 12), ('sw', 12)]:
            data[key] = data[key][:-stride]
        result = validate(data, 24)
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['boundary_edges'], 3)

    def test_two_closed_bodies_fail(self):
        data, other = tetra(), tetra(3)
        data['T'] += other['T']
        for key in ['pos', 'uv', 'si', 'sw']:
            data[key] += other[key]
        result = validate(data, 24)
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['components'], 2)
        self.assertEqual(result['metrics']['boundary_edges'], 0)

    def test_inverted_face_fails(self):
        data = tetra()
        data['pos'][0:6] = data['pos'][3:6] + data['pos'][0:3]
        self.assertEqual(validate(data, 24)['metrics']['inconsistent_edges'], 3)

    def test_pinched_vertex_fails(self):
        data, other = tetra(), tetra()
        other['pos'] = [-v for v in other['pos']]
        data['T'] += other['T']
        for key in ['pos', 'uv', 'si', 'sw']:
            data[key] += other[key]
        result = validate(data, 24)
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['components'], 1)
        self.assertGreater(result['metrics']['nonmanifold_vertices'], 0)

    def test_export_rounding_collapse_fails(self):
        data = tetra()
        data['pos'][0:9] = data['pos'][0:3] * 3
        result = validate(data, 24)
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['degenerate_triangles'], 1)

    def test_duplicate_face_fails(self):
        data = tetra()
        data['T'] += 1
        for key, stride in [('pos', 9), ('uv', 6), ('si', 12), ('sw', 12)]:
            data[key] += data[key][:stride]
        result = validate(data, 24)
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['duplicate_triangles'], 1)

    def test_bad_data_and_weights_fail(self):
        for key, value in [('pos', float('nan')), ('si', 24), ('si', 0.5),
                           ('sw', -1), ('sw', 0.5)]:
            with self.subTest(key=key, value=value):
                data = copy.deepcopy(tetra())
                data[key][0] = value
                self.assertFalse(validate(data, 24)['ok'])
        data = tetra()
        data['pos'].pop()
        self.assertFalse(validate(data, 24)['ok'])

    def test_closed_body_with_skin_seam_fails(self):
        data = tetra()
        data['si'][0] = 1  # Same position elsewhere still follows bone 0.
        result = validate(data, 24)
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['boundary_edges'], 0)
        self.assertEqual(result['metrics']['inconsistent_skin_vertices'], 1)

    def test_equivalent_weight_slots_pass(self):
        data = tetra()
        # Split one influence into two slots; padding indices have zero weight.
        data['si'][0:4] = [23, 0, 0, 5]
        data['sw'][0:4] = [0, 0.4, 0.6, 0]
        self.assertTrue(validate(data, 24)['ok'])

    def test_export_weight_precision_is_tolerated(self):
        data = tetra()
        data['sw'][0] = 0.9999
        self.assertTrue(validate(data, 24)['ok'])

    def test_source_check_is_optional(self):
        self.assertTrue(validate(tetra(30), 2)['ok'])
        result = validate(tetra(30), 2, reference())
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['source_bounds_outliers'], 4)

    def test_closed_stretched_rest_pose_fails_envelope(self):
        data = tetra()
        data['pos'] = [v * 3 if i % 3 == 1 else v for i, v in enumerate(data['pos'])]
        self.assertTrue(validate(data, 2)['ok'])  # Topology alone cannot see it.
        result = validate(data, 2, reference())
        self.assertFalse(result['ok'])
        self.assertEqual(result['metrics']['source_bounds_outliers'], 1)

    def test_wrong_anatomical_region_inside_whole_bounds_fails(self):
        result = validate(tetra(3), 2, reference())
        self.assertEqual(result['metrics']['source_bounds_outliers'], 0)
        self.assertEqual(result['metrics']['bone_envelope_outliers'], 4)

    def test_rebuilt_skin_has_height_relative_padding(self):
        result = validate(tetra(0.07), 2, reference())
        self.assertTrue(result['ok'], result)
        self.assertAlmostEqual(result['metrics']['source_envelope_padding'], 0.08)
        self.assertFalse(validate(tetra(0.07), 2, reference(), source_margin=0.01)['ok'])

    def test_envelope_aggregates_duplicate_weight_slots(self):
        data = tetra()
        data['sw'] = [0.25, 0.25, 0.25, 0.25] * 12
        self.assertTrue(validate(data, 2, reference())['ok'])

    def test_joint_blend_can_fit_either_substantial_bone(self):
        data = tetra()
        data['si'], data['sw'] = [0, 1, 0, 0] * 12, [0.5, 0.5, 0, 0] * 12
        self.assertTrue(validate(data, 2, reference())['ok'])

    def test_unweighted_source_joint_uses_adjacent_joint_bounds(self):
        source = reference()
        source['bones'].append('spare')
        source['P'].update(hand=[1, 0, 0], head=[0, 1, 1], spare=[0.5, 0.5, 0.5])
        source['parent'] = {'hand': None, 'spare': 'hand', 'head': 'spare'}
        data = tetra()
        data['si'] = [2, 0, 0, 0] * 12
        result = validate(data, 3, source)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['metrics']['bone_envelope_joint_fallback_bones'], ['spare'])
        # The fallback stays local; it does not grant the whole source box.
        data['pos'] = tetra(3)['pos']
        result = validate(data, 3, source)
        self.assertEqual(result['metrics']['source_bounds_outliers'], 0)
        self.assertEqual(result['metrics']['bone_envelope_outliers'], 4)

    def test_envelope_rejects_bad_sources_without_crashing(self):
        for key, value in [('pos', [float('nan'), 0, 0]), ('si', []), ('sw', []),
                           ('bones', ['hand', 'hand']), ('P', {}), ('P', None)]:
            with self.subTest(key=key, value=value):
                source = reference()
                source[key] = value
                self.assertFalse(validate(tetra(), 2, source)['ok'])
        data = tetra()
        data['source'] = 'wrong-model'
        self.assertFalse(validate(data, 2, reference())['ok'])
        self.assertFalse(validate(tetra(), 2, reference(), source_margin=float('nan'))['ok'])


if __name__ == '__main__':
    unittest.main()
