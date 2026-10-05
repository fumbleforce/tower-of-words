"""Writes reviews/lobby-plan-1/review.json from the concept takes' prompts (run from the repo root)."""
import json

P = 'art/candidates/lobby-plan-1/'
cprompt = json.load(open(P + 'c1-high.json'))['prompt']
eprompt = json.load(open(P + 'c2-eye.json'))['prompt']
r = {
    'title': 'Head office lobby rebuild: layout plan',
    'date': '2026-10-05',
    'by': 'Claude (plan agent, #259)',
    'status': 'open',
    'question': "The two pictures are concepts from ChatGPT's image model, not the game, and the plans are drawings; "
                'nothing is built yet. The look is decided (your pick: marble and glass atrium, warm wood desk, cool '
                'daylight). Two layout choices are left, pick one per number: 1, how tall (default 1a), and 2, where '
                "the lifts sit relative to Kuro's desk (default 2a).",
    'multi': True,
    'media': [
        {'image': P + 'c1-high.webp', 'caption': "Concept 1 (not the game): the look from about the game's camera "
         "height. ChatGPT image model (openai/gpt-5.4-image-2), one take, with a screenshot of today's lobby as the "
         'style reference. It differs from plan A: the entrance is in the middle of the front and the walks are laid '
         'out differently. Prompt: ' + cprompt},
        {'image': P + 'c2-eye.webp', 'caption': 'Concept 2 (not the game): standing just inside the doors, to show '
         'the height. One take, same model and reference. Prompt: ' + eprompt},
        {'image': P + 'plan-a.webp', 'caption': "Plan A, the default layout, top down on the tower's bay grid "
         "(1.49 x 1.6). Today's lobby is the dashed red outline; the new floor is about 2.1 times bigger. Junctions "
         '1 to 3 are marked, with V where you talk to Kuro and L where you wait for the B2 lift. The door stays '
         "where it is, so the court outside doesn't move."},
        {'image': P + 'now-lob2-recept-desk.webp', 'caption': "Today, desktop 1366x860: at Kuro's counter."},
        {'image': P + 'now-lob3-lift-desk.webp', 'caption': 'Today, desktop: in front of the lift.'},
        {'image': P + 'now-lob1-door-desk.webp', 'caption': 'Today, desktop: the head office door from the court.'},
        {'image': P + 'now-lob2-recept-phone.webp', 'caption': "Today, phone 390x844: at Kuro's counter."},
        {'image': P + 'now-lob3-lift-phone.webp', 'caption': 'Today, phone: in front of the lift.'},
        {'image': P + 'now-lob1-door-phone.webp', 'caption': 'Today, phone: at the door.'},
    ],
    'options': [
        {'id': '1a', 'label': '1a. Double-height atrium (default)', 'image': P + 'c2-eye.webp',
         'note': "Ceiling 4.4 against today's 2.4 (people are about 1.2 tall). Two-storey glass on the front and the "
                 'west side, so from the court the tower gets a tall glass base. The wall behind Kuro and the lift '
                 'wall go up the full height. The picture is concept 2.'},
        {'id': '1b', 'label': '1b. High single storey', 'image': P + 'plan-a.webp',
         'note': 'The whole ground floor goes from 2.4 to 3.2, and the tower rises with it. Less height inside and '
                 'simpler to build; the glass front stays one storey. Same floor plan. No concept picture was made '
                 'for this one; the picture is plan A.'},
        {'id': '2a', 'label': '2a. Desk ahead of the door, lift bank to its right (default)', 'image': P + 'plan-a.webp',
         'note': 'You walk in straight to Kuro, and a cross walk takes you right to four lift doors on the back wall. '
                 'The B2 car is the one nearest the desk, and Kuro points to her left (image right) for it. The B2 '
                 'office underneath has to shift to match.'},
        {'id': '2b', 'label': '2b. Lift bank straight ahead, desk to the right', 'image': P + 'plan-b.webp',
         'note': 'The B2 lift stays on the door line, so the walk to work is the shortest and the least moves. Kuro '
                 'and the AMAKAWA wall sit in the east half, a short detour off the walk.'},
        {'id': '2c', 'label': '2c. Free-standing desk on the door line, lifts right behind it', 'image': P + 'plan-c.webp',
         'note': "Kuro stands in the middle of the room with the lift bank behind her and AMAKAWA over the lift doors. "
                 "The walk goes round the desk's east end, and the east half is left for a lounge."},
    ],
    'links': [
        {'label': 'The full plan, with every dependency and the performance budget (notes/lobby-plan.md)',
         'href': 'https://github.com/fumbleforce/tower-of-words/blob/main/notes/lobby-plan.md'},
        {'label': "Today's lobby in the game", 'href': 'game3d/index.html?place=forecourt'},
    ],
}
json.dump(r, open('reviews/lobby-plan-1/review.json', 'w'), indent=1, ensure_ascii=False)
open('reviews/lobby-plan-1/review.json', 'a').write('\n')
