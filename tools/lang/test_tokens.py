"""Real-dictionary token regressions; run with ~/ai/lang/.venv/bin/python.

Uses tools/lang/raw from fetch.sh (or its existing cache); never downloads data.
"""
import unittest
from pathlib import Path

from tokens import Tokenizer, detect_grammar


class CommandReadingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = Path(__file__).parent / 'raw'
        if not (raw / 'cache.pickle').exists() and not (raw / 'jmdict-eng.json').exists():
            raise unittest.SkipTest('Local language dictionaries are absent; run tools/lang/fetch.sh first')
        cls.tokenizer = Tokenizer()

    def test_known_command_repairs(self):
        for text, surface, base in (
            ('立て。', '立て', '立つ'),
            ('立てよ。', '立て', '立つ'),
            ('動け。', '動け', '動く'),
            ('開け。', '開け', '開く'),
            ('窓を開け。', '開け', '開く'),
        ):
            with self.subTest(text=text):
                tokens = self.tokenizer.annotate(text)
                token = next(t for t in tokens if t['s'] == surface)
                self.assertEqual(token['p'], 'v')
                self.assertEqual(token['b'], base)
                self.assertTrue(token.get('_cmd'))
                self.assertIn('imperative', detect_grammar(tokens))

    def test_kana_nouns_are_not_commands(self):
        for noun in ('まえ', 'たけ', 'あめ', 'こえ', 'ふね', 'むね', 'たて'):
            for suffix in ('。', '！'):
                text = noun + suffix
                with self.subTest(text=text):
                    tokens = self.tokenizer.annotate(text)
                    self.assertEqual(tokens[0]['s'], noun)
                    self.assertIn(tokens[0]['p'], ('n', 'name'))
                    self.assertFalse(any(t.get('_cmd') for t in tokens))
                    self.assertNotIn('imperative', detect_grammar(tokens))

    def test_noncommand_verb_forms_are_preserved(self):
        for text, grammar in (
            ('立てる。', 'dict-form'),
            ('動けない。', 'potential'),
            ('開けて。', 'te-request'),
        ):
            with self.subTest(text=text):
                tokens = self.tokenizer.annotate(text)
                self.assertFalse(any(t.get('_cmd') for t in tokens))
                self.assertNotIn('imperative', detect_grammar(tokens))
                self.assertIn(grammar, detect_grammar(tokens))

    def test_command_sequence(self):
        tokens = self.tokenizer.annotate('走れ、立て、歌え。')
        self.assertEqual([t['p'] for t in tokens if t['p'] != 'punct'], ['v', 'v', 'v'])
        self.assertIn('imperative', detect_grammar(tokens))


if __name__ == '__main__':
    unittest.main()
