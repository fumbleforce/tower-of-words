# Wednesday karaoke physical staging

In progress under #300, claim X-0681. Kenji, Hamada and the selected protagonist use the existing booth; the south bench is the player's third seat. Root owns the authored conversation, gates and rewards. These physical actions do not themselves complete a milestone.

## Contract

`await karaokeClub({state, who})` returns **true** only after the owned action finishes; cancellation returns **false**, including after a place change. Integration must check this result before awarding progression or continuing a performance branch. `finish` returns true after synchronous cleanup.

Arguments: `who` is `kenji`, `kuroda` or `eric` (the selected protagonist):

- `start`: capture the participants' prior state and seat all three.
- `group`: desktop returns to the trio/table view; phone uses medium speaker coverage. Optional `who` explicitly selects a participant; otherwise the microphone holder is framed, or Kenji before the microphone is held. `start` briefly establishes all three real seats.
- `queue`, `clearQueueExtras`: show Kenji's queue; the latter puts an already selected Hamada entry next, then retains only Kenji's first existing entry, through the actual selector. It never invents a Kenji entry on later visits.
- `receiptFront`, `receiptBack`: Hamada shows the two sides. Bakery total ¥380 and song number 0718 are deliberately different.
- `selectNumber`: enter 0718 on the real selector; the wall screen highlights Hamada's queued number.
- `offerMicrophone`, `takeMicrophone`, `keepMicrophone`, `passMicrophone`: `who` is the intended holder; ownership changes through the same physical microphone.
- `finish`: cancel outstanding movement/reaches, remove owned overlays and restore participants/camera.

No singing state or soundtrack is installed. The first native rounds are diagnostic evidence, not accepted staging. The original 0.29m table was below the standing cast's usable reach; the revision raises the actual table and its supported contents to 0.55m with the original footprint. The selector face/repair anchor remains at 0.69m.

## Music provenance and next bounded candidate

`~/ai/island-audio/song/pick.json` records the old okiro-a1 preference and e1 alternative. That is not approval to use their lyrics: `legacy/island/godot/assets/audio/README.md`, “The karaoke song”, and `legacy/island/content/lyrics_v2.md` explicitly record that Jørgen liked the music but found the lyrics weak. The a1 export ends at 85 seconds; e1 was trimmed to 63 seconds and lost its final chorus. Their export timing is marked `placeholder:true`. None is installed here.

The existing local pipeline is `tools/island_audio/song_gen.py` plus `song_gen2.py`: YuE2 int8, score-first generation, instrumental-only bar trimming, then music rendering through ComfyUI. The old female guide vocal is not Hamada's or Kenji's singing voice. Approved Lyria location music remains background and cannot stand in for a performance.

After the physical stage passes, propose one new short ordinary Japanese song, with a complete verse and refrain rather than language-drill commands. Cold-read the new lyrics before rendering. Make two bounded male-vocal candidates using the same approved lyrics and arrangement: a restrained older low-mid singer for Hamada, and a brighter conversational tenor alternative. Keep complete sung phrases and a real ending; derive duration from the score, rather than truncating to a requested timestamp. Save raw audio, score, exact settings, full lyrics and all failed takes. Check the actual lyric delivery, whole musical phrase, clipping, intelligibility and ending by listening; ASR is supporting evidence only. Present both as new singing-voice candidates for user selection, explicitly distinct from existing speech clones. No character singing or performance-completion claim ships before a candidate is picked and its timed stage is reviewed.

## Candidate result, 2026-10-07

The approved six-line original refrain was generated in two local YuE2 takes; all full recordings, settings and automated findings are in Review `karaoke-song-1`. Both are unapproved. A may omit the final phrase; B has a repeated automated word discrepancy. Neither parent nor worker could receive audio for listening in this runtime, so lyric/timbre/musical-quality approval remains pending rather than inferred from transcription. No performance state is added by this physical patch.
