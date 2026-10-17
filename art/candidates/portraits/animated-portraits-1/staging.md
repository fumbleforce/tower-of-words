# animated-portraits-1: staging

Jørgen, 2026-10-17: "Animated portraits is an interesting one, make 2 examples of this."

The brief from the coordinator: a subtle idle loop of an approved dialogue portrait as it shows in the game's dialogue (breathing, a blink, a slight sway of hair). It is not a performance; the face and body stay exactly on model. Two examples, Mio's and Kuro's approved neutral portraits, each made both ways the animate-still skill knows: (a) pose-driven video (Wan 2.2 Fun VACE), a short seamless loop, and (b) the 2D puppet rig in Three.js. Public-mode portraits only. Nothing goes into the game.

## Sources

- Mio: game3d/assets/portraits/mio-neutral.webp (597x768 cut-out), from art/production/PC/mio/mio-v3-neutral-823.png (1008x1296).
- Kuro: game3d/assets/portraits/kuro-neutral.webp (630x1048 cut-out), from art/production/KB/c-s11.png (1096x1824).

## Staging note (one note for both: the shot is the portrait itself)

- Story beat: the person is listening or talking in a conversation; the picture should feel alive, nothing more.
- Script moment: any line of hers while the dialogue stage shows her neutral face.
- Where it sits: the dialogue stage (game3d/js/ui/portraits.js layoutStage). Desktop 1366x860: face 112 px tall, the picture cut at the bottom of the screen 2.25 face heights under the chin. Phone 390x844: face 57 px, cut on the top of the text band. Mio stands on the right facing left (as drawn); Kuro faces right in her picture, so on the right she is shown mirrored.
- Camera: static, the portrait's own framing. No zoom, pan or shake.
- Height and scale: unchanged; every pixel of the still is where it was at frame 0 and at the loop point.
- In front of the lens: only her, head and shoulders down to the waist cut, on a transparent background.
- Behind the camera: nothing; the game scene shows behind the cut-out.
- Motion, all small (in source pixels, so about two thirds of that at desktop size):
  - Breathing: one slow breath per loop, the shoulders and chest rise about 3 px and settle; the cut at the bottom stays put.
  - Head: rides the breath, with a slight tilt of under a degree that lags it. No turn in depth.
  - Hair: the loose strands and tips sway a couple of pixels, lagging the head. Mio: the side strands over her cheeks and the bun's loose ends; Kuro: the long strand hanging by her right cheek (image right) and the bun's loose ends.
  - Eyes: one blink per loop, about 0.2 s, closed lids drawn in her style. Eyes keep looking where they look.
  - Hands, arms, headphones, lanyard and badge (Mio), lapels, buttons and hair sticks (Kuro): still, carried by the torso.
- Eyelines: as the still: Mio looks at the viewer from a three-quarter turn, Kuro looks at the viewer.
- Light: the still's own; no new light or shading.
- Physical sense / what can break: the glasses (Mio's taupe-grey rounded frames, Kuro's black frames) must not bend or melt and stay over the eyes; her irises keep their colour; hair keeps its colour and shape; no face change, no mouth movement; the loop point has no jump; the cut-out edge has no red rim or halo and no flicker.
