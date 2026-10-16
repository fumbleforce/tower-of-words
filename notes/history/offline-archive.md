# Earlier game prototypes

Jørgen moved the retired Godot, visual novel, island and pixel experiments out of the active checkout on 2026-10-13. The local archive is in `../bk-jap/retired-20261013-212111-288827`, relative to the main repository. Files retain their original repository paths inside that archive. Its inventory records the preserved files and checksums.

The bible keeps the original paths as historical citations. Archived pictures and pages are available from that local archive, rather than the review server. Current rules and approved decisions remain in GUIDE.md and docs/game/. The earlier rules and verdicts still cited by the bible are preserved in [GUIDE-history.md](GUIDE-history.md).

## Remaining local work

The next cleanup on 2026-10-13 preserved local work in `../bk-jap/remaining-cleanup-20261013/`. Each backup keeps its original repository paths and a checksum manifest. The capture and art output backup contains 59,428 files. These outputs remain at their existing checkout paths so local reviews and showcases can still load them. Git ignores the recorded job directories and tool state.

The `source-recipes/` backup holds obsolete figure tools and island scene trials, the old Carina voice plan, and original copies of the source files preserved during this cleanup. Reusable tools, voice transcripts and workflow recipes are in Git. The local Rei outpaint settings are saved as `tools/workflows/anima-outpaint-rei-rf-2105.json`. These backups are on the same machine, outside Git.

## Render scripts

On 2026-10-16 the dead one-off image render scripts moved out of the checkout to `../bk-jap/2026-10-16-render-scripts/`, each under its original repository path, with a `manifest.json` of sha256 checksums. Scripts that the game, the checks, the skills or the anime opening still depend on stayed in place, and so did every output, saved ComfyUI workflow and Review viewer. Notes and bible citations keep the old paths.

## Loose tools scripts

On 2026-10-16 thirty-one loose files in `tools/` moved out of the checkout to `../bk-jap/2026-10-16-tools/`, each under its original repository path, with a `SHA256SUMS` manifest. Nothing live ran or imported them, and none had changed since 2026-10-02. They were the prompt-lab batch with its monorail page, the Replicate voice slicer and its helpers, the video test scripts, and several one-off page builders. The top of `tools/` and `game3d/tools/` is listed in each folder's `layout.json`, and `npm run check` refuses a new loose file there. Notes and bible citations keep the old paths.

## Audio scripts

On 2026-10-16 the old audio scripts that tools/audio/make.py replaced moved out of the checkout to `../bk-jap/2026-10-16-audio-scripts/`, each under its original repository path, with a `SHA256SUMS` manifest. The song generators the sound route still uses (tools/island_audio/song_gen2.py, and song_gen.py which it imports), the voice scripts in tools/island_audio/ and the committed round reports stayed in place, and the notes and presets keep the old paths.

## Chibi kit, old bodies and character tools

On 2026-10-16 (#643) the Meshy chibi kit, the old Mio, the VRM preview, every code-built body, tools/creator, tools/characters/parts and tools/characters/work moved out of the checkout to `../bk-jap/2026-10-16-characters/`, each under its original repository path, with a `SHA256SUMS` manifest (the retired model folders are also in `art/production/retired/2026-10-16/`). The parts renderer and clip retargeter the character build still uses stayed, as tools/characters/steps/render_bl.py and tools/characters/idle/retarget-clips.js.
