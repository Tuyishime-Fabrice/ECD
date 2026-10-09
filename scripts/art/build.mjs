/**
 * Regenerates the Storybook World artwork in public/ (all original, flat SVG):
 *
 *   node scripts/art/build.mjs            # everything
 *   node scripts/art/build.mjs world ui   # only some groups
 *
 * Groups: world (scenes, day + night), thumbs (story pictures), posters (collection posters
 * and stickers), ui (gift, plate, sticker slot, empty states, logo).
 */
import { report, write } from "./lib.mjs";
import { buildPosters } from "./posters.mjs";
import { buildThumbs } from "./thumbs.mjs";
import { buildUi } from "./ui.mjs";
import { buildWorld } from "./world.mjs";

const GROUPS = { world: buildWorld, thumbs: buildThumbs, posters: buildPosters, ui: buildUi };
const wanted = process.argv.slice(2);
for (const [name, build] of Object.entries(GROUPS)) if (!wanted.length || wanted.includes(name)) build(write);
report();
