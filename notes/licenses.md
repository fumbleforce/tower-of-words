# Licence audit for the desktop release (#424)

Audit date 2026-10-10. Scope: everything that ships in the desktop app's public game. A second, local-only addendum covers the extra content of the larger build. Verdicts: OK, needs action, blocker. "Unclear" says what would settle it. This is a reading of public terms by an agent, not legal advice.

Two facts hold for the whole audit:
- Every voice in the game is synthetic. No reference recording is a real person's voice (Voices below).
- AI output may not be copyrightable in some countries (human authorship is needed), so "we may use it" does not always mean "we can stop others copying it". Terms below say whether the tool's maker lets us use and sell the output.

## Blockers and actions

Blockers for a paid release (free release is fine unless noted). Item 2 is resolved:

1. **Opening theme and the `night` loop are YuE2 music.** The YuE2 weights are CC BY-NC 4.0. Whether that non-commercial term reaches the generated music is not settled by the model card, and the LICENSE file was not read. Settle it by reading the LICENSE in the m-a-p/YuE2-3B repository or asking the authors; otherwise replace both tracks (Lyria already makes the other three loops).
2. **Resolved: the 36 edge-tts clips no longer ship.** They were old named takes (`ann-*`, `mio-ohayo` and the like) that the game's voice index (game3d/audio/index.json) stopped using; the asset lifecycle (#419) retired them on 2026-10-10, and the release file list leaves them out. Don't bring edge-tts clips back.
3. **One Obsession (Anima) pictures.** Its Civitai page allows only "RentCivit"; selling generated images is not ticked. It made four of the five Photos collectibles; no scenery that ships is from it (Remake list B). Free release: allowed by every reading. Paid: regenerate with RDBT (selling images is ticked there) or get the creator's written permission.

Needs action (could become blockers):

