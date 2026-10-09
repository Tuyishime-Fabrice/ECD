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
