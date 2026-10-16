"""tools/work.py: what `stale` and `triage` flag, and the reason a blocked or parked issue keeps. No network.

Run: python3 -m unittest discover -s tools -p 'test_work.py'
"""
import datetime as dt
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


if __name__ == '__main__':
    unittest.main()
