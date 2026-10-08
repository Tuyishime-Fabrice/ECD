# Izuba — early learning for children aged 3–6

> **Izuba** ("sun") is a placeholder name. Change it in one place: `lib/brand.ts`.

A calm, ordered learning path for young children in Rwanda. Short animated
episodes play in a set order, and after every 4 episodes the child plays a
5-question picture **challenge**. Parents get a progress page and a daily
screen-time limit.

- No accounts, no backend, no tracking. Progress is saved **only on the device**.
- Works on cheap Android phones, installs as an app, and opens offline. Videos still need the internet.
- Kinyarwanda first (English fallback).

---

## For the content team (no coding needed)

All learning content lives in **one file: `content/seasons.json`**. You can edit
it directly on GitHub: open the file, click the ✏️ pencil, make your change,
then "Commit changes". The site rebuilds by itself in a minute or two.

If something is wrong, **the build stops and lists every problem in plain words**,
for example:

```
✖ Found 2 problem(s) in content/seasons.json:

  1. Season 1 "numbers" › item 3 (episode "s1e3") › youtubeId: this is a full link; use only the video ID "dQw4w9WgXcQ"
  2. Season 1 "numbers" › item 5 (challenge "s1c1") › question 2 "s1c1-q2" › correctOptionId: "x" is not one of this question's options (a, b, c)
```

On Vercel or Netlify you'll see this list in the deploy log, and the live site
keeps the last good version until you fix it.

