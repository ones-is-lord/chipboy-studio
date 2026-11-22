# Inspired by MTV Music Generator

Chipboy Studio is not a port or a clone. It is a browser-native chiptune workstation that borrows the parts of **Music 2000 / MTV Music Generator** that still make sense for a small, local-first tool: a deep riff palette, a visible song arrangement, fast auditioning and a mixer that stays out of the way.

This page records what the original did, which ideas we adopted, and which ideas we deliberately left for later.

## The original

| | |
| --- | --- |
| Known as | **Music 2000** in Europe, **MTV Music Generator** in North America |
| Developer | Jester Interactive |
| Publisher | Codemasters |
| Platforms | PlayStation, Windows |
| PlayStation release | November 26, 1999 (EU), December 15, 1999 (NA) |
| Windows release | May 2000 |
| Genre | Music sequencer / digital audio workstation |
| Sequel | *MTV Music Generator 2* (2001) |

The original *Music* (1998) had 16 channels. *Music 2000* raised that to **24 channels** and let players combine several channels into a single riff. It shipped with a large library of short, pre-recorded phrases called **riffs**, grouped into genres and instrument roles. Players assembled songs by copying riffs from the library into a song track, not by drawing every note from scratch.

Reviews describe the library as several thousand sounds and riffs. IGN's review cites roughly 3,000 instrument sounds and 1,500 riffs; GameSpot cites about 4,500 samples. The exact counts vary by source and region, but the design point is consistent: the library was the instrument, and browsing it was the main creative act.

### Core workflow

1. **Song Track mode** — a timeline of channels. The player opens the riff library, auditions a phrase, copies it, and pastes it into a channel.
2. **Riff library** — genres such as House, Drum N Bass, Beat, Rock, Trance and Techno; roles such as drum loops, bass lines, melodies, percussion, sound effects and vocals.
3. **Riff palette** — a shortcut surface for reusing riffs without walking the full library again.
4. **Riff editing** — split a riff, build a new one, transpose the song key, change BPM, and adjust channel volume and reverb.
5. **Sampling** — record audio from a CD by swapping discs, then treat the result as a sampled riff.
6. **Video editor** — attach simple moving patterns to a song. Reviews were consistently unkind to this mode.
7. **Music Jam** — a four-player mode. Contemporary descriptions differ: some call it turn-based, while IGN describes four colour-coded quadrants. Either way, it was a social, simplified layer on top of the sequencer.

### Why it mattered

The interface was utilitarian, the graphics were plain, and the PlayStation had only 2 MB of RAM. None of that stopped a generation of producers. Artists including **Skepta, Jme, Dizzee Rascal, Hudson Mohawke, Bob Vylan, Kode9 and Terror Danjah** made music on *Music 2000* before their careers took off. The game sold over a million copies across *Music* and *Music 2000*.

The lesson is not that a music tool needs a story mode. It is that a constrained, fast, visible palette can be more creative than an empty piano roll.

## What Chipboy Studio adopted

| Original idea | Chipboy Studio implementation |
| --- | --- |
| Riff library | **Riffs** workspace with 95 built-in one-bar riffs across drums, modern beats, bass, melodies, chords/arps, retro game music, cinematic cues and FX. |
| Audition before committing | Every riff card has a preview button. Preview uses the current song tempo and the real synth engine. |
| Copy and paste riffs | **Stamp** writes the riff into the selected channel and pattern, switches the channel to the riff's instrument, and supports undo. |
| Riff palette / custom riffs | **Capture current pattern** saves the selected pattern as a named custom riff in browser storage. Custom riffs can be previewed, stamped and deleted. |
| Song key transpose | The transport has a **Key** control from −12 to +12 semitones. Playback and WAV export apply it without mutating note data. |
| Channel volume and reverb | The pattern editor exposes volume, pitch and pan per channel, plus a 23-control FX rack with filtering, drive, distortion, acid, modulation, delay, reverb, compression and EQ. |
| Combining layers | The arrangement supports up to 32 channels, and the mixer now supports **solo**, mute, pan and per-channel FX. |
| Visual identity for riffs | Arrangement blocks carry a colour-coded dot and left border based on the channel's instrument family. |
| Fast, local workflow | Everything is local. No account, no upload, no network request after load. |
| Drum-machine sketchpad | **Beat lab** adds an 18-lane, 16-step loop station with four banks, BPM and swing. Send active lanes to the song as individual drum-kit channels. See [BEAT-LAB.md](BEAT-LAB.md). |

