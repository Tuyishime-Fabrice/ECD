# Admin dashboard (`/admin`)

A dashboard for a **non-technical** person to manage the stories without touching code or
files. It runs on Vercel, next to the kid app.

## How it works

- **Storage is the GitHub repository.**
  - `content/seasons.json`: collections, stories, challenges and skills. In the code, a
    collection is a `season` and a story is an `episode`.
  - `content/site.json`: featured stories for the Home slider, and the WhatsApp number.
  - Uploaded pictures: `public/images/uploads/…`.
- **Saving** makes one commit on `main` through the GitHub API. Vercel rebuilds automatically,
  and the change is live in about 2 minutes.
- **Every save is validated first** with the same checks as the build: `validateContent` and
  `validateSite`. A save that would break the build is refused with plain-language reasons,
  so the live app never breaks.
- **Undo:** "History" lists recent saves. "Undo" puts content back to how it was before
  that save, as a new commit.
- **Kid pages stay static and offline-capable.** Only `/admin` and `/api/admin/*` run on the
  server.

## Setup (once, by the owner, in Vercel → Project → Settings → Environment Variables)

| Variable | Required | What |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | The password for `/admin`. Use 12+ characters. |
| `GITHUB_TOKEN` | yes | A GitHub fine-grained token for this repo only, with **Contents: Read and write**. |
| `GITHUB_REPO` | no | `owner/name`. Default `Tuyishime-Fabrice/ECD`. |
| `GITHUB_BRANCH` | no | Default `main`. |
| `ADMIN_SESSION_SECRET` | no | Signs the login cookie. Default: derived from `ADMIN_PASSWORD`, so changing the password logs everyone out. |
| `GITHUB_API_URL` | no | Default `https://api.github.com`. Tests point this at a local fake. |

If a required variable is missing, `/admin` shows a friendly setup screen that says exactly
which one, instead of an error.

## Security

- Sessions use an HttpOnly cookie `izuba_admin`.
  - Value: an HMAC-SHA256-signed `{exp}`.
  - Flags: `SameSite=Strict`, `Secure` in production, 7 days.
  - The password is compared in constant time. A wrong password waits 800ms before answering.
- **Every** `/api/admin/*` route except `login` checks the session. State-changing routes also
  require JSON and an `Origin` header that matches the host.
- `GITHUB_TOKEN` never reaches the browser. Admin pages and API responses are never cached
  (`Cache-Control: no-store`), and the service worker ignores `/admin` and `/api`.
- Uploads:
  - Only images: jpeg, png and webp, up to 1.5 MB each after the browser resizes them.
  - The server sniffs the magic bytes and writes only to `public/images/uploads/`, with a
    safe slug filename.

## API (route handlers in `app/api/admin/*/route.ts`, Node runtime, `dynamic = "force-dynamic"`)

| Route | Does |
| --- | --- |
| `POST /api/admin/login` `{password}` | Sets the cookie. 401 if wrong. |
| `POST /api/admin/logout` | Clears the cookie. |
| `GET /api/admin/session` | `{ loggedIn, setup: { password: bool, github: bool } }` |
| `GET /api/admin/content` | Latest `seasons.json` and `site.json` from GitHub, plus `baseSha`, the head commit they were read at. |
| `POST /api/admin/save` `{ seasons, site, uploads: [{ path, base64 }], summary, baseSha }` | Validates, then makes one atomic commit (Git Data API: blobs → tree → commit → update ref). Returns `{ commitSha }`. On error 422 `{ errors: string[] }`. If `main` moved since `baseSha` and touched the content files: 409 "Someone else saved changes. Reload to see them." |
| `GET /api/admin/youtube?url=…` | Parses any YouTube link or ID. Uses oEmbed to get `{ id, title }` and returns a thumbnail as base64 (`i.ytimg.com` hqdefault), so the picture is stored in the repo and kid screens never load images from YouTube. |
| `GET /api/admin/history` | The last 30 commits that touched `content/` or `public/images/uploads/`: `{ sha, summary, date }`. |
| `POST /api/admin/undo` `{ sha }` | A new commit that restores `content/*.json` to the parent of `sha`. |

