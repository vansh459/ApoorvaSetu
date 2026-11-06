#!/usr/bin/env bash
# Pass C, round 14 — the fresh-clone test lens L10 §10.10 promised and Stage 0 could not do.
# Clone THIS repository at its committed tip into a directory that has never seen a build, then run
# exactly what README.md:16-55 tells a newcomer to run, in order, recording every exit code.
# Nothing here writes to the audited stack: the clone lives under docs/audit/evidence/freshclone/ and
# is deleted at the end. The Postgres leg is deliberately NOT attempted from the host - see step 9 -
# because docker-compose.postgres.yml publishes no port for `db`, so a host-side
# `prisma migrate deploy` has nothing to connect to; the container entrypoint is the documented path
# and was already measured in Stage 0 (raw/baseline-db-deploy-noenv.txt).
set +e
ROOT="$(pwd)"
DEST="$ROOT/docs/audit/evidence/freshclone"
CLONE="$DEST/clone"
PORT=8090
rm -rf "$DEST"; mkdir -p "$DEST"
hdr()  { printf '\n================ %s ================\n' "$1"; }
run()  { local label="$1"; shift
         printf '\n-- %s\n' "$label"
         ( cd "$CLONE" && "$@" ) > "$DEST/log.txt" 2>&1; local code=$?
         tail -16 "$DEST/log.txt" | sed 's/^/     /'
         printf '   exit=%s | total output lines=%s\n' "$code" "$(wc -l < "$DEST/log.txt")"; }
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }

echo "host: node $(node -v) | npm $(npm -v) | $(git --version)"
echo "docker stats before:"
docker stats --no-stream --format '   {{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' apoorvasetu-audit-pg apoorvasetu-db-1

hdr "1. git clone . into an empty directory"
printf '\n-- git clone --quiet %s %s\n' "$ROOT" "$CLONE"
git clone --quiet "$ROOT" "$CLONE" > "$DEST/clone.log" 2>&1
printf '   exit=%s\n' "$?"
tail -16 "$DEST/clone.log" | sed 's/^/     /'
echo "   cloned HEAD : $(git -C "$CLONE" rev-parse --short HEAD) $(git -C "$CLONE" log -1 --format=%s)"
echo "   parent HEAD : $(git -C "$ROOT" rev-parse --short HEAD)"
echo "   clone is clean: $(git -C "$CLONE" status --porcelain | wc -l) modified/untracked entries"
echo "   tracked files : $(git -C "$CLONE" ls-files | wc -l)"
echo "   dist/ in the clone? $([ -d "$CLONE/dist" ] && echo yes || echo 'no - a build is required')"
echo "   node_modules?       $([ -d "$CLONE/node_modules" ] && echo yes || echo no)"
echo "   .env in the clone?  $([ -f "$CLONE/.env" ] && echo 'YES' || echo 'no - so step 6 tests the no-configuration boot')"

hdr "2. npm ci (README.md:19 says npm install; ci is the stricter test of the lockfile)"
T0=$(date +%s%3N); run "npm ci --no-audit --no-fund" npm ci --no-audit --no-fund
T1=$(date +%s%3N)
echo "   wall time: $(( T1 - T0 )) ms | node_modules: $(du -sm "$CLONE/node_modules" 2>/dev/null | cut -f1) MB"

hdr "3. npm run build (tsc -b && vite build) - README never says this is needed before npm run server"
T0=$(date +%s%3N); run "npm run build" npm run build
T1=$(date +%s%3N)
echo "   wall time: $(( T1 - T0 )) ms"
echo "   dist/: $(ls -1 "$CLONE/dist" 2>/dev/null | tr '\n' ' ')"
ls -la "$CLONE/dist/assets" 2>/dev/null | tail -3 | sed 's/^/     /'

hdr "4. npm run lint"
run "npm run lint" npm run lint

hdr "5. npm run test:run"
run "npm run test:run" npm run test:run

hdr "6. demo boot with NO configuration at all (README.md:17-26: demo mode needs no .env)"
( cd "$CLONE" && PORT=$PORT node --experimental-strip-types server/index.ts > "$DEST/server.log" 2>&1 &
  echo $! > "$DEST/server.pid" )
st="000"
for i in $(seq 1 25); do
  st=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/ready" 2>/dev/null)
  [ "$st" = "200" ] && break; sleep 1
