# Consistent characters: local, training-free options

Research note, 2026-09-27. Scope set by Jørgen: no model training. Find what we can run locally on the 3080 (10 GB, about 8 GB free) to keep the approved cast on-model, then test it.

Status: tested on 2026-09-27 (evening). Results and every render: legacy/proto2/consistency/index.html (http://127.0.0.1:8771/legacy/proto2/consistency/). Scripts: legacy/proto2/consistency/run.py, score.py, build.py; loadable workflows in legacy/proto2/consistency/workflows/.

## Verdict

No single method wins every shot. Two are worth keeping, for different jobs:

1. **Anima IP-Adapter (Character_Reference) on RDBT, for portraits, sprites and close shots.** Closest faces, hair, bun, streak and makeup of everything tested (mean CCIP 0.039 against 0.067 for text only), in the approved portrait's own line style, at 32 s per image (5 s over plain RDBT). The catch: it also copies the portrait's plain background, and sometimes its props and expression (Saki's book, her grin). Rooms mostly vanish, even at strength 0.6 and with the portrait cut out onto white (then the background goes white). That is fine for dialogue sprites and portraits, which have plain backgrounds anyway, and bad for scenes.
2. **Qwen-Image 2.1 fix-up after an RDBT render, for scenes.** The RDBT picture goes in with the approved portrait, and the character comes back tighter (CCIP 0.048) with the room, light, outfit and framing kept. About 90 s per fix on top of the 27 s render, 8.6 GB peak. In two-person shots it tends to re-pose both women like their portraits (3 of 4 seeds), so for pairs fix one person at a time or use it only on solo shots.

Also found:
- Text only (today) was better than feared on this test: every face was already nearest to its own portrait. The visible drift was Saki's hair (red, teal or purple underneath, 2 of 12 tagged by the tagger) and Kuro's lipstick bleeding onto Saki in pairs.
- img2img from the portrait holds identity (0.043) but can't change pose or framing. Keep it for outfit and expression variants, as GUIDE already does for expressions.
- The head repaint beside the portrait (no installs) helps a little (0.058) and keeps the scene, but copies Saki's coloured underside and turned her beauty mark into a red mark. Not worth the 43 s.
- FLUX.2 klein 4B barely changes the render at 4 steps (0.059, 14 s). Not useful as a fixer.
- SDXL IP-Adapter Plus on One Obsession XL is the worst (0.125; 25% pass): wrong style, pastel colours, a third person in pair shots. Drop it.
- CCIP's stock threshold (0.178) is too loose for our cast: Kuro and Mio are only 0.114 apart, Sumi and Nanami 0.054. Use "the nearest of the 18 approved portraits is the right one" plus a limit around 0.08 to 0.10, and the WD tagger for glasses, hair colour and build words.

LoRA training is the usual answer and would work (kohya sd-scripts has `anima_train_network.py`, about an hour per character on a 12 GB card), but it is out: Jørgen doesn't want to train models.

## Test results

Kuro and Saki; café in a new outfit, sitting at a desk seen from the side, and both together in a corridor; seeds 101, 202, 303, 404; 24 faces per method. Pass = the nearest approved portrait is the right one, CCIP under 0.10 and no banned tag. Seconds are per finished image on the 3080 (Godot held about 3.3 GB of VRAM for part of the run); fix-up rows include the 27 s RDBT render.

| Method | Mean CCIP | Pass | Banned-tag hits | s/image | Peak VRAM | What I see |
|---|---|---|---|---|---|---|
| RDBT text only (baseline) | 0.067 | 83% | 2 (Saki blue, purple underside) | 27 | 7.0 GB | Kuro close; Saki's underside colour and fringe drift; lipstick bleed in pairs |
| Head repaint beside the portrait | 0.058 | 92% | 0 | 70 | 7.4 GB | keeps the scene, small gain, beauty mark exaggerated |
| img2img from the portrait, 0.7 | 0.043 | 100% | 0 | 29 | 8.0 GB | keeps identity, loses the scene and pose |
| **Anima IP-Adapter, strength 1.0** | **0.039** | 96% | 1 | 32 | 8.0 GB | best identity; plain background and portrait props leak in |
| Anima IP-Adapter, strength 0.6 | 0.042 | 100% | 0 | 32 | 7.7 GB | nearly as close; background still plain |
| Anima IP-Adapter, cut-out portrait, 0.8 | 0.044 | 92% | 2 (Saki's teal streak, on-model) | 36 | 7.7 GB | background goes white instead of mint |
| **Qwen-Image 2.1 fix-up** | 0.048 | 92% | 1 | 118 | 8.6 GB | keeps the RDBT scene; re-poses pairs like the portraits |
| FLUX.2 klein 4B fix-up | 0.059 | 96% | 0 | 41 | 8.1 GB | hardly changes anything |
| SDXL IP-Adapter Plus (One Obsession XL) | 0.125 | 25% | 5 | 14 | 8.4 GB | wrong style and colours; extra person |

Bugs found and fixed during the run: the repaint, Qwen and klein prompts first asked for "the same glasses" for Saki, and all three added glasses to her. Those rows were re-rendered with a feature list per character. Lesson for agents: identity prompts must list only that character's own features.

## What Anima is, and why it matters here

Anima (CircleStone Labs with Comfy Org) is a 2B diffusion transformer fine-tuned from NVIDIA Cosmos-Predict2-2B, with the Qwen3 0.6B text encoder and the Qwen-Image VAE ([model card](https://huggingface.co/circlestone-labs/Anima)). RDBT, One Obsession Anima and Nova Anime AM are fine-tunes of it ([RDBT on Civitai](https://civitai.com/models/2356447/rdbt-or-anima)).

What follows from that:
- Nothing built for SDXL works on it: SDXL IP-Adapters, InstantID, PuLID, PhotoMaker, reference-only attention and SDXL ControlNets all target the SDXL UNet. Anima needs its own adapters (the Anima LLLite patches, the Anima IP-Adapter, Anima regional conditioning).
- An adapter trained on Anima base should load on RDBT, but RDBT is a heavy fine-tune and changes how add-ons behave. One test found a character LoRA that held on five Anima fine-tunes "runs wild" on RDBT with the trigger word alone, and only settled once hair, fringe and outfit were spelled out in tags ([lilting.ch](https://lilting.ch/en/articles/anima-derivatives-character-lora-portability)). Expect the same with the IP-Adapter: keep the full character block in the prompt.
- RDBT's author says to always name a style or it wanders ([Civitai](https://civitai.com/models/2356447/rdbt-or-anima)), which matches our style-anchor rule in GUIDE.

## The options

This table is the research before the test; the measured results are in "Test results" above. "Ours" means it runs on the models we use for the cast (RDBT and the other Anima fine-tunes). VRAM is for the 3080 with about 8 GB free and 63 GB of system RAM for offload.

| Method | Anime faces | Ours (RDBT) | Local on 10 GB | Setup | Expected quality | Good for |
|---|---|---|---|---|---|---|
| Text prompt only (today) | yes | yes | yes, 25 s | none | drifts: hair, glasses, age, build | first drafts |
| LoRA per character | yes | yes | yes, about 1 h per character | high | best | rejected: no training |
| Diptych repaint of the head with the portrait beside it (LLLite inpainting-v2) | yes | yes | yes, about 40 s | none, all installed | unknown, test first | fixing face, hair, glasses on a finished render |
| img2img from the approved portrait | yes | yes | yes | none | holds identity, but can't change pose or framing much | outfit and expression changes (GUIDE already does expressions this way) |
| Anima IP-Adapter, Character_Reference (LuciferTC, SigLIP2) | trained on anime | yes, Anima-native | yes, about +1.5 GB | small: one node, 2 GB of weights | unknown; young project | identity during generation, in house style |
| Anima IP-Adapter (Wenaka/CircleStone, Qwen3-VL embedding) | yes | yes | yes | n/a | n/a | weights not published, only a dataset |
| Qwen-Image 2.1 edit, int8 (7B, up to 10 refs) | yes; a community anime character-consistency LoRA exists | no, own model; used as a fix-up pass | yes with offload: 7.3 GB model + 9.4 GB text encoder (int8) | medium: about 17 GB download, native nodes | likely the strongest local identity | fixing a render against the portrait; new angles; pairs with one ref each |
| Qwen-Image-Edit-2511 | yes | no | only as Q4 GGUF (13 GB) with offload, slow | medium | good, superseded by 2.1 | skip |
| FLUX.2 klein 4B, fp8 (multi-reference) | fair, not anime-trained | no | yes: 4 GB model + 5.6 GB text encoder | medium: about 10 GB download | unknown on our style; fast (4 steps) | quick edits; Apache licence |
| FLUX.1 Kontext dev / OmniGen2 | fair | no | GGUF only | medium | older, beaten by the two above | skip |
| SDXL IP-Adapter Plus / Plus Face (h94) on Illustrious | partly (trained on photos) | no, SDXL only | yes | small: cubiq node (unmaintained since 2025-04) + 3.4 GB | loose likeness, pulls the reference's pose and colours | only if we move a character to One Obsession XL or WAI |
| NoobAI IP-Adapters (noobIPAMARK1, Style IPAdapter) | yes | no, SDXL only | yes | small | mostly style transfer | skip for identity |
| InstantID, PuLID, PhotoMaker | built on real-face recognition | no, SDXL/FLUX only | yes | medium | built for photo faces | skip for this cast |
| Reference-only / ReferenceNet | yes | no (UNet attention trick; no Anima version found) | yes | small | loose | skip |
| FLUX Redux | style | no | yes | medium | style and layout, weak identity | skip |
| FaceDetailer (Impact Pack) with an anime face detector | yes | yes, it's just masked inpainting | yes | small | only as good as the identity signal fed into it | the automatic crop-and-repaint step for any method above |
| Anima Regional Conditioning (Sen-sou) | yes | yes, Anima-native | yes | small | reduces bleed between two people | pairs, kisses, groups |
| Cloud multi-ref (Seedream 4.5, Nano Banana, FLUX 2 Pro on Replicate) | yes | no | cloud, small budget | none | strong identity, different style | hard shots when local fails; the result then gets an RDBT pass |

Sources: [Anima IP-Adapter node](https://github.com/LuciferTC9527/ComfyUI-Anima_IP-Adapter), [its weights](https://huggingface.co/LuciferTC/Anima-IP-Adapter), [Wenaka's node](https://github.com/Wenaka2004/comfyui-anima-ipadapter) (no weights; [dataset only](https://huggingface.co/Wenaka/anima-ip-adapter-dataset)), [Qwen-Image 2.1 ComfyUI files](https://huggingface.co/Comfy-Org/Qwen-Image-2.1), [Qwen-Image 2.1 licence and features](https://markhuang.ai/news/qwen-image-2-1-7b-commercial-license), [Qwen-Image 2.1 explained](https://locallyuncensored.com/blog/qwen-image-2-1-explained.html), [Qwen-Image 2.1 LoRAs](https://huggingface.co/WarmBloodAban/Qwen-Image-2.1-LoRAs), [FLUX.2 klein in ComfyUI](https://docs.comfy.org/tutorials/flux/flux-2-klein), [klein 4B fp8 weights](https://huggingface.co/black-forest-labs/FLUX.2-klein-4b-fp8), [editing model comparison](https://builderai.tools/blog/ai-image-editing-flux-kontext-qwen-image-edit-step1x), [IP-Adapter for anime characters](https://lilting.ch/en/articles/novelai-precise-reference-local-ipadapter), [cubiq IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus), [NoobAI style IPAdapter](https://civitai.com/models/1233692/style-ipadapter-for-noobai-xl), [Anima Regional Conditioning](https://github.com/Sen-sou/Comfyui-Anima-Regional-Conditioning), [Anima multi-character bleed discussion](https://huggingface.co/circlestone-labs/Anima/discussions/202), [kohya Anima LoRA docs](https://github.com/kohya-ss/sd-scripts/blob/main/docs/anima_train_network.md), [Anima TrainFlow timing](https://ai-hardware-zukan.com/en/anima-trainflow-simple-one-page-lora-trainer-for-b-portable-en/).

Notes on the table:
- InstantID, PuLID and PhotoMaker get their identity from a face-recognition model trained on photographs. I could not re-check anime results this session (the search was refused), so treat "skip" as my judgement, not a tested result.
- The Anima IP-Adapter node exposes `strength` (0 to 2), `ref_image_size` (512), `ip_cfg_scale` (4) and `use_lora`; there is no published guidance on settings.
- Qwen-Image 2.1's own ComfyUI template runs 25 steps at CFG 1 at about 1 MP, with a prompt that names the images as `<image1>`, `<image2>`. Image 1 is the canvas that gets edited; the rest are references.

## Recommended local pipeline

Pick the path by shot type. Both start from the dashboard's character preset (look, build line, outfit, character negative) and RDBT at Euler A, 30 steps, CFG 5.

**Portraits, dialogue sprites, close shots (plain background wanted):**
1. RDBT with the Anima IP-Adapter applied to the model: loader `AnimaIPAdapterLoader` (ip_adapter-Character_Reference-10.safetensors), then `AnimaIPAdapterApply` with the approved portrait as `ref_image`, strength 0.6 to 1.0, ref_image_size 512, ip_cfg_scale 4, use_lora on. Keep the full character block in the prompt.
2. Background removal as today (rembg ISNet anime) if the sprite needs a cutout.
3. Score, reject over the limit.

**Scenes with a room (one character in focus):**
1. RDBT text render as today.
2. Qwen-Image 2.1 fix-up: `TextEncodeQwenImage21` with image_1 = the render and image_2 = the approved portrait, a prompt that names only that character's own features ("her face, glossy black chin-length bob with a straight fringe, dark red eyes and the beauty mark under her left eye (she wears no glasses) match the woman in <image2>; keep pose, clothing, background, framing and art style of <image1>"), `QwenImage21Cache`, KSampler 25 steps, CFG 1, euler/simple. Workflow: legacy/proto2/consistency/workflows/consistency-qwen.json.
3. Score; if the fix drifted, keep the RDBT original.

**Two people:** RDBT for the composition, then the Qwen fix-up one character at a time (the render plus one portrait, naming which woman to change) rather than both at once, which re-posed them. Anima Regional Conditioning (installed, not yet tested) is the next thing to try against the lipstick and hair bleed.

**Outfit or expression variants of an approved image:** img2img from the portrait (denoise 0.6 to 0.7) or GUIDE's face inpainting, as today.

### How it would plug into the dashboard (tools/imagegen/)

Not built; the dashboard was left untouched.
- A per-run "identity" option: none / adapter / qwen fix. The character preset's `portrait` field already points at the approved image, so the adapter and the fix need no new data.
- tools/comfy.py gets `anima(..., ipa=(ref, strength))` and `qwen21_fix(render, ref, features)`; the node wiring is in legacy/proto2/consistency/run.py (`m_animaipa`, `m_qwen`).
- Presets get `features` (the character's own identity list, for the Qwen prompt) plus `ban_tags` and `must_tags` for the tagger (Kuro: ban `tinted_eyewear`, `sunglasses`; Saki: ban `purple_hair`, `glasses`).
- After each render, legacy/proto2/consistency/score.py (moved to tools/) runs on the CPU in ~/ai/consist/.venv and writes CCIP, nearest portrait and tag hits into the render's log line, so the dashboard can show and sort by them and agents can reject by number. A few seconds per image on the CPU.
- The Qwen fix needs about 8.6 GB peak; the dashboard's GPU session already handles ComfyUI's memory, but it can't run next to the LLM server.

## Measuring drift automatically

- Identity: CCIP from deepghs ([model](https://huggingface.co/deepghs/ccip), [imgutils docs](https://dghs-imgutils.deepghs.org/main/api_doc/metrics/ccip.html)). It compares two anime character images and returns a difference from 0 (same) to 1; the tuned "same character" threshold is 0.1785 (F1 about 0.94 on its benchmark), which is too loose for our cast (see the verdict). It expects one character per image, so crop each person first (imgutils also has anime face and person detectors). Runs on the CPU with ONNX.
- Features: a WD tagger (also in imgutils) lists danbooru tags per image. Check hair colour, `glasses` versus `tinted_eyewear` and `sunglasses`, `dark_skin` or `tan` on pale characters, and `muscular` or `plump` for build drift.
- Hair and skin colour: compare the mean Lab colour of a hair patch and a cheek patch with the same patches on the portrait (colour distance ΔE). Needs the face box from the detector.
- Age drift (Kiyoko) has no good automatic measure; keep that one by eye.

## Installed for this test (2026-09-27)

Done in the main session with Jørgen's approval:
- custom_nodes: ComfyUI-Anima_IP-Adapter (LuciferTC9527), ComfyUI_IPAdapter_plus (cubiq), Comfyui-Anima-Regional-Conditioning (Sen-sou). All three load in the current ComfyUI.
- models/ipadapter: ip_adapter-Character_Reference-10.safetensors (0.5 GB), ip-adapter-plus_sdxl_vit-h.safetensors (0.85 GB); models/siglip2/siglip2-base-patch16-512 (1.5 GB); models/clip_vision/CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors (2.5 GB).
- Qwen-Image 2.1: qwen_image_2.1_int8_convrot (7.3 GB), qwen3vl_8b_int8_convrot text encoder (9.4 GB), qwen_image_2.1_vae_bf16 (0.7 GB).
- FLUX.2 klein 4B: flux-2-klein-4b-fp8 (4.1 GB), qwen_3_4b text encoder (8.0 GB), flux2-vae (0.3 GB).
- Scorer: ~/ai/consist/.venv (Python 3.12, dghs-imgutils, onnxruntime on the CPU) with the CCIP, WD tagger and anime face and person detector models.

Can go again if space matters: FLUX.2 klein (12.4 GB) and the SDXL IP-Adapter with CLIP-ViT-H (3.4 GB) lost clearly.

## Risks and open questions

- The Anima IP-Adapter pulls in the reference's background and sometimes its props and expression. Untested fixes: a reference with a busy neutral background or several references, a lower strength only in the later steps (the node has no start/end setting), or the adapter only for the head followed by an RDBT pass for the room.
- Qwen-Image 2.1 is under the Qwen Research Licence: fine for experiments; read the licence before any image made with it ships in the game.
- Qwen is slow (about 90 s per fix) and needs 8.6 GB, so it's a finishing step for picked renders, not for every seed.
- Kuro drifted little in this test, so the tinted-glasses and age problems from GUIDE weren't really exercised. Kiyoko's age and Kaori's build need their own run; the tagger catches build words, but age stays a prompt and eye check.
- CCIP separates our cast poorly where designs are close (Sumi and Nanami 0.054, Kuro and Mio 0.114). The nearest-portrait check covers that; the approved sprites (0.004 to 0.03 against their portraits) are a good calibration set when more characters are added.
- Two-person bleed (Kuro's dark lipstick on Saki) is a known Anima limit ([discussion](https://huggingface.co/circlestone-labs/Anima/discussions/202)); regional conditioning is installed but untested.
