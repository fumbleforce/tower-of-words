"""tools/comfy_log.py on three saved workflows, and comfy.run() when the logger fails.

Run: python3 -m unittest discover -s tools -p 'test_comfy_log.py'
"""
import json
import os
import tempfile
import unittest
from unittest import mock

import comfy
import comfy_log

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'testdata', 'comfy-workflows')


def load(name):
    with open(os.path.join(DATA, name + '.json'), encoding='utf-8') as f:
        return json.load(f)


def fake_get(path):
    if path.startswith('/history'):
        img = {'filename': 'a.png', 'subfolder': '', 'type': 'output'}
        return json.dumps({'p1': {'status': {}, 'outputs': {'9': {'images': [img]}}}}).encode()
    return b'PNGDATA'


class ParseTests(unittest.TestCase):
    def test_text_to_image_with_a_lora(self):
        r = comfy_log.parse_workflow(load('anima-lora'))
        self.assertEqual((r['positive'], r['negative']), ('1girl, red scarf', 'bad hands'))
        self.assertEqual((r['seed'], r['steps'], r['cfg'], r['sampler'], r['scheduler']), (4242, 30, 5.0, 'euler_ancestral', 'normal'))
        self.assertEqual((r['model_file'], r['w'], r['h'], r['mode']), ('rdbtAnima.safetensors', 896, 1152, 'txt2img'))
        self.assertEqual(r['extras'], ['lora detail.safetensors @ 0.6'])

    def test_image_to_image_checkpoint(self):
        r = comfy_log.parse_workflow(load('sdxl-refine'))
        self.assertEqual((r['model_file'], r['mode'], r['src_image'], r['denoise']), ('sdxlModel.safetensors', 'img2img', 'ref.png', 0.4))
        self.assertEqual((r['positive'], r['negative'], r['seed']), ('1girl, smiling', 'blurry', 77))

    def test_lllite_guided_image_to_image(self):
        r = comfy_log.parse_workflow(load('anima-lllite-img2img'))
        self.assertEqual((r['mode'], r['src_image'], r['denoise'], r['seed']), ('img2img', 'empty.png', 0.5, 7001))
        self.assertEqual(r['extras'], ['patch anima-lllite-lineart-1.safetensors', 'lllite strength 0.9 until 0.7'])

    def test_odd_input_does_not_raise(self):
        self.assertEqual(comfy_log.parse_workflow({}), {})
        self.assertEqual(comfy_log.parse_workflow({'1': {'class_type': 'KSampler', 'inputs': {'positive': ['9', 0]}}})['positive'], '')
        self.assertEqual(comfy_log.parse_workflow(None), {})


class RunTests(unittest.TestCase):
    def run_once(self, **patches):
        out = os.path.join(tempfile.mkdtemp(prefix='comfy-log-test-'), 'x.png')
        with mock.patch.object(comfy, 'yield_to_dashboard'), mock.patch.object(comfy, '_post', return_value={'prompt_id': 'p1'}), \
                mock.patch.object(comfy, '_get', side_effect=fake_get):
            with mock.patch.multiple(comfy, **patches) if patches else mock.patch.object(comfy, 'time', comfy.time):
                return comfy.run(load('anima-lora'), out), out

    def test_run_saves_the_image_and_logs_it(self):
        log = mock.Mock()
        res, out = self.run_once(log_render=log)
        self.assertEqual(res, out)
        log.assert_called_once()

    def test_run_survives_a_logger_that_raises_inside(self):
        with mock.patch('comfy_log.parse_workflow', side_effect=RuntimeError('boom')):
            res, out = self.run_once()
        self.assertEqual(res, out)
        with open(out, 'rb') as f:
            self.assertEqual(f.read(), b'PNGDATA')


if __name__ == '__main__':
    unittest.main()
