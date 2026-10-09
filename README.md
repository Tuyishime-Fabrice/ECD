# Izuba: educational story videos for children aged 3–6

> **Izuba** ("sun") is a placeholder name. Change it in one place: `lib/brand.ts`.

Children in Rwanda learn from short animated **stories**, each with a lesson, played in
a set order and grouped into **collections**. After every 4 stories the child plays a
5-question picture **challenge** and wins a sticker. Each story ends with an activity
to do together at home. Parents get a progress page and a daily screen-time limit. The
team manages everything from an **admin dashboard**, with no coding.

- **Privacy:** no accounts for families, no ads, no tracking. A child's progress is saved
  **only on their device**.
- **Built for real conditions:** works on cheap Android phones, installs as an app and
  opens offline. Stories still need the internet.
- **Storybook World design:** an illustrated Rwandan landscape. By day it's a sunrise; at
  night it's a moonlit sky. The app follows the phone's light/dark setting.
- **Languages:** Kinyarwanda first, with English as the fallback.

---

## Managing stories: the admin dashboard

Open **`/admin`** on the live site (for example `https://ecd-nine.vercel.app/admin`) and
sign in with the admin password.

| Page | What you do there |
| --- | --- |
| **Overview** | Counts, publishing status, and a big **Add a story** button. |
| **Stories** | See every story in order. Add, edit, move up or down, or delete. |
| **Challenges** | The picture quiz after every 4 stories: 5 questions, picture answers, the sticker. |
| **Collections** | Story collections: name, color, poster, and *Live* or *Coming soon*. |
| **Settings** | The stories in the big slider on Home, and the parents' WhatsApp number. |
| **History** | Every save, with **Undo**. |
| **Help** | How it all works, in plain words. |

**Adding a story:**
1. Paste the YouTube link. The title, picture and length fill in by themselves.
2. Check the English and Kinyarwanda titles.
3. Write the "Do it at home" activity.
4. Tick the skills it teaches.
5. Optionally, add a question that pauses the story halfway.
6. Press **Save**.

Changes are **live in about 2 minutes**; the status at the top says *Going live…*, then
*Live ✓*. The dashboard checks every save first, so a mistake can't break the app. If
something needs fixing, it shows the problem next to the field.

### One-time setup (the owner, about 5 minutes)

The dashboard saves your changes into this GitHub repository, so it needs two keys:

1. **Make a GitHub key.** Signed in as **Tuyishime-Fabrice**, open
   [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
   - **Token name:** `Izuba admin`.
   - **Expiration:** 1 year. Put a reminder in your calendar to make a new one.
   - **Repository access:** *Only select repositories* → **ECD**.
   - **Permissions → Repository permissions → Contents:** *Read and write*.
   - Click **Generate token** and copy it. GitHub shows it only once.
2. **Give both keys to Vercel.** In Vercel, open the project, then **Settings → Environment
   Variables**, and add:
   - `GITHUB_TOKEN`: the token you just copied.
   - `ADMIN_PASSWORD`: a password for the dashboard, 12 characters or more. Share it only with
     the people who manage stories.
   - Save.
3. **Redeploy.** Go to **Deployments**, open the newest one, choose **⋯ → Redeploy**, and
   wait about 2 minutes.
4. Open `/admin` and sign in.

If something is missing, `/admin` shows a setup page that says exactly what to add. When
the GitHub key expires, make a new one the same way and replace `GITHUB_TOKEN`. Changing
`ADMIN_PASSWORD` signs everyone out. Details and security notes are in
[docs/ADMIN.md](docs/ADMIN.md).

---

## Put it online (Vercel, once, about 5 minutes)

1. Go to [vercel.com/signup](https://vercel.com/signup) and choose **Continue with GitHub**.
   Use the GitHub account that **owns** the repository (**Tuyishime-Fabrice**); Vercel only
   lets the owner connect a personal repository.
2. Open [vercel.com/new](https://vercel.com/new), find **ECD** and click **Import**.
   - If it isn't listed, click the GitHub link under the list (**Configure GitHub App**, or
     **Adjust GitHub App Permissions** on some screens).
   - Choose **Only select repositories**, pick **ECD**, click **Save**, then come back to
     vercel.com/new.
3. **Don't change any setting.** Vercel detects Next.js, and `vercel.json` does the rest.
   Click **Deploy**.
4. About two minutes later you get a link like `ecd-….vercel.app`. That's the live app.
   To change the address, use **Settings → Domains**.
5. **Check the branch.** Under **Settings → Environments → Production → Branch Tracking**, it
   must say `main`. Also make `main` the default branch on GitHub (**Settings → General →
   Default branch**).
6. **Leave Vercel Analytics and Speed Insights off.** The app promises families no tracking.
7. Do the [admin setup](#one-time-setup-the-owner-about-5-minutes).

From then on, every change on `main` goes live by itself, whether it's a save in the
dashboard or a code change. A change that would break the app stops before it goes live,
and the app keeps the last good version. Phones that installed the app get the new version
the next time they open it with internet.

> **Plan:** Vercel's free **Hobby** plan is for personal, non-commercial use only. Vercel
> counts a project as commercial if anyone involved earns money from it: charging families,
> showing ads, or paying staff or a consultant to build or run it. Asking for donations is
> fine. Commercial use needs the **Pro** plan; if you're unsure, ask Vercel Support.
>
> **Keep the GitHub repository public.** If it becomes private, the free plan only
> publishes changes made from the owner's own GitHub account.

## Before real families use it

The app works today with sample content. Swap these in from the dashboard as they're ready:

- [ ] **Real stories.** Every sample story plays YouTube's own sample video. In **Stories**,
      open each one and paste its real YouTube link. Embedding must be allowed on YouTube.
- [ ] **WhatsApp:** **Settings → WhatsApp number**. The parents' Contact card then appears.
- [ ] **Name and logo:** `lib/brand.ts` and the art scripts (see "For developers").
- [ ] **Kinyarwanda review** by a native speaker: the titles and activities in the dashboard,
      and the app's own words in `lib/messages/*.ts`.
- [ ] **Question recordings:** the build log lists the missing files (see below).
- [ ] Run the checklist below on the live link, on one Android phone and one iPhone.

## Demo checklist (2 minutes, on a real phone)

The app was tested in a headless browser with a stand-in for YouTube's player, because
YouTube can't be reached from the build machine. Please check these on a real phone once:

1. **Play:** on Home, tap the big orange **Play** on the first story. It plays, or the big
   Play button below the video pulses; tap it.
2. **Mid-story question:** at **0:20** the story pauses and Izuba asks a question. Tap the
   plate with one mango. You hear a cheer, then the story continues.
3. **End screen:** drag YouTube's progress bar near the end. You get **Well done!**, the
   "Do it at home" card and **Next story**. Nothing plays by itself.
4. **Progress:** back on Home, the story card has a ✓ and the slider starts with
   **Keep watching**. **Path** opens the winding road with Izuba on the next story.
5. **Time limit:** open the parent area (🔒 at the top, hold the circle for 3 s) → Demo mode →
   **1-minute daily limit**. Play a story: it finishes, then **Time to play!** appears.
   Holding for **+10 minutes** brings Home back.
6. **Offline:** Chrome menu → **Install app**. Turn on airplane mode and open it. Everything
   except the videos works.
7. **Night mode:** switch the phone to dark mode. The whole app turns to the night scene.

---

## For developers

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # lint + typecheck + tests + build (what CI should run)
npm run build      # validates content, builds, writes the service worker and build info
npm start          # serves the build on http://localhost:4173
```

Node 22.18+ (the content validator runs as TypeScript directly on Node).

| Script | What it does |
| --- | --- |
| `validate` | Checks `content/seasons.json` and `content/site.json` (runs before every build). |
| `build` | `next build`. Kid pages are prerendered to static HTML; `/admin` and `/api/admin/*` run on the server. |
| `postbuild` | `scripts/finalize-sw.mjs`: writes `public/sw.js` (offline file list + version) from `scripts/sw-template.js`, and `public/build-info.json`. |
| `test` | Vitest: `lib/`, `content/` and `components/`, including the admin API against a fake GitHub. |
| `node scripts/art/build.mjs` | Redraws all SVG art in `public/images` and the logo (`… world thumbs posters ui scenes answers` for some groups only). |
| `node scripts/dev/fake-github.mjs` | A fake GitHub and YouTube for trying the dashboard locally; see [docs/ADMIN.md](docs/ADMIN.md). |

### Deploy

Vercel builds from GitHub on every push to `main` (see
[Put it online](#put-it-online-vercel-once-about-5-minutes)):
- **Builder:** keep the auto-detected **Next.js** preset, which runs `npm run build`.
- **`vercel.json`** only adds headers:
  - `sw.js` is always revalidated;
  - `nosniff` and `X-Frame-Options: DENY`;
  - a `Permissions-Policy` that turns off camera, microphone and location;
  - a referrer policy that still sends the origin, which YouTube embeds need.
- **`/admin` is never cached.** The routes are dynamic and send `no-store`.
- **Checked locally** with `vercel build`, which showed the generated `sw.js` is deployed.

### How it fits together

```
app/(kid)/    the children's app: / · /season/[slug] · /watch/[id] · /challenge/[id] · /stickers · /offline
app/parents   the parent gate and parent area
app/admin     the admin dashboard        app/api/admin/*   its API (sessions, GitHub saves, YouTube)
components/   home/ (slider, rows, banner), kid/ (story cards, scenes, marks), admin/, and shared screens
content/      seasons.json + site.json (the content), schema.ts / site.ts (zod), validate.ts, index.ts
lib/          progress, recommend, unlock, timer, screen-time, sounds, speech, youtube, path-layout,
              messages/ (the app's words, per area, rw + en), admin/ (dashboard server + helpers)
scripts/      validate-content.ts, finalize-sw.mjs, sw-template.js, make-icons.mjs, art/, dev/
docs/         DESIGN.md (the design system), ADMIN.md (the dashboard: setup, security, API)
```

- **Design system:** [docs/DESIGN.md](docs/DESIGN.md).
  - Semantic day/night tokens in `app/globals.css`: `bg-paper`, `text-ink`, `bg-play`, …
  - Press and tap utilities, illustration rules and per-screen layouts.
  - `npm test` checks WCAG AA contrast for every text pair, in both themes.
  - **Never use red on children's screens.**
- **Content is data.** Kid pages are prerendered from `content/*.json` at build time, and
  `zod` never ships to the browser. The dashboard edits the same files through GitHub. You
  can also edit them by hand: follow `content/schema.ts`, and `npm run validate` explains any
  mistake in plain words.
- **Progress** goes through the `ProgressStore` interface (`lib/progress.ts`), backed by
  localStorage (`izuba:` keys). React reads it through `useSyncExternalStore` (`lib/store.ts`).
- **YouTube rules:**
  - Privacy-enhanced host (`youtube-nocookie.com`) with `rel=0`, `playsinline=1`,
    `controls=1`, `iv_load_policy=3` and `fs=1`.
  - Nothing is ever drawn on top of the player. For questions and the end screen it is
    hidden (`visibility: hidden`), not covered.
  - The API script loads only on the watch page. The dashboard saves each story's picture into
    the repo, so kid screens don't load images from YouTube.
- **Screen time** counts only while a story plays or a challenge is open and the tab is
  visible, per Kigali date. When the limit is reached, the current story finishes first.
- **Offline:**
  - `public/sw.js` precaches the prerendered pages, JS/CSS, fonts, pictures and recordings.
  - An update installs only when every file has downloaded.
  - It never touches `/admin`, `/api` or in-app navigation data. Offline, a full page load
    gets the cached HTML.
  - Videos are never cached.
- **Art:** every picture is an original SVG drawn by `scripts/art/*.mjs`, in day and night
  versions.
  - Izuba is drawn twice, in `scripts/art/mascot.mjs` and `components/Mascot.tsx`, and
    `npm test` checks that they match.
  - App icons: `PLAYWRIGHT_MODULE=<a Playwright install> node scripts/make-icons.mjs`, or
    first run `npm i --no-save playwright`.
- **Question recordings:** put MP3s in `public/audio/` with the names the build lists. Until
  then, demo mode reads the English text aloud with the phone's voice. App voice lines are
  in `lib/speech.ts`.

### Quality checks

- **Unit tests (325):**
  - Progress, unlock, recommendations, skills, time limit, content and site validation.
  - The path-map layout, messages in both languages, and color contrast in both themes.
  - The mascot matching its generator.
  - The admin API (sessions, saves, conflicts, undo, uploads, YouTube) against a fake
    GitHub, and the dashboard helpers.
- **End-to-end (headless Chromium, with a stand-in for YouTube):**
  - Watching: the mid-story question at 20 s, the 80% rule, resume, the end screen without
    autoplay, and the blocked-autoplay Play button.
  - Challenges: scaffolding, stars, results and stickers.
  - Grown-up screens: the parent gate and settings, the 1-minute limit → Time's Up →
    +10 minutes.
  - Offline: every kid page with the server switched off, plus audio range requests through
    the service worker.
  - The full dashboard flow, with the screens checked at 390 px and 1280 px in light and dark:
    sign in → add a story from a YouTube link → reorder → edit a challenge → settings → save →
    Live → conflict → refused save → undo.

### Known placeholders

- Brand name "Izuba" and the logo: `lib/brand.ts` and `scripts/art/`.
- Every sample story plays YouTube's sample video, and the sample stories are drawn stand-ins.
- Kinyarwanda text needs a native review.
- Question recordings and app voice lines.
