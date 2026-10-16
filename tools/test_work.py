"""tools/work.py: what `stale` and `triage` flag, and the reason a blocked or parked issue keeps. No network.

Run: python3 -m unittest discover -s tools -p 'test_work.py'
"""
import datetime as dt
import os
import tempfile
import unittest
from unittest.mock import patch

import work

AT = dt.datetime(2026, 10, 16, 12, 0, tzinfo=dt.timezone.utc)


def ago(hours):
    return work.stamp(AT - dt.timedelta(hours=hours))


def issue(num, state='todo', updated=0, created=None, **extra):
    i = {'id': str(num), 'title': f'issue {num}', 'kind': 'task', 'owner': 'claude-main', 'state': state,
         'open': state not in work.CLOSED, 'source': [], 'next': '', 'done_ref': '', 'reason': '', 'why': '', 'detail': '',
         'created': ago(created if created is not None else updated), 'updated': ago(updated), 'running_since': '',
         'url': f'https://example/{num}'}
    i.update(extra)
    return i


def stale(all_items, reviews=(), commits=None):
    commits = commits or {}
    with patch.object(work, 'review_items', return_value=list(reviews)), \
            patch.object(work, 'last_commit_hours', side_effect=lambda num, at: commits.get(num)):
        return {s['id']: s['reasons'] for s in work.stale(AT, all_items)}


class Stale(unittest.TestCase):
    def test_plain_todo_and_parked_are_never_stale(self):
        self.assertEqual(stale([issue(1, 'todo', updated=24 * 30), issue(2, 'parked', updated=24 * 30)]), {})

    def test_running_needs_a_commit_within_24_h(self):
        got = stale([issue(1, 'running', running_since=ago(30)), issue(2, 'running', running_since=ago(30)),
                     issue(3, 'running', running_since=ago(5)), issue(4, 'running', running_since=ago(48))],
                    commits={'2': 3, '4': 25})
        self.assertEqual(sorted(got), ['1', '4'])
        self.assertIn('since it went running', got['1'][0])
        self.assertIn('for 25 h', got['4'][0])

    def test_running_counts_from_when_it_went_running_not_from_an_old_commit(self):
        # Created long ago, an old commit named it, set running an hour ago: not stuck yet.
        self.assertEqual(stale([issue(1, 'running', created=24 * 20, running_since=ago(1))], commits={'1': 24 * 10}), {})

    def test_running_without_a_start_time_counts_from_creation(self):
        self.assertEqual(list(stale([issue(1, 'running', created=48)])), ['1'])

    def test_a_progress_note_does_not_hide_a_running_stall(self):
        self.assertEqual(list(stale([issue(1, 'running', updated=0, running_since=ago(30))])), ['1'])

    def test_blocked_needs_a_reason(self):
        got = stale([issue(1, 'blocked'), issue(2, 'blocked', why='waiting on the GPU queue', updated=24 * 9)])
        self.assertEqual(list(got), ['1'])

    def test_waiting_jorgen_needs_an_open_review(self):
        reviews = [('r-open', {'status': 'open', 'issue': 2}, {})]
        self.assertEqual(list(stale([issue(1, 'waiting-jorgen'), issue(2, 'waiting-jorgen')], reviews)), ['1'])

    def test_decided_review_needs_an_issue(self):
        reviews = [('r1', {'status': 'decided', 'title': 'Pick', 'decided_at': ago(2)}, {})]
        self.assertEqual(list(stale([], reviews)), ['review:r1'])

    def test_decided_review_with_a_todo_followup_is_not_stale(self):
        reviews = [('r1', {'status': 'decided', 'issue': 1, 'decided_at': ago(48)}, {})]
        self.assertEqual(stale([issue(1, 'todo', updated=47)], reviews), {})

    def test_closed_issue_whose_review_reopened(self):
        reviews = [('r1', {'status': 'open', 'issue': 1}, {})]
        got = stale([issue(1, 'done')], reviews)
        self.assertIn('open again', got['1'][0])

    def test_closed_issues_are_not_checked_for_state(self):
        self.assertEqual(stale([issue(1, 'dropped', updated=24 * 30), issue(2, 'done', updated=24 * 30)]), {})