Every piece of text has two languages: `{ "rw": "…", "en": "…" }`. English is
required (it's the fallback). Kinyarwanda can be left `""` until it's ready.

> ⚠️ The Kinyarwanda text in this first version is a draft (**NEEDS NATIVE REVIEW**).

### How to add an episode

1. Upload the episode to YouTube (it can be *Unlisted*; **embedding must be allowed**).
2. Copy its **video ID**, the 11 characters after `v=` in the link.
   For `https://www.youtube.com/watch?v=dQw4w9WgXcQ` the ID is `dQw4w9WgXcQ`.
3. In `content/seasons.json`, find the season's `"items"` list and add a block
   **where it belongs in the order**:

```json
{
  "type": "episode",
  "episode": {
    "id": "s1e9",
    "number": 9,
    "title": { "rw": "Umubare 11: Cumi na rimwe", "en": "Number 11: Eleven" },
    "youtubeId": "dQw4w9WgXcQ",
    "durationSec": 240,
    "skills": ["count-6-10"],
    "homeActivity": {
      "rw": "…",
      "en": "Count 11 spoons together."
    }
  }
},
```

- `id` must be unique in the whole file (we use `s<season>e<episode>`).
- `durationSec` is the length in seconds (4 minutes = 240).
- `thumbnail` is optional. Without it, YouTube's own thumbnail is used. To use your
  own picture, put it in `public/images/thumbs/` and add `"thumbnail": "/images/thumbs/s1e9.svg"`.
- `skills` must be names listed in `"skills"` at the top of the file.
- Watch the commas: every block in a list is separated by a comma, except the last.

**Optional: a question in the middle of the video.** Add `pausePoints`. At
`atSec` seconds the video pauses, the question replaces the player, and after the
right answer the video continues:

```json
"pausePoints": [
  { "atSec": 20, "question": { …same shape as a challenge question… } }
]
```

### How to add a challenge

A challenge is placed **after the episodes it checks** (we use one after every 4
episodes). It unlocks once those episodes are watched. It needs **exactly 5
questions**, each with **2 to 4** picture options:

```json
{
  "type": "challenge",
  "challenge": {
    "id": "s1c3",
    "title": { "rw": "Umukino wa 3", "en": "Challenge 3" },
    "sticker": "/images/stickers/s1c3.svg",
    "questions": [
      {
        "id": "s1c3-q1",
        "promptText": { "rw": "Kanda ku ishusho iriho imyembe itatu", "en": "Tap the picture with 3 mangoes" },
        "promptAudio": { "rw": "/audio/s1c3-q1.rw.mp3" },
        "promptImage": "/images/counting/banana-4.svg",
        "options": [
          { "id": "a", "image": "/images/counting/mango-2.svg", "label": "2 mangoes" },
          { "id": "b", "image": "/images/counting/mango-3.svg", "label": "3 mangoes" }
        ],
        "correctOptionId": "b",
        "skill": "count-1-5"
      }
    ]
  }
}
```

- `promptText` is shown small for parents; children hear `promptAudio`.
- `promptImage` (optional) is shown above the options.
- `label` is read by screen readers (short, e.g. "3 mangoes").
- `skill` decides what parents see under **Skills** ("Counting 1–5: Mastered").
  To add a new skill, add it to `"skills"` at the top with a plain-language name.
- Ready-made pictures: `public/images/counting/<mango|banana|orange|avocado>-<1…10>.svg`
  and `public/images/numbers/<1…10>.svg`.

### How to replace the demo video and audio

**Demo video.** Every episode with `"youtubeId": "DEMO"` plays the video set in
`lib/brand.ts`:

```ts
export const DEMO_YOUTUBE_ID = "M7lc1UVf-VE"; // placeholder: YouTube's own sample video
```

Put a real video ID in each episode's `youtubeId` (best), or change this one line.

**Question audio.** Record each question (MP3 works everywhere), name the file as
listed, and put it in `public/audio/`. The build prints the exact list of missing
recordings:

```
⚠ 11 audio file(s) are not recorded yet. … Missing files:
   - public/audio/s1c1-q1.rw.mp3
   …
```

Until a file exists, demo mode reads the **English** text aloud with the phone's
built-in voice (Parent area → Demo mode → *Placeholder voice*). Keep files short
and small (mono, 64 kbps is plenty).

**App voice lines** ("Try again!", "Great job!", "Let's play!") are set in
`lib/speech.ts` (`VOICE_LINES`). Add a recording to `public/audio/ui/` and fill in
its path, e.g. `tryAgain: { audio: { rw: "/audio/ui/try-again.rw.mp3" }, … }`.

### How to change the brand name and colors

- **Name, tagline, logo, WhatsApp contact, demo video:** `lib/brand.ts`.
  The page title, header, installed-app name and parent area all follow.
  (Leave `storagePrefix` alone after launch; changing it starts every family over.)
- **Logo:** replace `public/icons/logo.svg`, then regenerate the app icons:
  `npm i --no-save playwright && node scripts/make-icons.mjs`.
- **Colors:** the `@theme` block at the top of `app/globals.css`
  (`--color-sky-500: #29a9e0;` and so on). Keep the same names. `npm test` checks
  that text stays readable (WCAG AA contrast) for every color pair the app uses.
- **Never use red on children's screens.**

---

## Demo checklist (2 minutes, on a real phone)

This build was tested in a headless browser against a stand-in for YouTube's
player, because YouTube is unreachable from the build machine. Please check
these on a real phone once:

1. Home → tap **Episode 1**. The video starts (or the big Play button pulses; tap it).
2. At **0:20** the video pauses and a question replaces it. Tap the single mango → cheer → the video continues.
3. Drag YouTube's progress bar near the end. You get **Well done!**, the home activity, and **Next**. Nothing plays by itself.
4. Back on Home: Episode 1 has a ✓ and **Continue** points to Episode 2. Reopen an episode halfway through and it resumes where it stopped.
5. Parent area (🔒 top right, hold the circle 3 s) → Demo mode → **1-minute daily limit**. Play an episode: it finishes, then **Time to play!** appears.
6. Hold-to-unlock **+10 minutes** on that screen; Home comes back.
7. Chrome menu → **Install app**. Turn on airplane mode and open it: everything except videos works.

---

## For developers

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # lint + typecheck + tests + build (what CI should run)
npm run build      # validates content, builds the static site into out/, writes the service worker
npm start          # serves out/ locally
```

Node 22.18+ (the content validator runs as TypeScript directly on Node).

| Script | What it does |
| --- | --- |
| `validate` | Checks `content/seasons.json` (runs before every build) |
| `build` | `next build` with `output: "export"` → static files in `out/` |
| `postbuild` | `scripts/finalize-sw.mjs`: fills in the offline file list and version in `out/sw.js` |
| `test` | Vitest unit tests for `lib/` and `content/` |
| `node scripts/make-images.mjs` | Regenerates the placeholder SVG art in `public/images` |

### Deploy

Both hosts build from GitHub on every push:

- **Vercel:** import the repo; it detects Next.js and serves the static export. `vercel.json` keeps `sw.js` uncached.
- **Netlify:** import the repo; `netlify.toml` sets `npm run build` and publishes `out/`.

### How it fits together

```
app/          routes: / · /season/[slug] · /watch/[episodeId] · /challenge/[challengeId]
              /stickers · /parents · /offline · manifest.ts
components/   UI (TopBar, SeasonRow, ItemCard, WatchView, YouTubePlayer, QuestionPanel,
              ChallengeFlow, ParentGate, ParentArea, TimesUp, …)
content/      seasons.json, schema.ts (zod), validate.ts, index.ts (build-time loader)
lib/          brand, i18n, progress (ProgressStore), recommend, unlock, skills, timer,
              screen-time, sounds (Web Audio), speech, youtube, playback
public/       images/ (original SVGs), audio/, icons/, sw.js
scripts/      validate-content.ts, finalize-sw.mjs, make-images.mjs, make-icons.mjs
```

- **Content is data.** Pages are prerendered from `seasons.json` at build time; `zod`
  never ships to the browser. Unrecorded audio is dropped at build time, so phones
  never request missing files.
- **Progress** goes through the `ProgressStore` interface (`lib/progress.ts`). Today it
  is localStorage (`izuba:` keys); a Supabase version can replace it without touching
  components. React reads it through `useSyncExternalStore` (`lib/store.ts`).
- **YouTube rules.** Privacy-enhanced host (`youtube-nocookie.com`), `rel=0`,
  `playsinline=1`, `controls=1`, `iv_load_policy=3`, `fs=1`. Nothing is ever drawn on
  top of the player. Our controls sit below it, and for questions and the end screen the
  player is hidden (`visibility: hidden`, still mounted). The API script loads only on
  the watch page, and never when the daily limit is already used up.
- **Screen time** counts only while a video plays or a challenge is open and the tab
  is visible, per Kigali date. When the limit is reached the current episode finishes,
  then Time's Up replaces the end screen.
- **Offline:** `public/sw.js` precaches the app shell (pages, JS/CSS, fonts, pictures,
  icons, ~1 MB) and caches audio on first use. Videos are never cached.

### Quality checks done for this MVP

- Unit tests: progress store, unlock, recommendations, skill mastery, time limit,
  content validation, color contrast.
- End-to-end checks (headless Chromium, YouTube replaced by a stand-in): pause point at
  20 s, 80% rule, resume, end screen without autoplay, blocked-autoplay Play button below
  the video, offline/unavailable screens, challenge flow (scaffolding, stars, saved
  results, sticker), parent gate, settings, reset, 1-minute limit → Time's Up → +10 min,
  installability, offline app shell, no console errors and no sideways scrolling at
  360 px (portrait and landscape) and desktop.
- Lighthouse 12 (mobile) on Home, Season, Challenge, Stickers, Parents: Accessibility 100,
  Best Practices 100, Performance 88–93 (88–91 with Lighthouse's default *simulated*
  throttling, 91–93 with *applied* devtools throttling). The watch page wasn't measured:
  YouTube's own iframe dominates it and isn't reachable from the build machine.

### Known placeholders / next steps

- Brand name "Izuba", WhatsApp number, demo video ID: `lib/brand.ts`.
- Sun mascot, thumbnails, posters and stickers are simple placeholder SVGs.
- Kinyarwanda strings (`content/seasons.json`, `lib/i18n.ts`) need native review.
- Question recordings (list printed by `npm run build`) and app voice lines.
