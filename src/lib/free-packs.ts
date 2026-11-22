export type FreeAssetKind = "riff" | "sample";
export type FreeAssetFormat = "midi" | "mp3" | "ogg" | "wav";

export type FreeAsset = {
  id: string;
  packId: string;
  name: string;
  kind: FreeAssetKind;
  format: FreeAssetFormat;
  description: string;
  downloadUrl: string;
  bytes?: number;
  loop?: boolean;
};

export type FreePack = {
  id: string;
  name: string;
  author: string;
  license: "CC0-1.0";
  licenseUrl: string;
  sourceUrl: string;
  description: string;
  assets: FreeAsset[];
};

export const MAX_FREE_DOWNLOAD_BYTES = 12 * 1024 * 1024;
const RAW = "https://raw.githubusercontent.com";
const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";

const raw = (repo: string, branch: string, path: string) =>
  `${RAW}/${repo}/${branch}/${path.split("/").map(segment => encodeURIComponent(segment)).join("/")}`;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const beatscribeMidi = [
  ["boss_appears", "Boss Appears"], ["charge", "Charge"], ["distant_flute", "Distant Flute"],
  ["echoes", "Echoes"], ["failure", "Failure"], ["game_over", "Game Over"],
  ["happy_ending", "Happy Ending"], ["item", "Item Get"], ["jump_scare", "Jump Scare"],
  ["level_start", "Level Start"], ["marching", "Marching"], ["organ", "Organ"],
  ["reveal", "Reveal"], ["scary", "Scary"], ["startling_news", "Startling News"],
  ["times_up", "Time's Up"], ["victory", "Victory"],
] as const;

const beatscribeFanfares = [
  ["boss_appears", "Boss Appears"], ["charge", "Charge"], ["creepy_organ", "Creepy Organ"],
  ["distant_flute", "Distant Flute"], ["echoes", "Echoes"], ["failure", "Failure"],
  ["game_over", "Game Over"], ["happy_ending", "Happy Ending"], ["jump_scare", "Jump Scare"],
  ["leve_start", "Level Start"], ["marching_fanfare", "Marching Fanfare"], ["reveal", "Reveal"],
  ["scary", "Scary"], ["startling_news", "Startling News"], ["time_running_out", "Time Running Out"],
  ["treasure", "Treasure"], ["victory", "Victory"],
] as const;

const retroSfx = [
  ["ui_click", "UI Click", "Crisp, very short interface click."],
  ["ui_tap_soft", "Soft Tap", "Soft, rounded tap for touch feedback."],
  ["ui_toggle_on", "Toggle On", "Two quick rising notes: switch on."],
  ["ui_toggle_off", "Toggle Off", "Two quick falling notes: switch off."],
  ["ui_confirm", "Confirm", "Bright three-note arpeggio: action confirmed."],
  ["ui_success", "Success", "Four-note rising arpeggio ending on a held octave."],
  ["ui_error", "Error", "Low buzzy descending pair: something went wrong."],
  ["ui_warning", "Warning", "Two identical mid beeps: attention needed."],
  ["ui_notification", "Notification", "Soft two-partial bell for an incoming message."],
  ["ui_pop", "Pop", "Quick upward bubble pop for a tooltip or message."],
  ["ui_whoosh", "Whoosh", "Airy noise swell for a panel sliding in."],
  ["ui_delete", "Delete", "Crumple-and-drop sound for deleting an item."],
  ["game_coin", "Coin", "Bright metallic chime for a collected coin or gem."],
  ["game_jump", "Jump", "Upward square-wave sweep for a player jump."],
  ["game_powerup", "Power Up", "Fast rising arpeggio over two octaves."],
  ["game_laser", "Laser", "Falling square-wave zap for a laser shot."],
  ["game_explosion", "Explosion", "Low noise blast with a sub thump."],
  ["game_hit", "Hit", "Short crunchy impact for damage."],
  ["game_pickup", "Pickup", "Bright upward chirp for a collected item."],
  ["game_select", "Select", "Tiny square blip for moving a menu cursor."],
  ["game_over", "Game Over", "Falling minor arpeggio that slows down."],
  ["game_level_complete", "Level Complete", "Short triumphant fanfare for a cleared level."],
  ["game_footstep", "Footstep", "Muffled retro footstep."],
  ["game_teleport", "Teleport", "Warbling upward sweep for a portal."],
] as const;

const beatscribeRepo = "Beatscribe/homebrew_vgm";
const graveRepo = "Kryptikone316/Grave-Reckoning";
const sfxRepo = "mshark1/audio-mcp-assets";
const cc0MusicRepo = "SoundSafari/CC0-1.0-Music";

