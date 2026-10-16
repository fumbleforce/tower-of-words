#!/usr/bin/env python3
"""The public bible's picture rule (tools/bible/pages.py): which items publish pictures, and what the others keep.

    python3 tools/bible/pages_test.py
"""
import datetime
import json
import os
import tempfile
import unittest

import pages


def write(base, folder, rid, name, data):
    d = os.path.join(base, folder, rid)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), 'w', encoding='utf-8') as f:
        json.dump(data, f)


class PublishedRule(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_open_reviews_and_the_newest_showcase_entries_publish_pictures(self):
        write(self.base, 'reviews', 'open-one', 'review.json', {'status': 'open', 'date': '2026-10-01'})
        write(self.base, 'reviews', 'no-status', 'review.json', {'date': '2026-09-01'})  # the bible reads no status as open
        write(self.base, 'reviews', 'decided-one', 'review.json', {'status': 'decided', 'date': '2026-10-02'})
        write(self.base, 'reviews', 'superseded-one', 'review.json', {'status': 'superseded', 'date': '2026-10-03'})
        for i in range(25):
            write(self.base, 'showcase', f'entry-{i:02d}', 'entry.json', {'date': f'2026-09-{i + 1:02d}'})
        pub = pages.published(self.base, {})
        self.assertIn(('reviews', 'open-one'), pub)
        self.assertIn(('reviews', 'no-status'), pub)
        self.assertNotIn(('reviews', 'decided-one'), pub)
        self.assertNotIn(('reviews', 'superseded-one'), pub)
        shown = sorted(rid for folder, rid in pub if folder == 'showcase')
        self.assertEqual(len(shown), pages.SHOWCASE_PICTURES)
        self.assertEqual(shown[0], 'entry-05')  # entries 00 to 04 are the 5 oldest by date
        self.assertIn(('showcase', 'entry-24'), pub)

    def test_a_commit_time_or_updated_time_moves_an_entry_up_the_order(self):
        for i in range(25):
            write(self.base, 'showcase', f'entry-{i:02d}', 'entry.json', {'date': f'2026-09-{i + 1:02d}'})
        write(self.base, 'showcase', 'old-but-committed', 'entry.json', {'date': '2026-08-01'})
        write(self.base, 'showcase', 'old-but-updated', 'entry.json', {'date': '2026-08-02', 'updated': '2026-10-20T10:00:00+00:00'})
        dates = {'old-but-committed': '2026-10-19T08:00:00+00:00'}
        pub = pages.published(self.base, dates)
        self.assertIn(('showcase', 'old-but-committed'), pub)
        self.assertIn(('showcase', 'old-but-updated'), pub)
        self.assertNotIn(('showcase', 'entry-00'), pub)


class Times(unittest.TestCase):
    def test_stamp_reads_dates_and_offsets_the_way_the_bible_does(self):
        utc = datetime.timezone.utc
        self.assertEqual(pages.stamp('2026-09-30'), int(datetime.datetime(2026, 9, 30, tzinfo=utc).timestamp() * 1000))
        self.assertEqual(pages.stamp('2026-10-15T21:01:01+02:00'),
                         int(datetime.datetime(2026, 10, 15, 19, 1, 1, tzinfo=utc).timestamp() * 1000))
        self.assertEqual(pages.stamp('2026-10-12T22:40:59.547790+00:00'),
                         int(datetime.datetime(2026, 10, 12, 22, 40, 59, 547000, tzinfo=utc).timestamp() * 1000))
        self.assertEqual(pages.stamp('not a date'), 0)
        self.assertEqual(pages.stamp(None), 0)


class Pictures(unittest.TestCase):
    def test_strip_pictures_keeps_the_text(self):
        item = {'title': 'Round', 'question': 'Which?', 'media': [{'image': 'a.png', 'caption': 'c'}],
                'options': [{'id': 'a', 'label': 'A', 'image': 'a.webp', 'images': ['b.webp'], 'note': 'n'}],
                'viewer_files': ['v.glb'], 'sections': [{'title': 's', 'images': [{'id': 'x', 'image': 'x.png'}]}]}
        self.assertTrue(pages.strip_pictures(item))
        self.assertEqual(item, {'title': 'Round', 'question': 'Which?',
                                'options': [{'id': 'a', 'label': 'A', 'note': 'n'}], 'sections': [{'title': 's'}]})
        self.assertFalse(pages.strip_pictures({'title': 'text only'}))

    def test_keep_pictures_reports_the_pictures_that_stay_local(self):
        item = {'media': [{'image': 'a.png'}], 'options': [{'id': 'a', 'image': 'b.webp'}]}
        self.assertTrue(pages.keep_pictures(item, {'a.png': 'a.png'}))  # b.webp did not go up
        self.assertEqual(item, {'media': [{'image': 'a.png'}], 'options': [{'id': 'a'}]})
        self.assertFalse(pages.keep_pictures({'media': [{'image': 'a.png'}]}, {'a.png': 'a.png'}))

    def test_drop_unpublished_keeps_text_data_and_shared_pictures(self):
        with tempfile.TemporaryDirectory() as site:
            folder = os.path.join(site, 'reviews', 'closed')
            os.makedirs(folder)
            for name in ('review.json', 'data.json', 'notes.md', 'pic.png', 'viewer.html', 'viewer.js', 'shared.webp'):
                open(os.path.join(folder, name), 'w').close()
            gone = pages.drop_unpublished(site, set(), {'reviews/closed/shared.webp'})
            self.assertEqual(gone, {'reviews/closed/pic.png', 'reviews/closed/viewer.html', 'reviews/closed/viewer.js'})
            self.assertEqual(sorted(os.listdir(folder)), ['data.json', 'notes.md', 'review.json', 'shared.webp'])


class Registration(unittest.TestCase):
    """The commit hook's rule (pages.py register): copy what main has, refuse only what no checkout and no lock file has."""

    def test_a_picture_this_disk_lacks_is_copied_from_main(self):
        refs = {'game3d/shots/a/x.png': ['showcase/one'], 'game3d/shots/b/y.png': ['showcase/two']}
        copy, absent = pages.plan_copies(refs, here={'game3d/shots/b/y.png'}, in_main={'game3d/shots/a/x.png'},
                                         lock={}, touched=set())
        self.assertEqual(copy, ['game3d/shots/a/x.png'])
        self.assertEqual(absent, [])

    def test_a_changed_entry_with_a_picture_in_no_checkout_and_no_lock_is_refused(self):
        refs = {'game3d/shots/a/x.png': ['showcase/new'], 'game3d/shots/c/z.png': ['showcase/old']}
        copy, absent = pages.plan_copies(refs, here=set(), in_main=set(), lock={}, touched={'showcase/new'})
        self.assertEqual(absent, ['game3d/shots/a/x.png'])  # the untouched entry is not this commit's problem

    def test_a_picture_the_lock_file_holds_is_never_refused(self):
        refs = {'game3d/shots/a/x.png': ['showcase/new']}
        copy, absent = pages.plan_copies(refs, here=set(), in_main=set(),
                                         lock={'game3d/shots/a/x.png': {'sha256': 'aa'}}, touched={'showcase/new'})
        self.assertEqual((copy, absent), ([], []))

    def test_only_pictures_the_lock_file_lacks_or_holds_with_another_sha_are_pushed(self):
        lock = {'a.webp': {'sha256': 'aa'}, 'b.webp': {'sha256': 'bb'}}
        self.assertEqual(pages.plan_push(lock, {'a.webp': 'aa', 'b.webp': 'cc', 'c.webp': 'dd'}), ['b.webp', 'c.webp'])

    def test_only_an_entry_or_a_review_file_counts_as_touched(self):
        real = pages.git
        pages.git = lambda *args: 'showcase/a/entry.json\0showcase/b/feedback.json\0reviews/c/review.json\0reviews/d/answer.md\0\0'
        try:
            touched = pages.touched_items()
        finally:
            pages.git = real
        self.assertEqual(touched, {'showcase/a', 'reviews/c'})

    def test_the_commit_makes_a_changed_entry_the_newest(self):
        real = pages.showcase_dates
        pages.showcase_dates = lambda root: {'old': '2026-01-01T00:00:00+00:00', 'kept': '2026-02-01T00:00:00+00:00'}
        try:
            dates = pages.commit_dates({'showcase/old', 'reviews/other'})
        finally:
            pages.showcase_dates = real
        self.assertGreater(pages.stamp(dates['old']), pages.stamp('2026-02-01'))
        self.assertEqual(dates['kept'], '2026-02-01T00:00:00+00:00')


if __name__ == '__main__':
    unittest.main()
