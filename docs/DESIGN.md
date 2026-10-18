# CED Imuhira design system

The app is a **story app** for children aged 3–6 in Rwanda. Children watch short animated
**stories** that each carry a lesson, in a set order, grouped into **collections** (in the
code: `season`). After every 4 stories there is a picture **challenge** that wins a sticker.
Grown-ups have a parent area (`/parents`) and an admin dashboard (`/admin`).

**Brand.** CED Imuhira ("Imuhira" is Kinyarwanda for "home"), tagline **LEARN • PLAY • GROW**
(*Iga · Kina · Kura*). The logo is a teal roof over a coral play button above an open book with
a teal and a mustard page. Logo colors: teal `#124C4A`, coral `#EC775F`, mustard `#F2B83F`,
cream `#FCEFD5`, sage `#BDCDCD`; typeface **Lato**. The official logo is
`scripts/brand/official-logo.webp`, kept exactly as supplied; `scripts/brand/prepare-logo.py`
crops it (transparent around the logo, artwork untouched) into `public/brand/`: `logo.webp`
(sign-in, footer, docs), `logo-sm.webp` (top bars) and `mark.png` (favicon; the app icons come
from it via `scripts/make-icons.mjs`). Give every logo `<img>` the `brand-logo` class: the logo
is drawn for light backgrounds, so in dark mode it sits on a white backing.

