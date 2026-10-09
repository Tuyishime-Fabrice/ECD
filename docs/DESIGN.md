# Izuba design system: "Storybook World"

The app is a **story app** for children aged 3–6 in Rwanda. Children watch short animated
**stories** that each carry a lesson, in a set order, grouped into **collections** (in the
code: `season`). After every 4 stories there is a picture **challenge** that wins a sticker.
Grown-ups have a parent area (`/parents`) and an admin dashboard (`/admin`).

The look: every kid screen lives inside one illustrated Rwandan landscape. There's a sky
gradient, layered terraced hills with beehive huts, banana plants and tea rows, and the sun
mascot **Izuba**. Content floats on the scene as warm paper cards. **Day** (light mode) is a
sunrise. **Night** (dark mode) is the same world under a moon and stars. The app follows the
phone's light/dark setting (`prefers-color-scheme`). There is no in-app toggle.

The approved concept mockups (light mode) were made outside the repo; this document is the source of truth.

## Non-negotiables

- **A 3-year-old who can't read can use it.** Pictures and icons carry the meaning. Tap
  targets are at least 64px, and primary actions 80px or more. Text on kid screens is
  secondary and at least 16px.
- **Never red, never "wrong!".** A wrong answer wobbles and dims, and a voice says "try again".
- **No autoplay** of videos, and no auto-advancing sliders.
- **No external links, ads or tracking** on kid screens. The only external link in the app is
  WhatsApp in the parent area.
- **Fast on cheap Android phones:**
  - CSS-only animation of `transform` and `opacity`. No `backdrop-filter`, no large blur
    filters, no JS animation libraries.
  - At most one looping animation per screen. Honor `prefers-reduced-motion`; globals.css
    already does.
  - Art is SVG files in `public/images/…`, cached offline by the service worker. Use `<img>`
    for big scenes rather than inlining them in every page.
- **Light and dark both work.** Every screen must be checked in both. Use the semantic tokens
  below, never hard-coded hex values in components. Art switches with
  `<picture><source media="(prefers-color-scheme: dark)" srcSet="…-night.svg"><img src="…-day.svg"></picture>`.
- **Don't add npm dependencies.** Tailwind 4, clsx, lucide-react (strokeWidth 2.5), zod and
  React are what we have.

## Tokens (app/globals.css)

Semantic colors switch automatically between day and night. Use them as Tailwind classes:
`bg-paper`, `text-ink`, `bg-play`, `border-line`, and so on.

| Token | Role |
| --- | --- |
| `ground` | Page background below the scene |
| `paper` / `paper-2` | Card surface / sunken surface |
| `line` | Hairlines, the lip of neutral press buttons |
| `ink` / `ink-2` / `ink-3` | Text: primary / secondary / labels (uppercase, letter-spaced) |
| `on-accent` | Icons or large bold text on play/listen/leaf/berry |
| `sun`, `sun-soft`, `sun-lip`, `sun-ink` | **Progress and reward** (gold): watched stones, progress bars, rings, the current question dot. Text on `sun` uses `sun-ink`. |
| `play`, `play-lip`, `play-ink` | **Play actions only** (orange). `play-ink` is orange text on paper ("UP NEXT"). |
| `listen`, `listen-lip`, `listen-ink` | **Audio** (blue): the listen/replay button. Also the accent for grown-up screens. |
| `leaf`, `leaf-soft`, `leaf-ink` | "Watched" checks, success |
| `berry`, `berry-soft`, `berry-lip`, `berry-ink` | **Challenges, gifts, stickers, locks**, and "sleeping" (coming soon) collections |
| `coral`, `coral-soft`, `coral-ink` | Count badges and small warm accents (not an error color) |
| `sky-top` / `sky-bottom` | Scene sky gradient (CSS) |

- **Elevation:**
  - `shadow-e1` for small floats (pills, round tool buttons, row cards).
  - `shadow-e2` for main cards.
  - `shadow-rim` adds the top inner highlight to cards.
  - Never use flat offset beige shadows. The old `tactile` utility is legacy.
