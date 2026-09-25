# Local conversation AI for Amakawa

The game's free-typing moments (day 1: Emi's chat in the dorm) use Orion 26B-A4B through llama-server on `http://127.0.0.1:8190/v1`.

- One time: `tools/llm/install-launcher.sh` registers the `amakawa://` link. After that, the game's "Start it on this PC" button starts the server; the browser asks once whether to open the link.
- By hand: `tools/llm/amakawa-llm.sh` (add `LLM_CPU=1` to keep it off the GPU). Log: `~/.cache/amakawa-llm.log`.
- It frees ComfyUI's VRAM first only if ComfyUI is idle. If a render is running, llama-server fits into the remaining memory.
- Stop it: `pkill -f 'llama-server.*--port 8190'`.
- If the server isn't up, the game uses the scripted replies. Phones always use the scripted version.
- The page on GitHub Pages is https and the server is http on 127.0.0.1. Chrome may ask for permission to reach local devices the first time; Firefox allows it.
