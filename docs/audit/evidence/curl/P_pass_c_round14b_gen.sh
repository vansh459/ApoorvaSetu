#!/usr/bin/env bash
# Pass C, round 14b — root-causing round 14's step 3: a fresh clone cannot build.
# Round 14 recorded `npm run build` exit=1 on a never-seen-before clone with 17 TypeScript errors of the
# shape  Module '"@prisma/client"' has no exported member 'User' / 'Session' / 'SystemAlert'.
# This round answers one question only: is the failure "the repository does not compile", or
# "the generated Prisma client is a build prerequisite nobody documented"?
# The clone lives in %TEMP%, never inside the repository (round 14's in-repo clone could not be deleted
# while its server held a file handle). Nothing here touches the audited container.
set +e
ROOT="$(pwd)"
DEST="$TEMP/audit-freshclone14b"
CLONE="$DEST/clone"
PORT=8091
rm -rf "$DEST"; mkdir -p "$DEST"
hdr() { printf '\n================ %s ================\n' "$1"; }

hdr "0. the exact README quickstart a newcomer follows"
sed -n '14,32p' "$ROOT/README.md" | cat -n | sed 's/^/   /'

hdr "1. clone + npm ci, with lifecycle scripts visible"
git clone --quiet "$ROOT" "$CLONE" > "$DEST/clone.log" 2>&1
echo "   clone exit=$? HEAD=$(git -C "$CLONE" rev-parse --short HEAD)"
( cd "$CLONE" && npm ci --no-audit --no-fund --foreground-scripts ) > "$DEST/ci.log" 2>&1
echo "   npm ci exit=$? | lines=$(wc -l < "$DEST/ci.log")"
echo "   did anything mention prisma generate?  $(grep -ci 'prisma generate\|Generated Prisma Client\|Prisma schema loaded' "$DEST/ci.log") hit(s)"
grep -i "prisma" "$DEST/ci.log" | head -4 | sed 's/^/     /'

hdr "2. the state of the generated client after npm ci"
echo "   node_modules/.prisma/client exists?  $([ -d "$CLONE/node_modules/.prisma/client" ] && echo yes || echo 'NO - never generated')"
echo "   .prisma/client/index.d.ts size:      $(wc -c < "$CLONE/node_modules/.prisma/client/index.d.ts" 2>/dev/null || echo 0) B (the stub is ~1-2 KB; a real client is MB)"
echo "   @prisma/client default.d.ts exports: $(grep -c 'export' "$CLONE/node_modules/@prisma/client/default.d.ts" 2>/dev/null) line(s)"
node -e "const p=require(process.argv[1]+'/node_modules/@prisma/client/package.json');
console.log('     @prisma/client version '+p.version+' | scripts.postinstall = '+(p.scripts&&p.scripts.postinstall||'NONE'));" "$CLONE"
echo "   prisma schema present in clone?      $([ -f "$CLONE/prisma/schema.prisma" ] && echo yes || echo NO)"
echo "   package.json postinstall / prepare:  $(node -e "const p=require(process.argv[1]+'/package.json');console.log(JSON.stringify({postinstall:p.scripts.postinstall||null,prepare:p.scripts.prepare||null,build:p.scripts.build}))" "$CLONE")"

hdr "3. npm run build BEFORE generate (the documented order) — expect exit 1"
( cd "$CLONE" && npm run build ) > "$DEST/build-before.log" 2>&1
echo "   exit=$? | TS error lines=$(grep -c 'error TS' "$DEST/build-before.log")"
grep 'error TS' "$DEST/build-before.log" | head -6 | sed 's/^/     /'
echo "   distinct error codes: $(grep -o 'error TS[0-9]*' "$DEST/build-before.log" | sort -u | tr '\n' ' ')"
echo "   dist/ produced?  $([ -d "$CLONE/dist" ] && echo "yes ($(ls -1 "$CLONE/dist" | tr '\n' ' '))" || echo 'NO - so npm run server would serve a 404 at /')"

hdr "4. the one missing step, run explicitly"
( cd "$CLONE" && npx prisma generate ) > "$DEST/gen.log" 2>&1
echo "   prisma generate exit=$? | $(grep -i 'Generated Prisma Client' "$DEST/gen.log" | head -1)"
echo "   .prisma/client/index.d.ts now $(wc -c < "$CLONE/node_modules/.prisma/client/index.d.ts" 2>/dev/null || echo 0) B"

hdr "5. npm run build AFTER generate — same commit, same node_modules, one step added"
( cd "$CLONE" && npm run build ) > "$DEST/build-after.log" 2>&1
echo "   exit=$? | TS error lines=$(grep -c 'error TS' "$DEST/build-after.log")"
tail -6 "$DEST/build-after.log" | sed 's/^/     /'
echo "   dist/ now: $([ -d "$CLONE/dist" ] && du -sk "$CLONE/dist" | cut -f1)"

hdr "6. does the built clone then serve the SPA with no configuration?"
( cd "$CLONE" && PORT=$PORT node --experimental-strip-types server/index.ts > "$DEST/server.log" 2>&1 & echo $! > "$DEST/server.pid" )
st="000"
for i in $(seq 1 25); do
  st=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/ready" 2>/dev/null)
  [ "$st" = "200" ] && break
  sleep 1
done
echo "   boot log:"; head -6 "$DEST/server.log" | sed 's/^/     /'
echo "   /api/ready -> $st (503 is correct for demo mode: no DATABASE_URL)"
echo "   GET /            -> $(curl -s -o /dev/null -w '%{http_code} %{size_download}B' "http://localhost:$PORT/")  (round 14 got 404 139B because dist/ was missing)"
echo "   GET /applications-> $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/applications")"
echo "   GET /api/nope    -> $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/nope") body=$(curl -s "http://localhost:$PORT/api/nope")"
echo "   GET /assets      -> $(ls "$CLONE/dist/assets" 2>/dev/null | head -2 | tr '\n' ' ')"
kill "$(cat "$DEST/server.pid")" 2>/dev/null; echo "   server stopped"

hdr "7. is the Docker path immune? (the image runs generate inside the build)"
grep -n "prisma generate\|npm run build\|npm ci\|COPY prisma" "$ROOT/Dockerfile" | sed 's/^/   /'
echo "   ^ if the Dockerfile generates before building, the shipped demo works and only the HOST"
echo "     quickstart in README.md:16-26 is broken — which is exactly what a judge on a laptop hits."

hdr "8. teardown"
rm -rf "$DEST"
echo "   clone deleted from TEMP: $([ -e "$DEST" ] && echo 'FAILED' || echo yes)"
docker stats --no-stream --format '   {{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' apoorvasetu-audit-pg apoorvasetu-db-1
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
echo "   audited DB: apps=$(PSQL 'select count(*) from applications') docs=$(PSQL 'select count(*) from document_items') und=$(PSQL 'select count(*) from undertakings') audit=$(PSQL 'select count(*) from audit_logs') sessions=$(PSQL 'select count(*) from sessions')"
echo "   repo entries outside docs/audit: $(git -C "$ROOT" status --porcelain | grep -vc 'docs/audit/')"
echo "ROUND 14B COMPLETE $(date -u +%FT%TZ)"