- **Press buttons:** `press` plus one of `press-play`, `press-listen`, `press-sun`,
  `press-berry` or `press-paper`. This gives a 3D lip in a darker shade of the button's own
  color, which presses down on `:active`. Use it for every primary kid button and answer tile.
- **Cards and small buttons:** `tap` (scale 0.96 on press).
- **Radii:** `rounded-card` (24) for cards, `rounded-tile` (28) for answer tiles and bubbles,
  `rounded-hero` (32) for the hero and banners. Use `rounded-full` for round buttons, stones
  and badges.
- **Type:** Baloo 2 (`font-display`) for headings, titles, numerals and buttons; Nunito
  (`font-body`) for body text.
  - Kid scale: question prompt 28/800, screen title 26–32/800, card title 16–17/700 with a
    2-line clamp, labels 11–12/800 uppercase with +0.08em tracking.
  - Grown-up screens: normal 16px body.
- **Focus:** a global 4px `sun` outline. Keep it visible.
- **Legacy tokens** (`cream-50`, `ink-900`, `sky-500`, …) still exist only so unconverted
  screens keep building. Don't use them in new work. They will be deleted.

## Illustration rules

- **Environment:** flat and without outlines. Layered silhouettes with atmospheric
  perspective: far hills paler, near hills more saturated. Terraces are lighter contour
  strokes. Add tea hedgerows, beehive "inzu" huts and banana plants (paddle leaves with
  midribs and tears, a purple bud, not palm trees). Scatter meadow flowers in the foreground.
- **Night:**
  - Deep blue sky (`#0b1533` → `#2b2f63`) with stars and a moon.
  - Hills in deep teal and green, a few warm lit hut windows, and fireflies as tiny gold dots.
  - Izuba sleeps or wears a nightcap only on the time's-up screen. Otherwise the mascot stays
    as it is.
- **Characters and objects** (mascot, fruit, gifts, baskets, stickers, emblems): a 3–3.5px
  warm-brown outline (`#5a3112`), soft gradient fills and one white highlight stroke.
- **Izuba:** 8 long and 8 short petal rays, a gradient face, blush cheeks, eyes with
  catch-lights and an open smile. It is the only sun on any screen.
- **Numerals:** "toy-block" style, meaning Baloo 800 with a darker offset extrusion. No
  outlined numerals and no duplicate number badges.
- **Rwandan textures:** imigongo zig-zags and agaseke weaving, used only as subtle bands (gift
  wrap, basket bands, answer-plate rims).
- **Story thumbnails** are story scenes: a character (for example Keza, a Rwandan girl)
  doing something, plus the story's objects. Each has its own hue and composition.
  - 16:9 and crop-safe for both the hero (16:9 or wider) and row cards.
  - Keep the top-right corner clear for status badges and the bottom-right for the Play disc.
  - Real stories will use YouTube frames uploaded through the admin dashboard, so cards must
    look good with photos and animation frames too.

## Screens

### Home: a streaming-style layout for kids (like a video site, but calm)

1. **Top bar.**
   - Left: the brand lockup (Izuba mascot about 44px and the wordmark in Baloo 800, about
     28px).
   - Right: two 56–64px round buttons: **stickers** (`sun-soft`, a die-cut star and a `coral`
     count badge) and **parents** (`paper`, lock).
   - Sticky. It gets `bg-paper` plus `shadow-e1` after scrolling. No blur.
2. **Hero slider.**
   - Featured stories from `content/site.json`. The first slide is the child's
     "keep watching" story, if any.
   - Full width with 16px gutters on phones, and 32px radius with a max width of about 1200px
     on desktop.
   - The story picture covers the slide, with a dark bottom scrim for white text. It shows a
     collection pill, the story title (Baloo 800, 28–40px), and a big orange **Play**
     (`press press-play`, 80–96px) that opens the watch page. A "keep watching" slide also
     has a gold progress bar.
   - Scroll-snap. Dots below; on ≥768px, arrows too. Swipe or tap only, never auto-advance.
