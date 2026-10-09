#!/usr/bin/env bash
# End-to-end check of the admin API with curl, against a running app that talks to
# scripts/dev/fake-github.mjs. See docs/ADMIN.md, "Trying it locally".
#
#   BASE=http://127.0.0.1:4187 FAKE=http://127.0.0.1:4010 PASSWORD='correct horse battery' scripts/dev/admin-smoke.sh
set -euo pipefail

BASE=${BASE:-http://127.0.0.1:4187}
FAKE=${FAKE:-http://127.0.0.1:4010}
PASSWORD=${PASSWORD:-correct horse battery}
DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT
JAR="$DIR/cookies"

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
# call METHOD PATH [BODY_FILE] → prints the HTTP status, saves the body to $DIR/out.json
call() {
  local args=(-sS -o "$DIR/out.json" -w '%{http_code}' -X "$1" -b "$JAR" -c "$JAR" -H "Origin: $BASE")
  if [[ $# -ge 3 ]]; then args+=(-H 'Content-Type: application/json' --data-binary "@$3"); fi
  curl "${args[@]}" "$BASE$2"
}
expect() { # expect STATUS ACTUAL
  if [[ "$1" != "$2" ]]; then echo "✖ expected HTTP $1, got $2:"; cat "$DIR/out.json"; echo; exit 1; fi
  echo "✔ HTTP $2"
}
js() { node -e "const fs=require('fs');const out=JSON.parse(fs.readFileSync('$DIR/out.json','utf8'));$1"; }

step "1. Session before signing in"
expect 200 "$(call GET /api/admin/session)"
js 'console.log(JSON.stringify(out)); if (out.loggedIn) process.exit(1)'

step "2. A wrong password is refused (after a pause)"
echo '{"password":"nope"}' > "$DIR/bad.json"
start=$(date +%s%N)
expect 401 "$(call POST /api/admin/login "$DIR/bad.json")"
echo "  took $(( ($(date +%s%N) - start) / 1000000 )) ms"

step "3. Sign in"
node -e 'console.log(JSON.stringify({password: process.argv[1]}))' "$PASSWORD" > "$DIR/login.json"
expect 200 "$(call POST /api/admin/login "$DIR/login.json")"
grep -o 'izuba_admin.*' "$JAR" | cut -c1-40
expect 200 "$(call GET /api/admin/session)"
js 'console.log(JSON.stringify(out)); if (!out.loggedIn) process.exit(1)'

step "4. Load the content"
expect 200 "$(call GET /api/admin/content)"
cp "$DIR/out.json" "$DIR/content.json"
js 'console.log("baseSha", out.baseSha, "·", out.seasons.seasons.length, "collections")'

step "5. Look up a YouTube link"
expect 200 "$(call GET '/api/admin/youtube?url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ%3Fsi%3Dabc')"
cp "$DIR/out.json" "$DIR/video.json"
js 'console.log(out.id, JSON.stringify(out.title), out.thumbnail && out.thumbnail.type, out.thumbnail && out.thumbnail.base64.length + " base64 chars")'

step "6. Save: new picture for story 1, its YouTube id, and a WhatsApp number"
node -e '
  const fs = require("fs");
  const { seasons, site, baseSha } = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const video = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const story = seasons.seasons[0].items[0].episode;
  const path = "/images/uploads/smoke-test-" + Date.now().toString(16) + ".jpg";
  story.thumbnail = path;
  story.youtubeId = video.id;
  site.contact.whatsapp = "+250 781 234 567";
  const body = { seasons, site, uploads: [{ path, base64: video.thumbnail.base64 }], summary: "Smoke test: new picture for story 1", baseSha };
  fs.writeFileSync(process.argv[3], JSON.stringify(body));
' "$DIR/content.json" "$DIR/video.json" "$DIR/save.json"
expect 200 "$(call POST /api/admin/save "$DIR/save.json")"
SAVE_SHA=$(js 'process.stdout.write(out.commitSha)')
echo "  commit $SAVE_SHA"

step "7. History lists the save first"
expect 200 "$(call GET /api/admin/history)"
js "console.log(out.commits.slice(0, 3).map(c => c.sha.slice(0, 7) + ' ' + c.date + ' ' + c.summary).join('\n')); if (out.commits[0].sha !== '$SAVE_SHA') process.exit(1)"

step "8. Undo it"
echo "{\"sha\":\"$SAVE_SHA\"}" > "$DIR/undo.json"
expect 200 "$(call POST /api/admin/undo "$DIR/undo.json")"
js 'console.log("  commit", out.commitSha)'
expect 200 "$(call GET /api/admin/content)"
node -e '
  const fs = require("fs");
  const before = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const now = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const same = JSON.stringify(before.seasons) === JSON.stringify(now.seasons) && JSON.stringify(before.site) === JSON.stringify(now.site);
  console.log(same ? "✔ content is back to how it was before the save" : "✖ content differs after undo");
  process.exit(same ? 0 : 1);
' "$DIR/content.json" "$DIR/out.json"
cp "$DIR/out.json" "$DIR/content2.json"

step "9. A broken save is refused with plain reasons"
node -e '
  const fs = require("fs");
  const { seasons, site, baseSha } = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  seasons.seasons[0].items[1].episode.thumbnail = "/images/uploads/never-uploaded.jpg";
  seasons.seasons[0].items[2].episode.thumbnail = "/images/uploads/not-a-picture.jpg";
  const svg = Buffer.from("<svg onload=alert(1)>").toString("base64");
  const uploads = [{ path: "/images/uploads/not-a-picture.jpg", base64: svg }, { path: "../../app/page.tsx", base64: svg }];
  fs.writeFileSync(process.argv[2], JSON.stringify({ seasons, site, uploads, summary: "broken", baseSha }));
' "$DIR/content2.json" "$DIR/broken.json"
expect 422 "$(call POST /api/admin/save "$DIR/broken.json")"
js 'out.errors.forEach(e => console.log("  - " + e))'

step "10. Someone else saves first → 409"
node -e '
  const number = "+250 7" + String(Date.now()).slice(-8);
  const site = JSON.stringify({ featured: [], contact: { whatsapp: number } }, null, 2) + "\n";
  console.log(JSON.stringify({ message: "Someone else", files: { "content/site.json": site } }));
' > "$DIR/other.json"
curl -sS -X POST "$FAKE/__fake/commit" -H 'Content-Type: application/json' --data-binary "@$DIR/other.json" > /dev/null
node -e '
  const fs = require("fs");
  const { seasons, site, baseSha } = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  site.contact.whatsapp = "+250 700 000 000";
  fs.writeFileSync(process.argv[2], JSON.stringify({ seasons, site, uploads: [], summary: "late", baseSha }));
' "$DIR/content2.json" "$DIR/late.json"
expect 409 "$(call POST /api/admin/save "$DIR/late.json")"
js 'console.log("  " + out.error)'

step "11. Cross-site and signed-out requests are refused"
code=$(curl -sS -o "$DIR/out.json" -w '%{http_code}' -X POST -b "$JAR" -H 'Origin: https://evil.example' -H 'Content-Type: application/json' --data-binary "@$DIR/late.json" "$BASE/api/admin/save")
expect 403 "$code"
code=$(curl -sS -o "$DIR/out.json" -w '%{http_code}' "$BASE/api/admin/content")
expect 401 "$code"

step "12. Sign out"
echo '{}' > "$DIR/empty.json"
expect 200 "$(call POST /api/admin/logout "$DIR/empty.json")"
expect 401 "$(call GET /api/admin/content)"

step "13. Every reply is no-store"
curl -sSI "$BASE/api/admin/session" | grep -i '^cache-control'

printf '\n\033[1;32mAll admin API checks passed.\033[0m\n'
