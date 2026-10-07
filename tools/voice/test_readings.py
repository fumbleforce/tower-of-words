"""Run with the voice bench Python; uses its real Japanese reading library."""
import unittest
import pykakasi
from readings import reading_target, strict_reading


class NameReadingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dictionary = pykakasi.kakasi()

    def kana(self, text):
        return ''.join(part['hira'] for part in self.dictionary.convert(text)).strip('。')

    def test_canonical_name_accepts_kana_and_exact_asr_homophone(self):
        self.assertEqual(reading_target('玖路さん。'), 'クロさん。')
        for heard in ['黒さん', 'クロさん', 'くろさん', 'クロサン']:
            with self.subTest(heard=heard):
                self.assertTrue(strict_reading('玖路さん。', heard, self.kana))

    def test_written_similarity_cannot_rescue_a_wrong_name(self):
        for heard in ['急路さん', 'ヒュロさん', 'キュロさん', 'クロサ']:
            with self.subTest(heard=heard):
                self.assertFalse(strict_reading('玖路さん。', heard, self.kana))

    def test_unrelated_names_and_sentences_keep_normal_checking(self):
        for text in ['黒田さん。', 'こんにちは。', '玖路さんも来ますか。']:
            self.assertEqual(reading_target(text), text)
            self.assertIsNone(strict_reading(text, 'anything', self.kana))


if __name__ == '__main__':
    unittest.main()
