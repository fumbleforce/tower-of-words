# GPU lock and headless browsers

All three teams follow these rules. The code is tools/gpu_priority.py (its docstring has every command) and tools/lib/browser-job.mjs.

## GPU lock

Image and model jobs (ComfyUI, TTS, LLM, Blender) hold the GPU alone.

- Take it through the GPU queue, never with a bare `mkdir` loop: `python3 tools/gpu_priority.py acquire <your name> --rank <rank> --pid $$`, or `run <name> --rank <rank> -- <command>`, or `with comfy.gpu(name, rank):` in Python. It waits until your ticket is first and writes your name to /tmp/claude-1000/gpu.lock/owner.
- Release with `python3 tools/gpu_priority.py release <your name>` after you stop ComfyUI or your model server.
- Ranks, highest first: dashboard, carina-image, carina-voice, voice, then render for everything else. Browser GPU slots sit between voice and render.
- `python3 tools/gpu_priority.py queue` shows who holds the lock and who waits.
- Check nvidia-smi first, and free ComfyUI's VRAM before an LLM or TTS job.
- A batch runner checks the owner file before every job and stops if its name is gone.
- Remove the lock only when the owner file has your name (`grep -q <your name> owner && rm -r ...`). Never remove a lock that only looks stale.

## Jørgen's image gen dashboard comes first

Agents wait while /tmp/claude-1000/gpu.priority is live. A long job asked to stop through gpu.yield exits 75 and later resumes from what is on disk. When the lock owner is `imagegen-dashboard`, he is using the GPU, so wait. The dashboard's own rules are in [tools/imagegen/README.md](../../tools/imagegen/README.md).

## Headless browser runs

- Run them through tools/lib/browser-job.mjs. Each job has its own /tmp/claude-1000/browser.lock.<pid>, so several can run in parallel.
- Up to three share the GPU in slots. They wait while all slots are busy or an image or model job holds the GPU. Software rendering only with an explicit `GL=soft`.
- Hold off while the machine is busy (load average above 24 on its 32 cores).
- A job releases its slot on every exit. A browser that won't close is killed after 10 s.
- The next browser job reclaims a slot whose owner died and kills that job's leftover Chromium. An image or model job that finds gpu.lock held by `browser-gpu-pool-v1` can run `node tools/lib/browser-gpu-slots.mjs reclaim` to free dead slots. Exclusive owners are never reclaimed.
- A long GPU render, such as a video, holds the whole GPU instead of a slot: `withBrowserJob(name, run, { gpuLock: '<name>' })` takes gpu.lock through the queue under that name and releases it on every exit. The opening video uses `opening-video-production`.
