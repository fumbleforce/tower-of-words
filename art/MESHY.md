# 3D characters: ChatGPT chibi, then Meshy

Jørgen's workflow, his words as the spec:

> generate the chibi picture in chatgpt. I needed 3 rounds to get it right, and need to remove accessories that get garbled by meshy.
>
> "she should be looking to the left instead, same orientation as her body. Keep all features thick and sturdy, no fine strands or thin spikes. No text, no props, no extra subjects, no photorealism. she is looking the same orintation as her body. Flat matte texture of model"
>
> 1. make a 3d chibi anime character in the style of the attached image
> 2. Simplify male character a LOT to match the detail level of the other chibi, with open eyes
> 3. Simpler head model, grey closed jacket, no glasses
>
> then in meshy I used the image to 3d model, smart topography, 1050 poly count, a pose, then textured it in a second pass if it looked right. From there it can be automatically rigged (just need to lower the height due to the big head), and add animations.

- The picture steps run in ChatGPT's image model. Step 3 names what to simplify on that character, and every prop to remove (lanyard, bag, badge, phone, glasses, hair sticks), so Meshy never sees them. Style reference: tools/characters/ref/mio-chibi-34.png (angled: mio-chibi-angled.png).
- Texture pass: smart-topology shapes come back without UVs and Meshy smears the face. Unwrap the shape in Blender first with the face as one UV island at about 3x density, then Meshy retexture with the picture as style image, original UVs kept, no PBR, 2048 px (art/candidates/kuro-meshy-orig-3/uv_bl.py).
- In the game these models only get colour tweaks (GUIDE: Art, 3D characters).
