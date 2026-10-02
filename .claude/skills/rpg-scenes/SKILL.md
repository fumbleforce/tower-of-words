---
name: rpg-scenes
description: >
  Write a scene the player walks into in this RPG, including an optional private
  fanservice scene. Use for a discovery, narration, a text box, or words over a
  picture. Spoken dialogue between characters uses game3d/story/VOICE.md instead.
---

# RPG scenes

This is the whole method for a scene the player walks into. Spoken lines between people are in game3d/story/VOICE.md. Learning rules stay in GUIDE.md and docs/game/words.md.

## The box

A box is one moment the player can take in before continuing. Write it in ordinary sentences that follow from the box before. Stop when that moment is in. Another box is for a new moment, not for more of the same one.

A moment that is chopped into captions is too thin. A sentence that stacks every detail is too much. Neither is fixed by counting sentences.

## What the text is for

The controls already move the player. The 3D scene already shows what is in frame. A picture already shows what is in the picture.

Text is only the rest: a sound, a recognition from something the player already knows at this point in the day, an event easy to miss, and the action they just chose.

Do not retell the walk, the room, or the picture. Do not give the player a feeling or an intention they did not choose. Do not say someone noticed unless the scene shows how. Say a fact once.

## Ordinary scenes

The player comes away knowing something, holding something, or able to go somewhere they could not before. That is enough. It does not have to turn the story.

The scene ends when that has happened, and control comes back. A later visit does not play it again. Earlier choices stay in effect.

If the player would not understand what just happened from the screen alone, the box says what happened. Otherwise there is no box.

## Private scenes

A private scene is optional fanservice, shipped as a local plugin. The loader and its contract are game3d/js/plugins.js. The published game does not contain the scene. Private mode off means it is not offered, and the public route does not point at it. The lines and the picture stay in the private pack.

The player takes it or leaves it.

Taking it is the scene. The picture does the looking. The text does not describe the body again.

Leaving it returns to the route, in one neutral box at most.

Nothing in either branch adds a moral, a debt, or a consequence outside this scene. The person does not have to notice or speak. If they do, it stays inside this scene, and it is not a scolding.

If the player would already know who it is, do not stage a recognition. If they would not, use knowledge they have by this point in the day.

Everyone involved is an adult. That fact lives in docs/game/cast.md.

## What this is not

Chapter-structure checklists and dialogue-craft checklists do not apply here. They pull a scene toward a lesson. Do not reach for them.