### Riff design

Each built-in riff is a one-bar, 16-step pattern tied to a real preset from the instrument library. The categories map to the original's roles:

- **Drum loops** — kick, snare, clap, hats, open hats and tom fills.
- **Modern beats** — trap, drill, house, techno, UK garage, dembow, hyperpop, synthwave, phonk, lo-fi, city pop, amapiano, trance, future bass, dub and neo-soul phrases.
- **Basslines** — pulse walks, triangle octaves, acid eighths, rubber funk and sub drops.
- **Melodies** — heroic leads, coin runs, sad triangles, arcade hooks, laser lines and bell motifs.
- **Chords & arps** — chip arpeggios, minor stabs, bell canons, saw chords and plucked arps.
- **Retro game** — 1-UP jingles, item fanfares, menu blips, boss warnings, dungeon crawls, victory themes, game-over stings, warps, chests and secret chimes.
- **Cinematic** — risers, impacts, chase pulses, hero entrances, sad piano, mystery bells and end credits.
- **FX** — coins, lasers, power-ups, explosions and teleports.

Stamping a riff onto a synth channel replaces the channel's instrument and root note, so the phrase sounds as designed. The channel keeps its name and arrangement block. Stamping onto a sample channel keeps the sample and shifts the riff by whole octaves to sit near the sample root.

Custom riffs are stored under `chipboy-studio.riffs.v1`. They contain note data and a preset ID, never audio. The limit is 40 riffs.

## What we deliberately did not copy

- **24 fixed channels.** The song supports up to 32 channels, but starts with five so the mix stays readable on a phone. Beat lab can add a full kit when a song needs one.
- **CD sampling.** The sampler already imports any browser-decodable file, records from the microphone, slices, crops and pitch-shifts. Disc-swapping is not a workflow we can reproduce in a browser.
- **The video editor.** The original's video mode was widely criticised as shallow. Chipboy Studio invests in the sequencer and the pixel-art shell instead.
- **A four-player jam mode.** Real-time multiplayer needs networking and conflict handling that would compromise the local-first promise. A local jam mode is a possible future extension, not a release requirement.
- **Memory limits as a design feature.** The PlayStation's 2 MB ceiling shaped the original. The browser has different limits, so Chipboy Studio caps project size, sample duration and export length explicitly instead of pretending to be memory-starved.

## Possible next steps

- A scene launcher that triggers whole arrangements like the original's four-quadrant jam screen.
- Riff chaining across multiple bars, so a two- or four-bar phrase can be stamped as one block.
- A shared riff pack format with provenance and licensing metadata.
- A pattern-chain mode for the Beat lab that sequences banks A–D into longer loops.
- A "randomize from palette" composer that builds a starter arrangement from compatible riffs.

## Sources

- Wikipedia, [Music 2000](https://en.wikipedia.org/wiki/Music_2000)
- IGN, [MTV Music Generator review](https://www.ign.com/articles/2000/01/12/mtv-music-generator), January 2000
- GameSpot, [MTV Music Generator review](https://www.gamespot.com/reviews/mtv-music-generator-review/1900-2548503/), December 1999
- Vice, [Music 2000 Was the Greatest (And Only) Way to Produce Jungle on Your Playstation](https://www.vice.com/en/article/music-2000-was-the-greatest-and-only-way-to-produce-jungle-on-your-playstation/), 2015
- Time Extension, [Music, The PlayStation Audio Creation Tool From WipEout's Tim Wright](https://www.timeextension.com/features/the-making-of-music-the-playstation-audio-creation-tool-from-wipeouts-tim-wright), 2023
