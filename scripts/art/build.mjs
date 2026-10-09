/**
 * Draws the Storybook World artwork in public/ (all original, flat SVG; see docs/DESIGN.md):
 *
 *   node scripts/art/build.mjs            # everything
 *   node scripts/art/build.mjs world ui   # only some groups
 *
 * Groups: world (scenes, day + night), thumbs (story pictures), posters (collection posters
 * and stickers), ui (gift, plate, sticker slot, empty states, logo), scenes (time's up, day +
 * night), answers (counting pictures and numerals for questions).
 *
 * After changing the logo, also redraw the PNG app icons with scripts/make-icons.mjs.
 */
import { buildAnswers } from "./answers.mjs";
import { report, write } from "./lib.mjs";
import { buildPosters } from "./posters.mjs";
import { buildScenes } from "./scenes.mjs";
import { buildThumbs } from "./thumbs.mjs";
import { buildUi } from "./ui.mjs";
import { buildWorld } from "./world.mjs";

const GROUPS = { world: buildWorld, thumbs: buildThumbs, posters: buildPosters, ui: buildUi, scenes: buildScenes, answers: buildAnswers };
const wanted = process.argv.slice(2);
for (const [name, build] of Object.entries(GROUPS)) if (!wanted.length || wanted.includes(name)) build(write);
report();