done
echo "   boot log (first 14 lines):"; head -14 "$DEST/server.log" | sed 's/^/     /'
echo "   /api/ready -> $st after ${i}s of polling"
echo "   /api/health -> $(curl -s "http://localhost:$PORT/api/health")"
echo "   GET /               -> $(curl -s -o /dev/null -w '%{http_code} %{size_download}B %{content_type}' "http://localhost:$PORT/")"
echo "   GET /applications   -> $(curl -s -o /dev/null -w '%{http_code} %{content_type}' "http://localhost:$PORT/applications")  (SPA fallback)"
echo "   GET /api/nope       -> $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/nope") body=$(curl -s "http://localhost:$PORT/api/nope")"
echo "   GET /api/snapshot   -> $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/snapshot") (no session)"
echo "   POST /api/auth/login-> $(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -d '{\"email\":\"nobody@example.test\",\"password\":\"x\"}' "http://localhost:$PORT/api/auth/login") (unknown user, demo mode)"

hdr "7. the Node-version claim"
echo "   README.md:17 says 'Requirements: Node.js 20+ and npm'. In the clone:"
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
console.log('     engines field =',JSON.stringify(p.engines||null));
console.log('     server script =',p.scripts.server);" "$CLONE/package.json"
grep -rn "process.versions" "$CLONE/server/" 2>/dev/null | sed 's/^/     /' | head -3
echo "   nothing in server/ reads a version and package.json declares no engines, so on Node 20"
echo "   'npm run server' reaches --experimental-strip-types. NOT measured: this host only has"
echo "   node $(node -v); the Node-20 failure is inferred from the flag, and the README line is"
echo "   the finding either way (Stage 0 captured it in raw/baseline-build.txt notes)."

hdr "8. is the built SPA actually the demo build? (VITE_DATA_MODE is inlined at build time)"
echo "   README.md:41-43 warns mode changes are a rebuild, not an env change. In the clone:"
grep -o -a "getDataMode[^;]\{0,40\}" "$CLONE/dist/assets/"*.js 2>/dev/null | head -2 | sed 's/^/     /'
for m in demo supabase postgres; do
  printf "     occurrences of the literal \"%s\" in the entry chunk: %s\n" "$m" \
    "$(grep -o -a "$m" "$CLONE/dist/assets/"*.js 2>/dev/null | wc -l)"
done
echo "   ^ a plain 'npm run build' with no .env emits whatever getDataMode() defaults to;"
echo "     check src/services/dataMode.ts for the default rather than guessing from the grep."

hdr "9. why the Postgres leg of the README is not runnable from a host clone"
echo "   docker-compose.postgres.yml db service: ports mapping -> $(grep -c 'ports:' <(sed -n '/^  db:/,/^  [a-z]/p' "$CLONE/docker-compose.postgres.yml")) occurrence(s)"
echo "   published host ports on the running audited db container: $(docker port apoorvasetu-db-1 2>/dev/null | tr '\n' ' ')(empty = host-internal only)"
echo "   so 'npm run db:migrate' / 'db:studio' / 'db:seed' from the clone, with DATABASE_URL"
echo "   pointed at localhost:5432 as docs/POSTGRES-DATA-LAYER.md:100-115 implies, has no listener."
echo "   the container entrypoint (server/entrypoint.sh) is the path that does run migrations -"
echo "   measured in Stage 0 and in rounds 11-12 restarts - so this is a documentation gap, not a"
echo "   broken migration."

hdr "10. teardown and proof the audited stack is untouched"
kill "$(cat "$DEST/server.pid")" 2>/dev/null && echo "   clone server stopped"
sleep 2
echo "   port $PORT answering? $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/health" 2>/dev/null || echo closed)"
docker stats --no-stream --format '   {{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' apoorvasetu-audit-pg apoorvasetu-db-1
echo "   audited DB: apps=$(PSQL 'select count(*) from applications') docs=$(PSQL 'select count(*) from document_items') und=$(PSQL 'select count(*) from undertakings') audit=$(PSQL 'select count(*) from audit_logs') sessions=$(PSQL 'select count(*) from sessions')"
rm -rf "$DEST"
echo "   clone deleted: $([ -e "$DEST" ] && echo 'FAILED - still present' || echo yes)"
echo "   repo entries outside docs/audit after teardown:"
git -C "$ROOT" status --porcelain | grep -v 'docs/audit/' | head -5
echo "   (none listed above = the only writes this audit makes are under docs/audit/)"
echo "ROUND 14 COMPLETE $(date -u +%FT%TZ)"