**Look.** Calm, warm and professional: few colors at once, white cards with hairline borders
and soft teal-tinted shadows, clear Lato hierarchy, generous space. Every kid screen sits in one
illustrated Rwandan landscape (terraced hills, beehive huts, banana plants, tea rows) in the
brand palette. **Day** (light mode) is a soft mint-to-cream morning; **night** (dark mode) is
the same world in deep teal under a cream moon. The app follows the phone's light/dark setting
(`prefers-color-scheme`); there is no in-app toggle. **Izuba**, the sun, is the story guide who
asks the questions. It is a character, not the brand.

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
| `on-accent` | Icons or large bold text on play/listen/leaf/berry/brand-strong |
| `brand`, `brand-soft`, `brand-strong` | **The logo's teal**: accent text and icons / tinted surfaces / solid fills under white text (grown-up primary buttons). In dark mode `brand` is a light teal. |
| `sun`, `sun-soft`, `sun-lip`, `sun-ink` | **Progress and reward** (mustard): watched stones, progress bars, stars, the "up next" ring. `sun-soft` is the logo's cream. Text on `sun` uses `sun-ink`. |
| `play`, `play-lip`, `play-ink` | **Play / start / go actions only** (coral, a shade deeper than the logo's so the white triangle keeps 3:1). `play-ink` is coral text on paper. |
| `listen`, `listen-lip`, `listen-ink` | **Audio** (teal): the listen/replay button |
| `leaf`, `leaf-soft`, `leaf-ink` | "Watched" checks, success |
| `berry`, `berry-soft`, `berry-lip`, `berry-ink` | **Challenges, gifts, locks** (teal; the name is historical) |
| `coral`, `coral-soft`, `coral-ink` | Small warm accents (never an error color) |
| `sky-top` / `sky-bottom` | Scene sky gradient (CSS) |

- **Elevation:**
  - `shadow-e1` for small floats (pills, round tool buttons, row cards).
  - `shadow-e2` for main cards.
  - `inset-shadow-rim` adds a 1px hairline inside cards.
- **Press buttons:** `press` plus one of `press-play`, `press-listen`, `press-sun`,
  `press-berry` or `press-paper`. This gives a 3D lip in a darker shade of the button's own
  color (4px), which presses down on `:active`. Use it for every primary kid button and answer tile.
- **Cards and small buttons:** `tap` (scale 0.96 on press).
- **Radii:** `rounded-card` (20) for cards, `rounded-tile` (24) for answer tiles and bubbles,
  `rounded-hero` (28) for the hero and banners. Use `rounded-full` for round buttons, stones
  and badges.
- **Type:** Lato only (400, 700, 900 are loaded; there is no 500/600/800). `font-display` and
  `font-body` both map to it.
  - Kid scale: question prompt 26–28/900, screen title 26–32/900 with tight leading, card title
    16–17/900 with a 2-line clamp, `eyebrow` labels (11–12/700 uppercase, letter-spaced).
  - Grown-up screens: 16px body, 900 titles, 700 labels.
- **Focus:** a global teal outline (mustard was too faint on cream). Keep it visible.
- Tailwind's default palette is removed: only the tokens above exist, plus white and black.

## Illustration rules

- **Environment:** flat and without outlines. Layered silhouettes with atmospheric
  perspective: far hills paler, near hills more saturated. Terraces are lighter contour
  strokes. Add tea hedgerows, beehive "inzu" huts and banana plants (paddle leaves with
  midribs and tears, a red-brown bud, not palm trees). Day sky mint `#d6ece6` to cream
  `#fbf0dc` with a cream glow; hills in sage and teal-greens; road in the app's sand tones;
  flowers cream, coral and mustard. Scatter meadow flowers in the foreground.
- **Night:**
  - Deep teal sky (`#071a19` → `#153e3a`) with cream stars and moon. No navy or purple.
  - Hills in dark teal, a few warm lit hut windows, and fireflies as tiny mustard dots.
  - Izuba sleeps or wears a nightcap only on the time's-up screen. Otherwise the mascot stays
    as it is.
- **Characters and objects** (mascot, fruit, gifts, baskets, stickers, emblems): a 3–3.5px
  deep teal-brown outline (`#2f3a33`), soft gradient fills and one white highlight stroke.
  Clothes and props use the brand colors; skin tones and fruit stay natural.
- **Izuba:** mustard, with 8 long and 8 short petal rays, coral cheeks, eyes with catch-lights
  and an open smile. It is the only sun on any screen.
- **Gifts (challenges):** a teal box with a coral ribbon and a mustard bow.
- **Numerals:** "toy-block" style with a darker offset extrusion (outlines stored in
  `scripts/art/digits.json`). Story numbers sit on a teal tile with cream numerals.
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
   - Left: `public/brand/logo-sm.webp`, 48px tall, linking home.
   - Right: **stickers** (a 64px mustard pill with the star and the count) and **parents** (a
     quiet 48px lock circle inside a 64px tap target).
   - Sticky, solid `ground` with a hairline bottom border. No blur.
2. **Hero slider.**
   - Featured stories from `content/site.json`. The first slide is the child's
     "keep watching" story, if any.
   - Full width with 16px gutters on phones, and 32px radius with a max width of about 1200px
     on desktop.
   - Phones: a picture card with a label chip (mustard "keep watching", teal collection),
     the title (Lato 900) and a big coral **Play** disc (`press press-play`).
   - From 768px: a split layout, words and a coral **Watch** button on the left, the picture
     filling the right. A "keep watching" slide has a mustard progress bar.
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
5. **Coming soon.** Collection posters at 80% with a "zz" badge and a gentle wiggle plus
   sound on tap. No grey locks.
6. **Footer.** `public/brand/logo.webp`, the tagline, a short description, "My stickers" and
   "Parent area" links and a privacy line. Internal links only.

### Collection path map (`/season/[slug]`)

- A winding road climbs the hills toward the summit. Story stones and challenge gift
  pedestals sit along it.
- **Watched:** gold stones with checks, and the walked part of the road is gold.
- **Current:** a 100px coral play stone with a progress ring and a pulsing halo, Izuba
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
- **Prompt:** a speech bubble from Izuba, who rises behind a hill. It has an 88px teal
  **Listen** button (`press press-listen`) and the prompt text.
- **Answers:** 2–4 big press tiles (`rounded-tile`) with a woven agaseke plate, in the thumb
  zone.
- **Right answer:** mustard ring, sparkles, Izuba bounces.
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

- Calm and professional, in the same tokens: like good SaaS software.
  - Background `ground`, cards `paper` with hairline `line` borders and soft shadows.
  - Primary buttons solid `brand-strong` with white text; secondary outlined; careful
    actions in warm coral, never alarm red. Accent and focus in `brand` teal.
  - Parent area: logo header, "For parents" eyebrow, two columns on desktop.
  - Admin: white sidebar with the logo and grouped navigation (Overview / Content /
    Manage), page headers with the main action on the right; sign-in shows the full logo.
- **Tap targets:** 44px minimum for grown-ups.
- **Dark mode** follows the system too.