Publish status: the build writes `public/build-info.json` (`{ sha }`, from
`VERCEL_GIT_COMMIT_SHA`; gitignored and not precached). After a save, the dashboard polls it
and shows: "Saving… → Going live (about 2 min) → Live ✓".

## Admin API: details and differences from the table above

The server side lives in `lib/admin/` (`env`, `session`, `github`, `youtube`, `uploads`, `save`,
`undo`, `wording`, `http`); the route files only wire them together. `lib/admin/uploads.ts` has no
Node imports, so the dashboard can use it too.

- **Every reply** is JSON with `Cache-Control: no-store` (also set in `next.config.ts`, which
  covers Next.js's own 405s and `/build-info.json`). Errors are `{ error }` or
  `{ errors: string[] }`.
- **Status codes:** 400 malformed request · 401 not signed in, or wrong password · 403 not
  same-origin · 409 someone else saved · 413 body too big · 415 not JSON · 422 refused, with
  reasons · 502 GitHub or YouTube trouble · 503 not set up yet, or GitHub rate limit. On 401, show
  the login screen. On 409, reload the content.
- **Setup:** `ADMIN_PASSWORD` under 12 characters, or an `ADMIN_SESSION_SECRET` under 32,
  counts as not set up. `GET /session` returns `setup.problems`: plain sentences naming each
  missing or broken variable, for the setup screen.
- **Login and logout** need same-origin JSON too. Logout works even with an expired session.
  The cookie is `Secure` in production except on `localhost`/`127.0.0.1`, so `next start` works
  over plain http.
- **Save** `{ seasons, site, uploads, summary, baseSha }`:
  - `uploads[].path` is the public path used in `seasons.json`:
    `/images/uploads/<lowercase-letters-digits-and-dashes>.<jpg|jpeg|png|webp>`, no subfolders.
    `base64` may start with `data:…;base64,`. Make names with `uploadPath(name, type)`.
  - Names are never reused: a different picture under an existing name is refused (the same
    bytes are fine). One save carries at most 40 pictures and 3 MB, because Vercel refuses
    requests over 4.5 MB. Resize in the browser (story pictures about 1280×720, answer pictures
    about 512px).
  - 422 adds `issues: [{ file: "seasons" | "site" | "uploads", path, message, problem }]`, with
    `errors[i] === issues[i].message`. `path` points into the JSON you sent (`["seasons", 0,
    "items", 3, "episode", "thumbnail"]`) or the upload index; `problem` is the short text for
    next to that field. Messages use the dashboard's words ("Collection 1 "…" › story 2 "…" ›
    picture: …"). Shape problems come first; missing pictures and unknown skills are reported
    once the shape is right.
  - Only files that really change are committed. If nothing changed: 200
    `{ commitSha: <head>, unchanged: true }`, and no commit. If the branch moves during the
    commit for any other reason, the save starts over once on top of it.
  - The JSON is written with 2-space indents and a final newline. Send `seasons` back with its
    `_note`.
  - Keep the data consistent before saving: renumber `episode.number` within a collection
    after a move, and take deleted or "Coming soon" stories out of `site.featured`. Otherwise
    the save is refused with a reason.
- **YouTube** `GET /youtube?url=…` → `{ id, title, thumbnail: { base64, type } | null }`. The
  picture is `maxresdefault` (1280×720) when YouTube has it, else `hqdefault` (480×360 with black
  bars: crop it to 16:9). Upload it with the save. Refusals: 400 not a video link, 404 private
  or deleted, 422 the owner turned off embedding (it would not play in the app).
- **History** → `{ commits: [{ sha, summary, date }] }`, newest first. It lists commits that
  changed `content/seasons.json`, `content/site.json` or `public/images/uploads/`, not code
  changes elsewhere in `content/`.
- **Undo** `{ sha, baseSha? }` puts `content/seasons.json` and `content/site.json` back
  byte-for-byte as they were before `sha`, as a new commit. **Saves made after it are undone too**,
  so say so in the confirm. It is refused (422) if that commit changed neither file, if it is the
  first commit, if nothing would change, or if the old version no longer passes the checks
  (for example, a picture it uses was deleted). Unknown sha: 404. With `baseSha`, a 409 works as
  in save. Uploaded pictures are never deleted.
- **Going live:** poll `/build-info.json` with `cache: "no-store"`. It is live when its `sha`
  equals the save's `commitSha`, or is a newer commit from History. The file is missing in
  `next dev`.

### Trying it locally

```sh
npm run build
node scripts/dev/fake-github.mjs            # fake GitHub + YouTube on :4010, seeded from this checkout
ADMIN_PASSWORD='correct horse battery' GITHUB_TOKEN=test-token \
  GITHUB_API_URL=http://127.0.0.1:4010 \
  YOUTUBE_OEMBED_URL=http://127.0.0.1:4010/oembed YOUTUBE_THUMBNAIL_URL=http://127.0.0.1:4010/vi \
  npx next start -p 4187
scripts/dev/admin-smoke.sh                  # curl: login → content → YouTube → save → history → undo → 422 → 409
```

The fake keeps its repository in memory (restart it to start over). `POST /__fake/commit
{ message, files }` commits as "someone else". The YouTube stand-in treats video ids that start
with `NoEmbed` as embedding turned off, and ids that start with `Missing` as deleted.
`YOUTUBE_OEMBED_URL` and `YOUTUBE_THUMBNAIL_URL` exist only for this; leave them unset in Vercel.

## Screens (plain English, no jargon)

The UI is calm and professional, in the same day/night tokens as the app (see
`docs/DESIGN.md`, grown-up screens). It is responsive, works on a phone, and every action is
reachable by keyboard.

1. **Login:** brand, password field, "Sign in".
2. **Overview:**
   - Live status chip.
   - Counts: collections, stories, challenges.
   - A big **"Add a story"** button.
   - Shortcuts, and a short "How it works" card.
3. **Stories:** grouped by collection, in order, with the picture, title (English and
   Kinyarwanda) and video status. Actions: **Edit**, **Move up/down**, **Delete** (confirm),
   and **Add story to this collection**.
4. **Story editor:**
   1. **"Paste the YouTube link":** the title and picture fill in by themselves, with a
      preview of the picture.
   2. **Length:** read from the YouTube player in the browser when possible; otherwise
      "How long is it? (minutes:seconds)".
   3. **Titles:** English (required) and Kinyarwanda.
   4. **Collection.**
   5. **"Do it at home" activity** in English and Kinyarwanda.
   6. **Skills** (checkboxes).
   7. **Optional question during the story:** the time, a question, 2–4 picture answers
      (upload) and which one is right.
   8. **Picture:** use the YouTube picture or upload your own.
5. **Challenges:** title, sticker picture (upload) and exactly 5 questions. Each question has
   a prompt, 2–4 picture answers (upload) and which one is right. A placement note says
   challenges sit after every 4 stories.
6. **Collections:**
   - Title in both languages, color (sky / coral / leaf / grape), "Live" or "Coming soon",
     poster picture, and order.
   - Add a collection.
7. **Settings:**
   - **Featured stories:** pick up to 6, in order, for the Home slider.
   - **WhatsApp number:** with country code. Leave it empty to hide Contact.
8. **History:** the list of saves with "Undo this".
9. **Help:** what each part does, how long changes take, and what to do if a save is refused.

Every save shows a clear result: "Saved. Live in about 2 minutes." Every refusal lists the
problems in plain words next to the fields they're about.

## Dashboard: how the screens work

The routes are in `app/admin/` (rendered per request with `dynamic = "force-dynamic"`, so `/admin` is
sent with `Cache-Control: private, no-cache, no-store`), the screens in `components/admin/`, and the
pure helpers, with tests, in `lib/admin/ui-*.ts`. The screens only talk to `/api/admin/*` and
`/build-info.json`.

- **Changes stay in the browser until Save.** Editing a story, moving it or changing a setting
  updates a draft; a bar at the bottom says there are unsaved changes, with **Discard** and
  **Save**. Leaving the page with unsaved changes asks first. A new story or challenge stays on its
  own screen until **Add story** / **Add challenge**, so a half-filled form never reaches the draft.
- **A half-filled new story or challenge is never lost without asking.** Once something is filled
  in, every link (the menu, back links, **Cancel**, a **Fix** button) asks "Leave without adding
  this story?", and closing or reloading the page asks too. The dashboard keeps the form, not the
  screen (`newForms` in `AdminProvider`), so being signed out (a 401) or going back with the
  browser doesn't lose it: after signing in, or on **Add a story** / **Add a challenge** again, it
  comes back ("Picking up where you left off", with **Start over**), and the other pages say it
  isn't added yet, with **Finish it** and **Throw it away**. It lasts until the page is reloaded.
- **One save** sends the draft and the new pictures it uses. If the new pictures don't fit in one
  save (40 pictures, 3 MB), the extra ones go first in saves of their own. The summary in History
  is written from what was changed ("Added story “…” and changed the order of stories").
- **Editing goes on during a save.** The save sends the draft as it was when Save was pressed
  (`lib/admin/ui-save.ts`). Anything changed while it runs, by typing or by a picture or YouTube
  lookup that finishes late, stays as unsaved changes on top of it, and the "Saved" message says
  so. Nothing is overwritten by the copy that was sent.
- **Before sending**, the same checks as the server run in the browser (`checkDraft` in
  `lib/admin/ui-issues.ts`, everything but pictures), so most problems show next to their field
  at once. A 422 from the server is shown the same way: next to the field when `issues[].path`
  points at one, and in the "Fix these before saving" list with a **Fix** link that opens the
  field. A 409 shows "Someone else saved changes" with **Reload**; a 401 shows the sign-in screen
  and keeps the draft and any half-filled new story or challenge.
- **Consistency before saving** (`prepareForSave` in `lib/admin/ui-content.ts`): story numbers
  count 1, 2, 3… in each collection, `site.featured` keeps only stories in Live collections, once
  each, at most 6. New ids follow the sample: `s4`, `s1e9`, `s1c3`, `s1e9-p1`, `s1c3-q2`.
  Moving a story swaps it with the next story; challenges keep their places.
- **Pictures** are resized with a canvas (`lib/admin/ui-images.ts`): story pictures 1280×720 and
  posters 800×600, cut from the middle; answers and stickers fit in 512×512 and stay PNG when
  see-through. Names come from `uploadPath()`. The dashboard keeps showing the pictures it just
  saved; after a reload, one that isn't live yet shows a placeholder until the app is rebuilt.
  Resizing takes a moment and editing goes on meanwhile, so the finished picture is put into the
  content as it is then (editors change content with functions of the latest value, and answers
  are found by id), never into the copy that was on screen when the file was picked.
- **YouTube:** the link is looked up with `/api/admin/youtube` (title and picture). The story
  editor alone loads the YouTube IFrame API, in a hidden player, to read the length; if that
  fails it asks for minutes:seconds.
- **Live status** (`lib/admin/ui-live.ts`): after a save the header chip says "Going live…" and
  polls `/build-info.json` every 10 seconds until the build is that save or newer, then "Live ✓".
  A save split into batches waits for its **last** commit (the one with the stories): a build of
  one of its picture-only commits still says "Going live…". A read that fails (offline for a
  moment) changes nothing: the last answer stands and polling goes on, waiting longer after each
  failure (20 s, 40 s, then every minute) until a read works. A save made while the build wasn't
  known is only "Live" once the app is built from it or a newer save.
  After 10 minutes it says "Taking longer than usual". Without build info (`next dev`) it shows
  nothing.

To try it, run the fake GitHub and `next start` as in "Trying it locally", then open `/admin` and
sign in with `correct horse battery`.