class Triage(unittest.TestCase):
    def test_old_todo_and_parked_oldest_first(self):
        all_items = [issue(1, 'todo', updated=24 * 8), issue(2, 'parked', updated=24 * 20), issue(3, 'todo', updated=24 * 6),
                     issue(4, 'running', updated=24 * 30), issue(5, 'dropped', updated=24 * 30), issue(6, 'blocked', updated=24 * 30)]
        self.assertEqual([i['id'] for i in work.triage(AT, all_items)], ['2', '1'])
        self.assertEqual([i['id'] for i in work.triage(AT, all_items, days=5)], ['2', '1', '3'])


class Reason(unittest.TestCase):
    def test_body_round_trips_why_and_running_since(self):
        item = issue(7, 'parked', why='after the day-2 freeze', running_since=ago(3))
        text = work.body(item)
        self.assertIn('**Parked:** after the day-2 freeze', text)
        back = work.to_item({'number': 7, 'title': 't', 'labels': [{'name': 'state:parked'}], 'body': text, 'state': 'OPEN'})
        self.assertEqual((back['why'], back['running_since']), ('after the day-2 freeze', item['running_since']))

    def update(self, old, note=None, **fields):
        with patch.object(work, 'load', return_value=old), patch.object(work, 'gh', return_value=''), \
                patch.object(work, 'guard'), patch.object(work, 'drop_cache'):
            return work.update(old['id'], note, **fields)

    def test_note_on_blocked_or_parked_is_kept_and_cleared_on_restart(self):
        blocked = self.update(issue(1, 'todo'), 'waiting on the land queue', state='blocked')
        self.assertEqual(blocked['why'], 'waiting on the land queue')
        running = self.update(blocked, state='running')
        self.assertEqual(running['why'], '')
        self.assertTrue(running['running_since'])
        self.assertEqual(self.update(issue(2, 'todo'), state='blocked')['why'], '')
        self.assertEqual(self.update(issue(3, 'parked', why='later'), next='x')['why'], 'later')


PLAIN_TEXT = {'plain': 'p', 'sees': 's', 'found': 'f', 'matters': 'm', 'fix': 'x'}
PLAIN = {'no_picture': 'tooling only', **PLAIN_TEXT}