4. **Meshy plan at generation time is unknown.** Free plan models are CC BY 4.0 (commercial use allowed, credit Meshy); paid plan models are owned by us. Check the account's billing history against the task dates. Until then the credits file carries the Meshy credit line, which is harmless on a paid plan.
5. **Voices cloned from MiniMax stock voices** (Emi's reference, the train and lift announcer). MiniMax's terms of service could not be read through the fetch tool, and Replicate's page names no output licence. Settle: read https://platform.minimax.io/protocol/terms-of-service in a browser, or re-make both references with a Qwen3 VoiceDesign voice as the other cast was.
6. **Lyria music (calm, lively, office).** Made through Replicate with `google/lyria-2` (the Lyria 3 Pro rounds never shipped; Remake list D). Neither Replicate page states an output licence, and the Vertex terms for Lyria were not found. Outputs carry a SynthID watermark. Settle: Google's Lyria / Gemini API terms in a browser.
7. **Stable Audio 3 ambience beds and animal calls** fall under the Stability AI Community License (free for organisations under US$1M annual revenue, you own the audio, per Stability's licence page and press coverage). The licence text itself was not read. Read it once and register if it asks.
8. **Resolved: no shipped clip lacks a record (Remake list F).** It was about 121 clips in game3d/audio missing from tools/voice/clips.json (mostly `ln-*`), so their engine is not recorded. Probably older local TTS runs. Settle: regenerate them through the pipeline or find the old run logs in ~/ai/game3d-voice.
9. **No shipped file used Nova Anime AM (Remake list G).** Its terms: its page forbids commercial use of unedited outputs. Two renders in the dashboard log used it; no shipped file records it. Settle by checking the shipped portraits' source runs; if any is Nova, repaint or re-roll it.
10. **Desktop shell does not exist yet** (no desktop/ folder). When it does: ship Electron's LICENSE and `LICENSES.chromium.html` inside the app, and `LICENSES.txt` from this audit.
11. **Reference images.** Nothing shipped is recorded as derived from art/refs (searched the asset library's sources). The opening's earlier exterior tests (tools/opening/layers.py, wan_pilot.py) used art/refs/monorail-bay-ref3.png, and the Blender monorail used a reference from Jørgen. The docs say the final opening is the game's own 3D. Confirm no frame of the rendered film comes from those tests.

Attribution needed in the release (all in notes/credits-vanilla.txt): three.js, three-vrm, Electron/Chromium notices, the three font families (OFL text), RDBT (credit required by the creator), Meshy (free-plan credit line), Qwen3-TTS, Irodori-TTS, Stable Audio 3, Google Lyria and SynthID note, YuE2 (only if kept).

## Code

| Source | Licence | Free / paid | Attribution | Verdict |
|---|---|---|---|---|
| three.js r186 and examples/jsm addons (game3d/vendor) | [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE) | yes / yes | Copyright notice and licence text | OK |
| @pixiv/three-vrm 3.5.5 (game3d/vendor/vrm, preview page only) | [MIT](https://github.com/pixiv/three-vrm/blob/dev/LICENSE) | yes / yes | Copyright pixiv Inc. in the licence text | OK (leave the preview page out of the app, or keep the notice) |
| npm runtime dependencies | none: package.json has devDependencies only (eslint, madge, playwright, prettier) and none ship | n/a | none | OK |
| Electron | [MIT](https://github.com/electron/electron/blob/main/LICENSE), bundles Chromium (BSD and others) and FFmpeg | yes / yes | Ship LICENSE and LICENSES.chromium.html | OK once the shell exists |
| Game code written here | ours | n/a | none | OK |

## Fonts (game3d/fonts)

| Source | Licence | Free / paid | Attribution | Verdict |
|---|---|---|---|---|
| Zen Kaku Gothic New (text and opening subsets) | [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/zenkakugothicnew/OFL.txt), "The Zen Kaku Gothic Project Authors", no reserved name | yes / yes | Copyright line and OFL text | OK |
| Barlow Condensed (opening subsets) | [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/barlowcondensed/OFL.txt), "The Barlow Project Authors", no reserved name | yes / yes | Same | OK |
| Dela Gothic One (opening subset) | OFL.txt in [google/fonts](https://github.com/google/fonts/tree/main/ofl/delagothicone); contents not read | yes / yes (OFL fonts may be bundled and sold inside software) | Copyright line copied from that OFL.txt | OK, copy the exact line before release |

Subsetting is allowed by OFL. Subsets that keep the family name are fine because none of the three reserves a name.

## Images

Generation tools: ComfyUI on the local GPU. The Anima family (RDBT, One Obsession, Nova AM) sits on the CircleStone Labs Anima base, a derivative of NVIDIA Cosmos-Predict2. Its licence restricts the model, not outputs; we ship only outputs.

| Source | Licence or terms | Free / paid | Attribution | Verdict |
|---|---|---|---|---|
| [Anima base](https://huggingface.co/circlestone-labs/Anima) (CircleStone Labs Non-Commercial License; NVIDIA Open Model License for the Cosmos part) | "The model and derivatives are only usable for non-commercial purposes"; restriction "applies only to the Model, and not to Outputs". [NVIDIA Open Model License](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-license/): NVIDIA claims no ownership of outputs; "Built on NVIDIA Cosmos" is needed only when outputs train another AI model | yes / yes for outputs | none | OK. Never ship the weights in the app |
| [RDBT Anima b1 v2.3](https://civitai.com/models/2356447) (portraits, expressions, interiors, backgrounds). Civitai flags: sell generated images yes; rent/host no; sell or merge the model no; credit required | Civitai per-model flags | yes / yes | "Images made with RDBT [Anima] by reakaakasky" | OK |
| [One Obsession Anima v4.0](https://civitai.com/models/2695493) (four Photos collectibles). Flags: sell images NO; rent on Civitai only | Civitai per-model flags | yes / no | creator name in credits | Blocker for paid (item 3) |
| [Nova Anime AM v5](https://civitai.com/models/2604424). Flags: sell images yes, but the page says unedited outputs may not be used commercially | Civitai page rules | yes / only if edited | creator credit | Unclear which shipped files use it (item 9) |
| [Anima RL LoRA v0.1](https://civitai.com/models/2583128) (CircleStone Labs). Flags: sell images yes, no credit needed | Anima licence for the model | yes / yes | none | OK |
| [Anima LLLite patches](https://huggingface.co/kohya-ss/Anima-LLLite) (inpainting-v2, lineart-1, depth, scribble; face repaints, outpaints, layout control) | Same licence as Anima base (non-commercial for the patch, not for outputs) | yes / yes | none | OK |
| Qwen3-0.6B text encoder and Qwen-Image VAE (ComfyUI loads them) | Apache 2.0 per the Qwen model cards; not individually re-fetched here | yes / yes | none required for outputs | OK |
| [Real-ESRGAN anime 6B](https://github.com/xinntao/Real-ESRGAN) upscaler | BSD-3-Clause for the repository; weights licence not stated separately | yes / yes | none for outputs | OK |
| rembg ISNet anime cut-outs ([anime-segmentation](https://github.com/SkyTNT/anime-segmentation), weights [skytnt/anime-seg](https://huggingface.co/skytnt/anime-seg)) | Apache-2.0 for code and weights | yes / yes | none | OK |
| IP-Adapter (character reference), CLIP-ViT-H, DINOv3 | Used in a few tests of the portrait work (Mio phone face); not named in any shipped asset's record. Licences not checked | n/a | n/a | Unclear: check the Mio phone portrait's run; if it used the adapter, read the IP-Adapter and DINOv3 terms |
| Mori's travel print (game3d/assets/photos/mori-lillehammer.png) | OpenAI image generation. [OpenAI terms](https://openai.com/policies/terms-of-use/): OpenAI assigns its rights in Output to the user, subject to compliance with the terms (page returned 403, summary from [secondary text](https://terms.law/ai-output-rights/chatgpt/index.html)) | yes / yes | none | OK, read the current terms once in a browser |
| ChatGPT chibi pictures used as Meshy inputs (not shipped as pictures) | Same OpenAI terms | yes / yes | none | OK |
| Four of the five Photos collectibles (game3d/assets/photos; the early train is RDBT) | One Obsession Anima, see above | yes / no | credit | Blocker for paid (item 3) |
| Opening film (game3d/assets/opening/film) | Rendered from the game's own 3D and the cast portraits; soundtrack is the opening theme | see Music | none | OK except the soundtrack (item 1) and item 11 |
| FLUX, GPT image, Seedream, Nano Banana, Hunyuan, Grok images made through Replicate | Used in the first week's concept art (art/concept) only; no approved or provisional asset records them | n/a | n/a | OK, not shipped. Keep it that way |
| Cloudflare R2 | Restricted storage for the asset sync; nothing is served from it to players | n/a | n/a | OK. If a public bucket or the Pages site ever serves the app's files, read [Cloudflare's terms](https://www.cloudflare.com/terms/) |

## 3D models and animation

| Source | Licence or terms | Free / paid | Attribution | Verdict |
|---|---|---|---|---|
| Meshy image-to-3D models (Eric, Mio, Kuro, Aoi, Emi, Mori, Kenji, the guard, Hamada, Rei, Carina, the two crowd models, the chibis, swimwear) and Meshy auto-rig | [Meshy help: commercial use](https://intercom.help/meshy/en/articles/16102098-can-i-use-meshy-assets-commercially). Paid plan: you own it, no attribution, provided inputs infringe nobody and the model was not published to Meshy Community. Free plan: CC BY 4.0, commercial use allowed, credit Meshy | yes / yes either way | Free plan: "Model created with Meshy." | Needs action: confirm plan (item 4) and that nothing went to the Community page |
| Meshy animation library clips (walk, run, sit, gestures) | Same as above (Meshy output) | yes / yes | Same | Needs action: same |
| Our idles, gestures on the rig and sit/phone poses (`relaxed-idle-*.json`, rig-gestures.js) | ours | n/a | none | OK |
| Code-built chibis, rooms, props, world kit | ours | n/a | none | OK |
| Mixamo | Bone names (`mixamorig`) appear in the rigs because Meshy uses that naming; no Mixamo clip is recorded as imported | n/a | none | OK. If a clip turns out to be from Mixamo, Adobe's [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) allows commercial use in games |
| pixiv VRM sample (art/parts, VRM test page) | Prototype only, never in the game | n/a | n/a | OK, keep out of the app |
| TRELLIS.2 / Hunyuan3D meshes | Tested as guides; rejected for shipping per GUIDE | n/a | n/a | OK, not shipped |

## Voice

Local TTS: Qwen3-TTS 1.7B Base and VoiceDesign clone every game voice from short reference clips (tools/voice-refs). Reference clips fall into the groups below. In none of them is a real person's recording used.

| Source | Licence or terms | Free / paid | Attribution | Verdict |
|---|---|---|---|---|
| [Qwen3-TTS 1.7B Base](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base) (clone engine; also hosted on Replicate for design takes) | Apache-2.0, no stated limit on outputs or cloning | yes / yes | Model credit | OK |
| [Irodori-TTS v4.1 Small](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small) (designed the salaryman, staff, Sales man and vending-machine references from text captions; also the first-week takes) | MIT plus a request not to clone or impersonate any individual without consent and not to make deceptive speech. We used captions only, with no reference of a real person | yes / yes | Model credit | OK |
| Designed references: eric-voice, carina-voice-a, kenji-design, kuro-husky and kuro-design, mori-design, rei-design, sales1-design, salaryman, staff, vending, mizuno-design, worker-design, man-design, mio-a (voice A), ishibashi-ref12; approved in Review items eric-voice, carina-voice-1, kuro-voice-2, rei-voice-1 | Qwen3 or Irodori VoiceDesign output from a written description; no person behind them | yes / yes | none | OK |
| player-slice12 (the old player voice) | Qwen3-TTS design clone from the first-week game | yes / yes | none | OK |
| emi-slice12, lift-announcer (also used for the announcer) | Cut from MiniMax Speech 2.6 HD stock voices (Japanese_CalmLady, Japanese_KindLady) through Replicate. No real person is named, but MiniMax's terms for output use were not readable | unclear / unclear | none known | Needs action (item 5) |
| goro-ref12, jun-ref12, aoi-ref12 | Sources recorded as "voice design or casting clip" in the old game's audition (tools/slice_voices.mjs, legacy audition manifests list MiniMax stock voices and Qwen-designed candidates). The exact generator of each file is not recorded | unclear / unclear | none known | Unclear: if one is a MiniMax stock voice, treat as item 5; the story-cast voices that use them are Aoi, the reader and station worker |
| edge-tts clips (36) | Unofficial Microsoft endpoint, no licence | not shipped | none | Resolved: retired, not in the voice index (item 2) |
| Eric's Nordic-accent tests (Piper Norwegian voice, CosyVoice3) | Rejected by Jørgen; not in the game | n/a | n/a | OK, not shipped |
| The player's voice for Eric and Carina, the word clips, the overheard lines | Qwen3-TTS clones of the designed references above | yes / yes | none | OK |

Consent summary: a clone of a real person would need written consent. None exists and none is needed, because every reference is a text-designed voice or a stock synthetic voice. Unknown: which stock voice a real actor may stand behind. MiniMax stock voices are licensed to MiniMax by their actors; that is MiniMax's matter, and item 5 settles it.

## Music and sound

| Source | Licence or terms | Free / paid | Attribution | Verdict |
|---|---|---|---|---|
| Lyria loops: calm, lively, office (Google Lyria 2 and Lyria 3 Pro via Replicate) | [Replicate terms](https://replicate.com/terms): we own Output and may sell it, subject to the model's own terms; [Lyria 2](https://replicate.com/google/lyria-2) lists no licence and says outputs carry a SynthID watermark | unclear / unclear | "Music generated with Google Lyria" is a safe line | Needs action (item 6) |
| Opening theme and `night` loop (YuE2-3B, instrumental add-on for `night`) | [Weights CC BY-NC 4.0](https://huggingface.co/m-a-p/YuE2-3B); code Apache 2.0 | yes if the NC term does not reach outputs / no | "Opening theme made with YuE2 (CC BY-NC 4.0)" if kept | Blocker for paid (item 1) |
| Ambience beds (station, lobby, office, train, harbour) and crow and gull calls: Stable Audio 3 Medium | [Stability AI Community License](https://stability.ai/license): free under US$1M revenue, you own the audio; text not read | yes / yes while under US$1M | "Powered by Stability AI" is not asked of outputs as far as known | Needs action (item 7) |
| SFX made by our scripts (tools/feel: synth, pluck, hum, nature: doors, chimes, typing, purr, sparrows, crickets, wings) | ours, synthesised | yes / yes | none | OK |
| Other SFX from SA3 takes (brake, copier, flaps, kettle, vending, phone, printer) | Stable Audio 3, as above | yes / yes | none | Needs action (item 7) |
| Kenney audio packs | CC0, kept in ~/ai/island-audio/kenney for the older game; none of the current game's files list them | n/a | none | OK, not in use |
| ACE-Step 1.5, Stable Audio and YuE2 round tests | Rejected tests (art/SOUND.md) | n/a | n/a | OK, not shipped |

## Services' terms in one place

| Service | Output terms | Link |
|---|---|---|
| OpenAI (ChatGPT, image generation) | Rights in Output assigned to the user, subject to terms | https://openai.com/policies/terms-of-use/ |
| Replicate | User owns Outputs, commercial use allowed subject to each model's own terms | https://replicate.com/terms |
| Google (Lyria) | Not found for Lyria on Replicate; read Google's terms | https://cloud.google.com/terms/service-terms |
| Meshy | Paid: ours. Free: CC BY 4.0 | https://intercom.help/meshy/en/articles/16102098-can-i-use-meshy-assets-commercially |
| Civitai | Each model's own flags (listed above); Civitai asserts nothing over downloaded models' outputs | https://civitai.com/models |
| MiniMax | Not read | https://platform.minimax.io/protocol/terms-of-service |
| Cloudflare | R2 storage only | https://www.cloudflare.com/terms/ |

## Remake list for a paid release

Jørgen's answer to this audit's Review: the desktop release is free for now and paid later, and for the paid one he wants a list of what needs remaking. This is that list, written 2026-10-10. It covers the files `node tools/release/files.mjs --flavor vanilla --json` lists (3,151 files, 2,082 of them assets). The larger local-only build adds 443 files; they are only counted here, and their details are in the local-only licence file, which is not in git.

How each fact is known is marked in the "Source" column: **recorded** means a log, ledger or manifest says so; **matched** means I compared the shipped picture with the candidate pictures and found the same image; **inferred** means no record, only a chain of evidence. GPU times are my estimates for the RTX 3080 and are marked as such.

| # | Group | Audit item | Shipped files | Remake needed | Job size |
|---|---|---|---|---|---|
| A | Opening theme, `night` loop, opening film | 1 | 4 (2 tracks, 2 videos, 47.7 MB) | Yes, unless the YuE2 licence allows sale | Largest: a new sung theme, then retime and re-render the film |
| B | One Obsession pictures | 3 | 8 (4 pictures, 4 thumbnails) | Yes, 4 pictures | About 20 min GPU |
| C | Voices cloned from MiniMax references | 5 | 94 clips | Yes, 2 references and 94 clips | Under 1 h GPU, plus 2 voice approvals |
| D | Lyria 2 loops | 6 | 3 | Only if Google's terms forbid sale, and then Lyria cannot be the replacement | 3 loops |
| E | Meshy models | 4 | 127 (58 models, 69 textures) | No, on either plan | None; credit line only |
| F | Clips with no recorded engine | 8 | 0 | No | None |
| G | Nova Anime AM | 9 | 0 | No | None |
| H | Mio phone portrait lineage (IP-Adapter) | the IP-Adapter row under Images | 4 | Only if the adapter's terms forbid sale | 1 portrait, 3 derived pictures |

Totals: 113 files need remaking if every open question goes the worst way for A to D (4 + 8 + 94 + 3 = 109, plus the 4 files in H = 113). E to G need nothing.

### A. YuE2 music (audit item 1)

| File | What it is in the game |
|---|---|
| game3d/audio/music/opening.mp3 | The opening theme. It is the soundtrack of the opening film and of the live opening page (game3d/opening/op.js). |
| game3d/audio/music/night.mp3 | The `night` loop. Plays in the evening after work and in the dorms (game3d/js/places/lifecycle.js). |
| game3d/assets/opening/film/opening-1080.mp4 | The opening film at 1080p. The theme is mixed into its soundtrack. |
| game3d/assets/opening/film/opening-720.mp4 | The same film at 720p. |

Source. `opening.mp3` is recorded: tools/assets/assets.json names YuE2 and the TV edit by tools/opening/tv_edit.py. `night.mp3` is recorded in art/SOUND.md (music round 6, Review music-round-6: YuE2 instrumental "evening-1", cut to a 132 s loop with tools/make_loop.py). tools/assets/assets.json still calls `night` a Lyria loop, which is the old game's file; that entry is stale. The film's soundtrack is the theme by construction (game3d/opening/timeline.js reads the theme's beat grid); I did not decode the videos to check.

Remaking. `night` is one loop: any new track cut with make_loop.py, no GPU. The opening theme is the big one. The film's cuts follow the theme's beat grid (tools/opening/analyze_song.py, game3d/opening/timeline.js) and the karaoke subtitles follow the sung syllables (tools/opening/karaoke.json, game3d/opening/lyrics.js, game3d/opening/subtitles.js). A different theme means a new sung song, a new beat analysis, new syllable timings, retimed shots and a re-render of both videos with opening-film.mjs, which holds the whole GPU while it renders (render length not measured). The cheaper way out is to settle item 1 by reading the YuE2 licence.

### B. One Obsession pictures (audit item 3)

Item 3 says five Photos collectibles; the comparison shows four. The fifth, the early train, is RDBT.

| Photo collectible (where it is found) | Files | Matched to | Model |
|---|---|---|---|
| Office company, the cat on the keyboard (B2 copy room) | game3d/assets/photos/cat.webp, cat-thumb.webp | art/candidates/photos-1/cat-a-oneobs-13.webp, seed 13 | One Obsession |
| Spring garden (forecourt garden) | photos/cherry.webp, cherry-thumb.webp | cherry-a-oneobs-11.webp, seed 11 | One Obsession |
| At the fountain, pigeons (plaza) | photos/pigeons.webp, pigeons-thumb.webp | pigeons-a-oneobs-13.webp, seed 13 | One Obsession |
| Summer night, fireworks (dorm courtyard) | photos/fireworks.webp, fireworks-thumb.webp | fireworks-b-oneobs-11.webp, seed 11 | One Obsession |
| Early train, the monorail (security room), for comparison | photos/monorail.webp, monorail-thumb.webp | monorail-a-rdbt-11.webp, seed 11 | RDBT, no remake |

Source: matched (the pictures are identical to the candidate files at 24x24 greyscale, mean difference under 0.3 of 255), and the model is recorded in reviews/photos-1/review.json and the dashboard log. The thumbnails are resized copies.

Scenery. No scenery background that ships is from One Obsession, so the credit line "Scenery and the Photos collectibles" in notes/credits-vanilla.txt should say only the Photos. What ships as scenery, and its source:

| Shipped file | In the game | Matched to | Model (recorded) |
|---|---|---|---|
| game3d/assets/opening/copyroom.webp | B2's copy room painting in the opening film | art/approved/copyroom/copyroom-copier-4203.webp, seed 4203 | RDBT (art/production/manifest.json, batch L1) |
| game3d/assets/opening/window/eric-window.webp, mio-window-look.webp, mio-window-phone.webp | Eric and Mio behind the train window in the film | art/candidates/portraits/opening-window-1 (eric-flip-4103, look-miophone-i2i-4201-4402, miophone-i2i-4201) | RDBT, img2img of approved portraits (prompts.json) |

The One Obsession scenery that exists is all tests and never shipped: ten renders in art/production batch R (copy room, shootout, swim, volleyball, romance, two seeds each), the promptlab scenery workflows, and the plates for the older painted opening (tools/opening/layers.py and detail_pass.py, in art/opening/final). The live opening code loads no pictures besides the portraits, `copyroom.webp` and the three window pictures (game3d/opening/paint.js, op.js), so none of those plates are in the film. That answers audit item 11 for these tests; the film's own frames carry no record, so this is inferred from the code.

Remaking: re-render the four pictures with RDBT at 1152x864 (the photos-1 round already has three RDBT seeds for each, rated flat, saturated or stiff, so the prompts need work: one change per pass). About 4 pictures x 3 or 4 passes x 3 seeds, around 40 renders at roughly 25 s each, about 20 minutes of GPU (estimate). Then convert to webp and make the thumbnails. Jørgen said he does not want to pick flavour pictures, so I choose.

### C. Voices cloned from MiniMax references (audit item 5)

Two references are MiniMax stock voices. In tools/voice/cfg.py `speakers()`, Emi uses `emi-slice12` and the announcer (`ann`, same as `conductor`) uses `lift-announcer`. Source: recorded. tools/island_audio/voices.py names the voices (Japanese_CalmLady for Emi, Japanese_KindLady for the announcer), tools/island_audio/refs.py cut `emi-slice12` from the old game's lines, and tools/slice_voices.mjs made those lines with `minimax/speech-2.6-hd` (272 calls of that model in tools/spend.json). No other speaker in the manifest uses these two.

Clips derived (94 files in game3d/audio, 2.8 MB):

| Speaker | Clips | What they are in the game |
|---|---|---|
| Emi | 92: 87 English lines, 2 Japanese lines, 3 overheard Japanese lines | Emi's spoken lines across days 1 to 5 (the files are in the list below) |
| Train and lift announcer | 2: `ln-1llfryn` (「つぎは 本社.」) and `oh-pcpzah` (「この電車は、折り返し本土行きとなります。」, overheard) | The announcements on the monorail |

Emi's 92 keys, each `game3d/audio/<key>.mp3`:

```
ln-109w6by ln-10ucr60 ln-12552q0 ln-13k4efw ln-13l352p ln-13sjg5k ln-13thoeb ln-15ayayw ln-16hb9fa ln-16yqtyl ln-17mmp6k ln-185x41c ln-18oodus ln-197nwhr ln-19bagsy ln-19idlea ln-19ileav ln-1ajzdw2 ln-1dx8kgf ln-1e93yrw-carina ln-1f0kzzy ln-1faal93 ln-1fvs1hj ln-1fwjbau ln-1gjnebk ln-1jmaqpg ln-1jryp4c ln-1k1dpnf ln-1knpnpe ln-1l0afpr ln-1lf08x1 ln-1pocn7f ln-1qgvyhu ln-1r2r5kh ln-1rarxx8 ln-1tozhxb ln-1tswwrc ln-1u4ekev ln-1ux7zwc ln-1vbhh0z ln-1wkauar ln-1wyfipz ln-1yywwuz ln-215lc5 ln-5p13c1 ln-5vxxmi ln-6h1djp ln-754za5-carina ln-7edg8a ln-8jd46d ln-9xhyu8 ln-a7adra ln-a7iss4 ln-bftv8e ln-btfm6m ln-c32ryv ln-cm4y2e ln-fhpyl6 ln-fuzrmx ln-fw472o ln-gdpjke ln-ho9reh ln-i1d37q ln-if476k ln-ofd9fi ln-p3b6lo ln-q0pl2x ln-qeqh9y ln-qil3fd ln-qliz7b ln-qs0kux ln-qwv2bl ln-rthfr2 ln-s1602m ln-sfkuxf ln-sjrqsa ln-t06jqz-carina ln-tetcqp ln-urxea3 ln-vd2pu4 ln-vgrtv2 ln-vla143 ln-wqtvg2 ln-xpw7lj-carina ln-y2jkyw ln-yj7446 ln-z01ofb ln-z23cbg ln-znc1wy oh-1ycryqt oh-lijly6 oh-ygq8rj
```

Not derived from MiniMax. Goro, Jun, Aoi and Ishibashi have `-ref12` references, and `rei-slice12` is also a MiniMax cut, but none of them leads to a MiniMax voice in the game.

| Reference | Used by | Clips | Source |
|---|---|---|---|
| goro-ref12 | the reader, station worker, stander, ferry traveller, two canteen and commuter background voices | 17 | Qwen3 voice design. tools/spend.json records `qwen/qwen3-tts` calls for `goro-ref` and `goro-ref-long` on 2026-09-24, and commit 25d609a98 (21:04 that evening) replaced the `design` entries in tools/slice_voices.mjs with the 13 to 15 s `-ref12` files. The step from `-ref-long` to `-ref12` is inferred. |
| aoi-ref12 | Aoi, and the swimming-club member | 54 (50 + 4) | Same, from `aoi-ref` and `aoi-ref-long` |
| ishibashi-ref12 | the gate guard | 48 | Same ledger entry `ishibashi-ref-long`; the earlier clone source was audition take `guard-3`, a designed voice |
| jun-ref12 | nobody in the current manifest | 0 | Same, from `jun-ref` and `jun-ref-long`. Only the old game used Jun |
| rei-slice12 | nobody; Rei uses `rei-design` (Review rei-voice-1, 2026-10-09) | 0 | MiniMax Japanese_ColdQueen, so do not use it for her again |

So the audit's Voice table row for goro, jun and aoi can be read as settled: Qwen3-designed, not MiniMax.

Remaking Emi and the announcer: design a new reference for each with Qwen3-TTS VoiceDesign from a written description, put each in a Review item (Emi's voice changes, so Jørgen approves it), then re-voice the 94 clips with the voice-clips skill. Each clip is made as about three takes and the best one passes the checks, so about 280 takes, which I estimate at under an hour of GPU. The rest of the cast does not change.

### D. Lyria loops (audit item 6)

| File | In the game |
|---|---|
| game3d/audio/music/calm.mp3 | The default daytime loop: the train and every place without its own loop |
| game3d/audio/music/lively.mp3 | The loop in the station security room (the gate) |
| game3d/audio/music/office.mp3 | The loop in the B2 office |

Source: recorded for the originals. tools/spend.json logs `google/lyria-2` calls on 2026-09-24 17:34 that wrote art/music/calm.wav, lively.wav, office.wav (and night.wav, which has since been replaced, see A). The shipped files are loop cuts of those originals (tools/make_loop.py, byte-different from the legacy copies); that link is inferred. Lyria 3 Pro was used in rounds 4 and 5 of the music work only, and none of that shipped.

If Google's terms allow sale, nothing to do. If they forbid it, Lyria cannot make the replacement, and the project has no other music engine that passed (art/SOUND.md rejected Stable Audio 3 and ACE-Step; YuE2 is item A). The three loops of 25 to 30 s would then come from a licensed track or a composer. A Lyria 2 take costs about $0.12 (rep.mjs estimate).

### E. Meshy models (audit item 4)

127 files (about 65 MB with their small data files): 58 `.glb` models and animation clips (43 MB) and 69 texture images, in game3d/assets/characters/ (aoi, carina, emi, guard, kenji, kuro, kuroda, mio2, mori, rei, four swimwear sets, five crowd bodies), game3d/assets/eric/ and game3d/assets/mio/. In the game they are the people the player sees walking, running and sitting. The 34 `.json` files beside them are ours (idles and gesture poses), and station.glb, monorail.glb and planting.glb are built in Blender, not Meshy.

Source: recorded. tools/characters/meshy.py calls the Meshy API, and the task records (169 files under art/parts/*/meshy and tools/characters/out) show 62 image-to-3D, 52 rig, 34 retexture and 21 animation tasks between 2026-09-28 and 2026-10-09 that used 1,698 credits. The API, auto-rig and animation library are paid-plan features and 1,698 credits is far beyond a free account (inferred, not read from billing). Jørgen's own note of 2026-09-29 mentions "1050 points" in one day.

Remaking: none on either plan. Paid-plan output is ours. Free-plan output is CC BY 4.0, which allows sale with the credit line that notes/credits-vanilla.txt already carries. Confirm with the billing history and that nothing went to Meshy Community, then keep the credit line.

### F. Clips with no recorded engine (audit item 8)

None remain. On 2026-10-10 the asset lifecycle (#419) retired 602 old takes that no line in game3d/audio/manifest.json plays; 157 of them were missing from tools/voice/clips.json, and they now sit in art/production/retired/2026-10-10/. All 1,807 voice clips that ship are in both the manifest and clips.json. For 764 of them the last run's report (~/ai/game3d-voice/report.json) names the engine, `qwen`. For the other 1,043 the evidence is that only the pipeline writes clips.json and that its edge-tts fallback, which would also record the line in tools/voice/edge.json, has no entries (that file does not exist and the report's fallback list is empty). So their engine is inferred to be Qwen3-TTS, not recorded per clip. The other 49 audio files that ship are sound effects, ambience and music.

### G. Nova Anime AM (audit item 9)

No shipped file used it. Every round behind the shipped portraits, the copy room painting and the window pictures records `rdbtAnima` as the model (prompts.json, production manifest), the two other pictures were matched to their RDBT sources, and the two Nova renders in the dashboard log (2026-09-27 and 2026-10-05) match no shipped or local-only picture. One risk to know: `comfy.anima()` in tools/comfy.py defaults to Nova when a script passes no model, so a future script that forgets `model=` would use it without saying so.

### H. Mio phone portrait and the IP-Adapter (the IP-Adapter row under Images)

This row was "unclear"; it now has files.

| File | What it is |
|---|---|
| game3d/assets/portraits/mio-phone.webp | Mio looking at her phone, in dialogue |
| game3d/assets/opening/portraits/mio-phone.webp | The larger copy of it for the opening |
| game3d/assets/opening/window/mio-window-phone.webp | Mio behind the train window, on her phone |
| game3d/assets/opening/window/mio-window-look.webp | Mio behind the train window, looking up |

Source: matched and recorded. The portrait is `mio-phone-5` blendk25-3501-exact-3401-v2, whose face came from `ipa7a-1001` in art/candidates/portraits/mio-phone-2 (an IP-Adapter round: mio-phone-2 has workflow-ipa.json and workflow-ipa7.json; art/candidates/portraits/mio-phone-3/geom.py and composite.py name it as the base). The two window pictures are img2img of that portrait (opening-window-1 prompts.json). The other window picture, Eric's, is img2img of his approved portrait with no adapter. Remaking, only if the IP-Adapter or DINOv3 terms forbid sale: redo the phone portrait with RDBT and the inpainting patch alone, then the two window pictures from it. One portrait and three derived pictures, a few GPU minutes plus Jørgen's approval of the phone face again.

### In the local-only build

The extra 443 files add: 31 voice clips that use the MiniMax-derived Emi reference (group C), 46 clips that use `aoi-ref12` (no action), 3 more Meshy models (group E, no action), and 1 picture that might descend from the group H portrait. None of its 39 pictures comes from One Obsession or Nova Anime AM (all trace to RDBT), and it ships no YuE2 or Lyria music of its own. Paths and details are in the local-only licence file.