3. **Collection rows** (one per published collection).
   - Header: a gold collection "stone" emblem, the title, "Collection 1 · 2 of 8" and a
     **"Path"** pill that opens the collection's path map.
   - Horizontal row of **story cards**: a 16:9 picture (`rounded-card` image inside a paper
     card), "STORY 3" label and title (2-line clamp). Scroll-snap with proximity; the next
     card peeks.
   - Card states:
     - Watched: `leaf` check badge, top-right.
     - In progress: a gold progress bar under the picture.
     - **Up next**: a sun ring and halo, `play-ink` "UP NEXT" label and a corner play disc.
     - Challenge: a `berry-soft` card with a gift, a lock badge while locked, and pips for
       stories done out of 4. It glows gold when unlocked.
4. **Featured banner.** A wide illustrated banner (like a streaming site's mid-page banner)
   inviting the child onto the current collection's **path**. It shows the scene, Izuba and
   a "Path" button.
5. **Coming soon.** Collection posters at 80% with a lilac "zz" badge and a gentle wiggle plus
   sound on tap. No grey locks.
6. **Footer.** A strip of illustrated hills (day or night) with the brand, a "For parents"
   link (lock icon, to `/parents`) and "My stickers". Internal links only.

### Collection path map (`/season/[slug]`)

- A winding road climbs the hills toward the summit. Story stones and challenge gift
  pedestals sit along it.
- **Watched:** gold stones with checks, and the walked part of the road is gold.
- **Current:** a 100px orange play stone with a progress ring and a pulsing halo, Izuba
  standing on it, and a title pill.
- **Not yet:** cream stones with muted numerals and no locks.
- **Challenge:** a `berry` gift pedestal with pips and a lock badge until unlocked.
- Opens scrolled to the current stone. The layout is computed, not hand-placed, from the item
  count: serpentine x, y spacing, a depth scale with a 64px minimum.

### Watch (`/watch/[id]`)

- The scene fills the screen. The player sits in a paper frame (`rounded-card`, `shadow-e2`).
  **Never draw over the YouTube player.**
- Below it: the story title and collection, then a dock of press buttons: Home, big
  Play/Pause (`press-play`) and Start again.
- **End screen:** Izuba cheers. A "Do it at home" card holds the activity for parents. A big
  **Next story** button shows the next story's picture. No autoplay.
- **Mid-story questions** use the question screen below.

### Question and challenge

- **Top:** Home escape (64px), and a 5-dot progress track ending in the gift.
- **Prompt:** a speech bubble from Izuba, who rises behind a hill. It has an 88px blue
  **Listen** button (`press press-listen`) and the prompt text.
- **Answers:** 2–4 big press tiles (`rounded-tile`) with a woven agaseke plate, in the thumb
  zone.
- **Right answer:** gold ring, sparkles, Izuba bounces.
- **Wrong answer:** the tile wobbles and dims, with a "try again" voice. After 2 misses the
  correct tile gently glows.
- **Challenge intro:** the gift on a pedestal with Izuba and a big Start.
- **Challenge done:** stars, then the sticker reveal with light rays.

### Stickers, Time's up, offline, 404

- **Stickers:** a sticker album: paper pages with slots. Earned stickers are bright; unearned
  ones are a `berry-soft` gift silhouette with "?". Never a grey circle.
- **Time's up:** the night scene with sleeping Izuba and "Time to play!" in the day theme too,
  plus the parent "+10 minutes" gate.
- **Offline and 404:** friendly scene with the mascot and a Home button.

### Grown-up screens (parent area, admin)

- Calm and professional, in the same tokens.
  - Background `paper-2`, cards `paper` with `shadow-e1`, `line` borders.
  - Accent `listen`, normal 16px Nunito body and Baloo headings.
- **Tap targets:** 44px minimum for grown-ups.
- **Dark mode** follows the system too.
