# Project file format

Chipboy Studio saves and shares a JSON document. The current version is **5**. The importer also accepts legacy version 3 and 4 documents and raw song objects.

## Envelope

```json
{
  "format": "chipboy-studio",
  "version": 5,
  "exportedAt": "2026-11-21T21:00:00.000Z",
  "song": { "...": "see below" },
  "samples": [
    {
      "id": "sample-1",
      "name": "Kick",
      "rootMidi": 36,
      "loop": false,
      "duration": 0.42,
      "audioFile": "kick.wav"
    }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `format` | Yes for v5 | Must be `"chipboy-studio"`. |
| `version` | Yes for v5 | Integer. The current writer emits `5`. |
| `song` | Yes | A song object. |
| `samples` | No | Metadata only. Audio is never embedded. |
| `name` | No | Optional display name. `song.name` wins after normalization. |
| `exportedAt` | No | ISO timestamp written by the exporter. |

Raw song objects and v3/v4 files are accepted. A raw song is any object with a non-empty `tracks` array.

## Song

```json
{
  "name": "Pocket dreams",
  "bpm": 118,
  "speed": 1,
  "barCount": 16,
  "master": 70,
  "transpose": 0,
  "loop": { "enabled": false, "startBar": 0, "endBar": 16 },
  "tracks": []
}
```

| Field | Type | Default | Range |
| --- | --- | --- | --- |
| `name` | string | `"Untitled song"` | 1–80 characters after trim |
| `bpm` | number | `118` | 40–240 |
| `speed` | number | `1` | 0.25–2 |
| `barCount` | integer | `16` | 1–64 |
| `master` | number | `70` | 0–100 |
| `transpose` | integer | `0` | −12 to +12 semitones, applied at playback and export without changing note data |
| `loop.enabled` | boolean | `false` | — |
| `loop.startBar` | integer | `0` | 0 to `barCount - 1` |
| `loop.endBar` | integer | `barCount` | 1 to `barCount`, after `startBar` |

A song must contain 1–32 tracks.

## Track

```json
{
  "name": "Pixel lead",
  "chip": "PULSE 01",
  "voice": "square",
  "preset": "pulse50",
  "octave": 0,
  "rootMidi": 60,
  "volume": 70,
  "pitch": 0,
  "pan": 0,
  "solo": false,
  "muted": false,
  "sampleId": "sample-1",
  "effects": {
    "enabled": true,
    "cutoff": 20000,
    "resonance": 0.7,
    "reverb": 0,
    "delay": 0,
    "delayBeats": 0.75,
    "feedback": 0.35
  },
  "patterns": [[], []],
  "bars": [null]
}
```

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `name` | string | `"Channel"` | 1–80 characters. |
| `chip` | string | derived | Short hardware label such as `PULSE 01`. |
| `voice` | enum | `"square"` | `square`, `triangle`, `kick`, `noise` or `sample`. Unknown values become `square`. |
| `preset` | string | `"pulse50"` | Instrument preset ID. |
| `octave` | integer | `0` | −3 to +3. |
| `rootMidi` | integer | `60` | MIDI root used for sample playback. |
| `volume` | number | `70` | 0–100. |
| `pitch` | number | `0` | −24 to +24 semitones. |
| `pan` | number | `0` | −100 (left) to +100 (right). |
| `solo` | boolean | `false` | When any channel is soloed, only soloed, unmuted channels play. |
| `muted` | boolean | `false` | — |
| `sampleId` | string | absent | Required for `voice: "sample"` to make sound. |
| `patterns` | array of note arrays | `[[], []]` | Up to 64 patterns, each up to 512 notes. |
| `bars` | array of blocks or null | all null | Exactly `barCount` entries after normalization. |

### Note

```json
{ "id": "note-1", "midi": 60, "start": 0, "duration": 4 }
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Optional; generated when missing. |
| `midi` | number | MIDI note number. |
| `start` | number | Step offset inside the pattern, 0–15. |
| `duration` | number | Length in steps, at least 0.25. |

### Block

```json
{ "pattern": 0, "start": 0, "end": 16, "length": 16 }
```

| Field | Type | Notes |
| --- | --- | --- |
| `pattern` | integer | Index into `track.patterns`. Missing patterns are created empty. |
| `start` | integer | Source step where the block begins, 0–15. |
| `end` | integer | Source step where the block ends, `start + 1` to 16. |
| `length` | integer | Destination length in steps, 1–128. |

A block with `length > 16` spans multiple bars and appears only in the bar where it starts. Overlapping blocks are dropped during normalization with a warning.

## Normalization rules

The importer is deliberately forgiving but never silently produces an unplayable song:

- Clamps numbers to their documented ranges.
- Trims names and substitutes a fallback when empty.
- Converts unknown voices to `square`.
- Extends `patterns` when a block references a missing pattern.
- Pads or truncates `bars` to `barCount`.
- Drops overlapping blocks and reports how many.
- Drops sample channels that have no `sampleId` and warns.
- Rejects documents larger than 2 MB or with more than 32 tracks.

## Storage keys

| Key | Contents |
| --- | --- |
| `chipboy-studio.projects.v1` | Array of saved slots: `{ id, name, createdAt, updatedAt, song }`. Maximum 30. |
| `chipboy-studio.autosave.v1` | `{ savedAt, song }` for the current session. |
| `chipboy-studio.riffs.v1` | Array of custom riffs: note data plus a preset ID. Maximum 40. Sample audio is never stored. |

## Share links

Share links encode the song as UTF-8 JSON, then base64url, in the `project` query parameter:

```text
https://chipboy.example/?project=eyJuYW1lIjoiUG9ja2V0IGRyZWFtcyIs...
```

The limit is 48,000 characters. Sample audio is never included. A link is readable by anyone who has it.

## Versioning

Version 5 adds `song.transpose`, `track.pan` and `track.solo`. Version 4 files load with those fields defaulted to `0`, `0` and `false`.

- Additive fields with safe defaults do not require a version bump.
- Renamed or removed fields, or changes that alter interpretation, require a bump and a migration branch in `parseProjectJson`.
- The writer always emits the current version.