export const FREE_PACKS: FreePack[] = [
  {
    id: "homebrew-midi",
    name: "Homebrew jingles · MIDI riffs",
    author: "Beatscribe",
    license: "CC0-1.0",
    licenseUrl: CC0,
    sourceUrl: `https://github.com/${beatscribeRepo}`,
    description: "Short Game Boy, GBA, SNES and Genesis fanfares arranged as Standard MIDI Files. Import one bar into My riffs and stamp it on any melodic channel.",
    assets: beatscribeMidi.map(([file, name]) => ({
      id: `homebrew-midi-${slug(file)}`,
      packId: "homebrew-midi",
      name,
      kind: "riff",
      format: "midi",
      description: "One-bar game fanfare imported from MIDI.",
      downloadUrl: raw(beatscribeRepo, "master", `GBA_MIDI/${file}.mid`),
    })),
  },
  {
    id: "homebrew-audio",
    name: "Homebrew fanfares · audio",
    author: "Beatscribe",
    license: "CC0-1.0",
    licenseUrl: CC0,
    sourceUrl: `https://github.com/${beatscribeRepo}`,
    description: "The same homebrew jingles as ready-to-play MP3 samples. Add one to the Sampler, slice it, or drop it into the song.",
    assets: beatscribeFanfares.map(([file, name]) => ({
      id: `homebrew-audio-${slug(file)}`,
      packId: "homebrew-audio",
      name,
      kind: "sample",
      format: "mp3",
      description: "Short homebrew game fanfare.",
      downloadUrl: raw(beatscribeRepo, "master", `GB/fanfares/mp3/${file}.mp3`),
    })),
  },
  {
    id: "grave-reckoning",
    name: "Grave Reckoning · 16-bit loops",
    author: "Kryptikone316",
    license: "CC0-1.0",
    licenseUrl: "https://raw.githubusercontent.com/Kryptikone316/Grave-Reckoning/main/LICENSE-ASSETS.txt",
    sourceUrl: `https://github.com/${graveRepo}`,
    description: "Original gothic 16-bit dungeon loops from the CC0 handheld game Grave Reckoning. Longer than a riff, so these land in the Sampler.",
    assets: [
      ["Ch0 - Grave Reckoning/GR - Menu 1.ogg", "Menu 1", "Menu loop from the gothic handheld game."],
      ["Ch1 - The Forgotten Grave/GR - Forgotten Grave 1.ogg", "Forgotten Grave 1", "Chapter 1 dungeon loop."],
      ["Ch2 - The Old Cemetery/GR - Old Cemetery 1.ogg", "Old Cemetery 1", "Chapter 2 cemetery loop."],
      ["Ch4 - The Family Crypt/GR - Family Crypt 1.ogg", "Family Crypt 1", "Chapter 4 crypt loop."],
      ["Ch6 - The Ancestral Mausoleum/GR - Ancestral Mausoleum 1.ogg", "Ancestral Mausoleum 1", "Chapter 6 mausoleum loop."],
    ].map(([path, name, description]) => ({
      id: `grave-${slug(name)}`,
      packId: "grave-reckoning",
      name,
      kind: "sample" as const,
      format: "ogg" as const,
      description,
      loop: true,
      downloadUrl: raw(graveRepo, "main", `assets/Music/${path}`),
    })),
  },
  {
    id: "retro-sfx",
    name: "Retro UI & game SFX",
    author: "mshark1",
    license: "CC0-1.0",
    licenseUrl: "https://raw.githubusercontent.com/mshark1/audio-mcp-assets/main/LICENSE",
    sourceUrl: `https://github.com/${sfxRepo}/tree/main/sfx-retro-ui`,
    description: "Twenty-four clean, loudness-matched interface and game sounds synthesized from scratch. Perfect for sampler pads and one-shot effects.",
    assets: retroSfx.map(([file, name, description]) => ({
      id: `retro-sfx-${slug(file)}`,
      packId: "retro-sfx",
      name,
      kind: "sample",
      format: "wav",
      description,
      downloadUrl: raw(sfxRepo, "main", `sfx-retro-ui/${file}.wav`),
    })),
  },
  {
    id: "cc0-game-themes",
    name: "CC0 game themes",
    author: "FreePD · HoliznaCC0",
    license: "CC0-1.0",
    licenseUrl: "https://raw.githubusercontent.com/SoundSafari/CC0-1.0-Music/main/LICENSE",
    sourceUrl: `https://github.com/${cc0MusicRepo}`,
    description: "Three longer CC0 game and retro themes from the FreePD and Free Music Archive collections. Add them to the Sampler for slicing or background beds.",
    assets: [
      ["freepd.com/Comic Game Loop - Mischief.mp3", "Comic Game Loop · Mischief", "Playful game loop from FreePD.", true, 1713549],
      ["freepd.com/Video Game Blockbuster.mp3", "Video Game Blockbuster", "Big-screen game theme from FreePD.", false, 5702009],
      ["freemusicarchive.org/HoliznaCC0 - Retro Soundtrack.mp3", "Retro Soundtrack", "HoliznaCC0 retro theme from the Free Music Archive.", false, 6308365],
    ].map(([path, name, description, loop, bytes]) => ({
      id: `theme-${slug(String(name))}`,
      packId: "cc0-game-themes",
      name: String(name),
      kind: "sample" as const,
      format: "mp3" as const,
      description: String(description),
      loop: Boolean(loop),
      bytes: Number(bytes),
      downloadUrl: raw(cc0MusicRepo, "main", String(path)),
    })),
  },
];

export const FREE_ASSETS = FREE_PACKS.flatMap(pack => pack.assets);
export const FREE_ASSET_COUNT = FREE_ASSETS.length;
