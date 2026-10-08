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
it directly on GitHub: open the file, check that the branch menu above the file
says **main**, click the ✏️ pencil, make your change, then "Commit changes". The
site rebuilds by itself in a minute or two. (Changes on any other branch only
make a preview, never the live app.)

If something is wrong, **the build stops and lists every problem in plain words**,
for example:

```
✖ Found 2 problem(s) in content/seasons.json:

  1. Season 1 "numbers" › item 3 (episode "s1e3") › youtubeId: this is a full link; use only the video ID "dQw4w9WgXcQ"
  2. Season 1 "numbers" › item 5 (challenge "s1c1") › question 2 "s1c1-q2" › correctOptionId: "x" is not one of this question's options (a, b, c)
```

On Vercel you'll see this list in the deploy log (project → **Deployments** → the
failed one → **Build Logs**), and the live site keeps the last good version until
you fix it.

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
- `thumbnail` is optional. Without it, YouTube's own thumbnail is used (it needs the
  internet). To use your own picture, which also shows offline, put it in
  `public/images/thumbs/` and add `"thumbnail": "/images/thumbs/s1e9.svg"`.
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

**App voice lines** ("Try again!", "Great job!") are set in
`lib/speech.ts` (`VOICE_LINES`). Add a recording to `public/audio/ui/` and fill in
its path, e.g. `tryAgain: { audio: { rw: "/audio/ui/try-again.rw.mp3" }, … }`.

### How to change the brand name and colors

- **Name, tagline, logo, WhatsApp contact, demo video:** `lib/brand.ts`.
  The Contact card in the parent area stays hidden until you fill in `contactLink`.
  The page title, header, installed-app name and parent area all follow.
  (Leave `storagePrefix` alone after launch; changing it starts every family over.)
- **Logo:** replace `public/icons/logo.svg`, then regenerate the app icons:
  `npm i --no-save playwright && node scripts/make-icons.mjs`.
- **Colors:** the `@theme` block at the top of `app/globals.css`
  (`--color-sky-500: #29a9e0;` and so on). Keep the same names. `npm test` checks
  that text stays readable (WCAG AA contrast) for every color pair the app uses.
- **Never use red on children's screens.**

---

## Put it online (Vercel, once, about 5 minutes)

1. Go to [vercel.com/signup](https://vercel.com/signup) and choose **Continue with GitHub**.
   Use the GitHub account that **owns** the repository (**Tuyishime-Fabrice**). Vercel only
   lets the owner connect a personal repository.
2. Open [vercel.com/new](https://vercel.com/new), find **ECD** and click **Import**.
   If it isn't listed, click the GitHub link under the list (**Configure GitHub App**, or
   **Adjust GitHub App Permissions** on some screens). Choose **Only select repositories**,
   pick **ECD**, click **Save**, then come back to vercel.com/new.
3. **Don't change any setting** (Vercel detects Next.js; `vercel.json` does the rest). Click **Deploy**.
4. About two minutes later you get a link like `ecd-….vercel.app`. That's the live app.
   To change the address, open the project's **Settings → Domains** (a free `…vercel.app`
   name, or your own domain).
5. Check that Vercel publishes the **`main`** branch: in the project, open **Settings →
   Environments → Production** and look under **Branch Tracking**. It must say `main`.
   If it doesn't, type `main` and click **Save**. Also make `main` the default branch on
   GitHub (repository **Settings → General → Default branch**), so edits made on GitHub land there.
6. **Leave Vercel Analytics and Speed Insights off.** The app promises families no tracking.

From then on, every change on `main` goes live by itself within about two minutes. Other
branches get their own preview link. If a change breaks the content file, the deploy
stops and the live app keeps the last good version. Phones that installed the app get
the new version the next time they open it with internet.

> Vercel's free **Hobby** plan is for personal, non-commercial use only. Vercel counts a
> project as commercial if anyone involved earns money from it: charging families, showing
> ads, or paying someone (staff or a consultant) to build or run it. Asking for donations is
> fine. Commercial use needs the **Pro** plan; if you're unsure, ask Vercel Support.
>
> Keep the GitHub repository **public**. If it becomes private, the free plan only publishes
> changes made from the repository owner's own GitHub account.

## Before real families use it

The live app works today with placeholder content. Swap these in when they're ready.
Each change goes live by itself.

- [ ] **Real videos:** replace `"DEMO"` with each episode's YouTube ID in `content/seasons.json`.
  Until then every episode plays YouTube's sample video. Embedding must be allowed on each video.
- [ ] **WhatsApp:** fill in `contactLink` and `contactLabel` in `lib/brand.ts`. The Contact card then appears.
- [ ] **Name, logo and mascot:** `lib/brand.ts`, `public/icons/logo.svg`, `components/Mascot.tsx`.
- [ ] **Kinyarwanda review** by a native speaker (`content/seasons.json`, `lib/i18n.ts`).
- [ ] **Question recordings:** the build log lists the missing files.
- [ ] Run the checklist below on the live link, on one Android phone and one iPhone.

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
npm start          # serves out/ on http://localhost:4173 (a different port from dev)
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

- **Vercel (production):** see [Put it online](#put-it-online-vercel-once-about-5-minutes).
  Keep the auto-detected **Next.js** preset. It runs `npm run build` (so the content check
  and the service-worker step run too) and serves the static export with clean URLs
  (`/watch/s1e1` → `watch/s1e1.html`). `vercel.json` only adds headers: `sw.js` always
  revalidated (`no-cache`), `nosniff`, `X-Frame-Options: DENY`, a `Permissions-Policy` that
  turns off camera, microphone and location (remove an entry there if a feature ever needs
  one), and a referrer policy that still sends the origin (YouTube embeds need it). Checked locally with `vercel build`. Don't switch the preset to
  "Other" or set an output directory: the Next.js builder reads `out/` itself.
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
  icons and question recordings, ~1 MB plus audio). An update installs only when every
  file downloaded, so a dropped connection keeps the previous complete version.
  Videos are never cached.

### Quality checks done for this MVP

- Unit tests (88): progress store, unlock, recommendations, skill mastery, time limit
  and extensions, content validation, color contrast.
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

- Brand name "Izuba", WhatsApp number (Contact card hidden until set), demo video ID: `lib/brand.ts`.
- Sun mascot, thumbnails, posters and stickers are simple placeholder SVGs.
- Kinyarwanda strings (`content/seasons.json`, `lib/i18n.ts`) need native review.
- Question recordings (list printed by `npm run build`) and app voice lines.
