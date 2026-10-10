# Licence audit for the desktop release (#424)

Audit date 2026-10-10. Scope: everything that ships in the desktop app's public game. A second, local-only addendum covers the extra content of the larger build. Verdicts: OK, needs action, blocker. "Unclear" says what would settle it. This is a reading of public terms by an agent, not legal advice.

Two facts hold for the whole audit:
- Every voice in the game is synthetic. No reference recording is a real person's voice (Voices below).
- AI output may not be copyrightable in some countries (human authorship is needed), so "we may use it" does not always mean "we can stop others copying it". Terms below say whether the tool's maker lets us use and sell the output.

## Blockers and actions

Blockers for a paid release (free release is fine unless noted):

1. **Opening theme and the `night` loop are YuE2 music.** The YuE2 weights are CC BY-NC 4.0. Whether that non-commercial term reaches the generated music is not settled by the model card, and the LICENSE file was not read. Settle it by reading the LICENSE in the m-a-p/YuE2-3B repository or asking the authors; otherwise replace both tracks (Lyria already makes the other three loops).
2. **36 voice clips were made with edge-tts** (Microsoft's Edge Read Aloud endpoint through an unofficial library). There is no licence for that endpoint, and Microsoft sells Azure AI Speech for commercial use. Re-voice them with the local Qwen3-TTS clones (the voice-clips skill). The files are `ann-*`, `aoi-ohayo/hi/matte/chigau`, `emi-kite/ohayo/tsugi-seki`, `guard-card/card-short/ohayo/wait`, `kenji-hi/ohayo`, `kuroda-akete/wake`, `mio-*` (akete, dashite, irete, kite, matte, ohayo, ohayo-pol, tomatte, ugoite), `mori-hello/ohayo/ohayo-dry`, `sota-*`, `yui-*` in game3d/audio.
3. **One Obsession (Anima) pictures.** Its Civitai page allows only "RentCivit"; selling generated images is not ticked. It made the five Photos collectibles and some scenery backgrounds. Free release: allowed by every reading. Paid: regenerate with RDBT (selling images is ticked there) or get the creator's written permission.

Needs action (could become blockers):

4. **Meshy plan at generation time is unknown.** Free plan models are CC BY 4.0 (commercial use allowed, credit Meshy); paid plan models are owned by us. Check the account's billing history against the task dates. Until then the credits file carries the Meshy credit line, which is harmless on a paid plan.
5. **Voices cloned from MiniMax stock voices** (Emi's reference, the train and lift announcer). MiniMax's terms of service could not be read through the fetch tool, and Replicate's page names no output licence. Settle: read https://platform.minimax.io/protocol/terms-of-service in a browser, or re-make both references with a Qwen3 VoiceDesign voice as the other cast was.
6. **Lyria music (calm, lively, office).** Made through Replicate with `google/lyria-2` and `google/lyria-3-pro`. Neither Replicate page states an output licence, and the Vertex terms for Lyria were not found. Outputs carry a SynthID watermark. Settle: Google's Lyria / Gemini API terms in a browser, and which of the two models made each loop.
7. **Stable Audio 3 ambience beds and animal calls** fall under the Stability AI Community License (free for organisations under US$1M annual revenue, you own the audio, per Stability's licence page and press coverage). The licence text itself was not read. Read it once and register if it asks.
8. **About 121 clips in game3d/audio are not in tools/voice/clips.json** (mostly `ln-*`), so their engine is not recorded. Probably older local TTS runs. Settle: regenerate them through the pipeline or find the old run logs in ~/ai/game3d-voice.
9. **Nova Anime AM terms:** its page forbids commercial use of unedited outputs. Two renders in the dashboard log used it; no shipped file records it. Settle by checking the shipped portraits' source runs; if any is Nova, repaint or re-roll it.
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
| [One Obsession Anima v4.0](https://civitai.com/models/2695493) (Photos collectibles, open scenery). Flags: sell images NO; rent on Civitai only | Civitai per-model flags | yes / no | creator name in credits | Blocker for paid (item 3) |
| [Nova Anime AM v5](https://civitai.com/models/2604424). Flags: sell images yes, but the page says unedited outputs may not be used commercially | Civitai page rules | yes / only if edited | creator credit | Unclear which shipped files use it (item 9) |
| [Anima RL LoRA v0.1](https://civitai.com/models/2583128) (CircleStone Labs). Flags: sell images yes, no credit needed | Anima licence for the model | yes / yes | none | OK |
| [Anima LLLite patches](https://huggingface.co/kohya-ss/Anima-LLLite) (inpainting-v2, lineart-1, depth, scribble; face repaints, outpaints, layout control) | Same licence as Anima base (non-commercial for the patch, not for outputs) | yes / yes | none | OK |
| Qwen3-0.6B text encoder and Qwen-Image VAE (ComfyUI loads them) | Apache 2.0 per the Qwen model cards; not individually re-fetched here | yes / yes | none required for outputs | OK |
| [Real-ESRGAN anime 6B](https://github.com/xinntao/Real-ESRGAN) upscaler | BSD-3-Clause for the repository; weights licence not stated separately | yes / yes | none for outputs | OK |
| rembg ISNet anime cut-outs ([anime-segmentation](https://github.com/SkyTNT/anime-segmentation), weights [skytnt/anime-seg](https://huggingface.co/skytnt/anime-seg)) | Apache-2.0 for code and weights | yes / yes | none | OK |
| IP-Adapter (character reference), CLIP-ViT-H, DINOv3 | Used in a few tests of the portrait work (Mio phone face); not named in any shipped asset's record. Licences not checked | n/a | n/a | Unclear: check the Mio phone portrait's run; if it used the adapter, read the IP-Adapter and DINOv3 terms |
| Mori's travel print (game3d/assets/photos/mori-lillehammer.png) | OpenAI image generation. [OpenAI terms](https://openai.com/policies/terms-of-use/): OpenAI assigns its rights in Output to the user, subject to compliance with the terms (page returned 403, summary from [secondary text](https://terms.law/ai-output-rights/chatgpt/index.html)) | yes / yes | none | OK, read the current terms once in a browser |
| ChatGPT chibi pictures used as Meshy inputs (not shipped as pictures) | Same OpenAI terms | yes / yes | none | OK |
| Five Photos collectibles (game3d/assets/photos) | One Obsession Anima, see above | yes / no | credit | Blocker for paid (item 3) |
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
| edge-tts clips (36) | Unofficial Microsoft endpoint, no licence; Microsoft points commercial users to Azure AI Speech | unclear / no | none | Blocker for paid (item 2) |
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