class Proposed(unittest.TestCase):
    def add(self, **kw):
        made = {}

        def gh(*a, **k):
            made['body'] = k.get('stdin')
            made['labels'] = [a[i + 1] for i, x in enumerate(a) if x == '--label']
            return 'https://example/99'
        with patch.object(work, 'gh', side_effect=gh), patch.object(work, 'guard'), patch.object(work, 'drop_cache'):
            return work.add('t', **kw), made

    def test_agent_found_starts_proposed_and_needs_a_picture_or_a_reason(self):
        with self.assertRaises(SystemExit):
            self.add(source=['msg:C-1'])
        i, made = self.add(source=['msg:C-1'], proposal=PLAIN)
        self.assertEqual(i['state'], 'proposed')
        self.assertIn('state:proposed', made['labels'])
        i, _ = self.add(state='parked', proposal=PLAIN)
        self.assertEqual(i['state'], 'proposed')

    def test_his_sources_stay_todo(self):
        self.assertEqual(self.add(source=['file:notes/feedback-game/2026-10-14_1/text.md'])[0]['state'], 'todo')
        self.assertEqual(self.add(detail='Jørgen 2026-10-14: "the loop drives me insane"')[0]['state'], 'todo')
        self.assertEqual(self.add(jorgen=True)[0]['state'], 'todo')
        self.assertEqual(self.add(state='running', detail='x')[0]['state'], 'running')
        with patch('builtins.open', side_effect=OSError):
            self.assertFalse(work.from_jorgen(['review:nope'], 'Jørgen said it'))

    def test_proposed_is_never_stale_or_triaged(self):
        old = [issue(1, 'proposed', updated=24 * 90)]
        self.assertEqual(stale(old), {})
        self.assertEqual(work.triage(AT, old), [])

    def test_review_item_has_one_card_each_tooling_last(self):
        a = issue(5, 'proposed', proposal={'picture': 'x.webp', 'plain': 'Sign', 'sees': 'A sign is cut off.', 'found': 'a tester', 'matters': 'm', 'fix': 'f', 'category': 'outdoor', 'size': 'small'})
        b = issue(3, 'proposed', proposal={'no_picture': 'test tool', 'category': 'tooling', **PLAIN_TEXT})
        r = work.proposal_review([b, a, issue(9, 'todo')])
        self.assertEqual([o['id'] for o in r['options']], ['p5', 'p3'])
        self.assertEqual(r['options'][0]['image'], 'x.webp')
        self.assertIn('No picture: test tool', r['options'][1]['note'])
        self.assertEqual(r['status'], 'open')

    def test_decision_moves_picked_to_todo_and_rejected_to_dropped(self):
        live = [issue(5, 'proposed'), issue(6, 'proposed'), issue(7, 'proposed')]
        fb = {'picked': ['p5'], 'options': {'p6': {'reject': True, 'comment': 'not now'}}}
        calls = []
        with patch.object(work, 'update', side_effect=lambda n, *a, **k: calls.append((n, k.get('state'), k.get('note')))):
            self.assertEqual(work.apply_decisions({}, fb, live), (['5'], ['6']))
        self.assertEqual(calls, [('6', 'dropped', 'not now'), ('5', 'todo', None)])


class CardEdit(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        open(os.path.join(self.dir.name, 'pic.webp'), 'w').close()
        patcher = patch.object(work, 'ROOT', self.dir.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def edit(self, old, o):
        with patch.object(work, 'load', return_value=old):
            return work.card_edit(old['id'], o)

    def test_no_card_flag_changes_nothing(self):
        self.assertIsNone(self.edit(issue(1, 'proposed', proposal=PLAIN), {'state': 'todo'}))

    def test_flags_merge_into_the_card_the_issue_has(self):
        old = issue(2, 'proposed', proposal={'no_picture': 'test tooling', 'category': 'other', **PLAIN_TEXT})
        card = self.edit(old, {'screenshot': 'pic.webp', 'sees': 'A camera cuts the fountain.', 'size': 'small'})
        self.assertEqual(card['picture'], 'pic.webp')
        self.assertNotIn('no_picture', card)
        self.assertEqual((card['sees'], card['size'], card['plain'], card['category']), ('A camera cuts the fountain.', 'small', 'p', 'other'))
        card = self.edit(issue(2, 'proposed', proposal=card), {'no-picture': 'test tooling'})
        self.assertEqual(card['no_picture'], 'test tooling')
        self.assertNotIn('picture', card)

    def test_a_proposed_card_stays_complete_and_valid(self):
        with self.assertRaises(SystemExit):
            self.edit(issue(3, 'proposed', proposal={'no_picture': 'x'}), {'plain': 'only the title'})
        with self.assertRaises(SystemExit):
            self.edit(issue(3, 'proposed', proposal=PLAIN), {'size': 'huge'})
        with self.assertRaises(SystemExit):
            self.edit(issue(3, 'proposed', proposal=PLAIN), {'screenshot': 'missing.webp'})
        with self.assertRaises(SystemExit):
            self.edit(issue(3, 'proposed', proposal=PLAIN), {'screenshot': 'pic.webp', 'no-picture': 'x'})

    def test_a_card_for_an_issue_that_is_not_proposed_needs_no_words(self):
        self.assertEqual(self.edit(issue(4, 'todo'), {'plain': 'only the title'}), {'plain': 'only the title'})
        self.assertEqual(self.edit(issue(4, 'proposed', proposal=PLAIN), {'state': 'todo', 'fix': 'later'})['fix'], 'later')


if __name__ == '__main__':
    unittest.main()
