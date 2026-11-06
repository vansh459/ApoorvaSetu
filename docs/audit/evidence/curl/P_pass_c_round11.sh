#!/usr/bin/env bash
# Pass C, round 11 — the three startup/concurrency numbers lens L8 §8.6 deferred,
# plus the restart behaviour L4-08 could only infer from source.
#   P-55 scryptSync serialisation: 8 simultaneous sign-ins vs 8 sequential ones.
#   P-56 cold start: `docker restart` of the app container, time to /api/ready.
#   P-57 does the login throttle survive that restart? (rateLimit.ts holds an
#        in-memory Map, so the answer should be no - this is the runtime proof
#        L4-08 recorded as a static inference.)
# Non-destructive: the database and the uploads volume live in apoorvasetu-db-1
# and the named volume, so restarting the app container cannot lose audit data.
# Verified after the restart by re-counting rows and confirming the seed is not
# re-applied (SEED_ON_START=1 must be stopped by the "empty database only"
# guard in prisma/seed.ts).
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
APP=apoorvasetu-audit-pg
J=$(mktemp -d -p "$(pwd)")
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr()  { printf '\n================ %s ================\n' "$1"; }
one()  { curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$BASE/api/auth/login"; }

hdr "P-55 sign-in cost, sequential then simultaneous"
echo "   server/password.ts:10 uses scryptSync - the KDF blocks the event loop"
echo '-- one sign-in, as the baseline --'
for i in 1 2 3; do printf '   single #%s (http time): %s\n' "$i" "$(one superadmin@apoorvasetu.demo "$PW")"; done
echo '-- 8 sequential sign-ins --'
T0=$(date +%s%3N); for i in $(seq 1 8); do one institute@apoorvasetu.demo "$PW" >/dev/null; done
T1=$(date +%s%3N); echo "   8 sequential in $(( T1 - T0 )) ms"
echo '-- 8 simultaneous sign-ins (8 curl processes, one connection each) --'
T0=$(date +%s%3N)
for i in $(seq 1 8); do ( one evc@apoorvasetu.demo "$PW" >/dev/null ) & done
wait
T1=$(date +%s%3N); echo "   8 concurrent  in $(( T1 - T0 )) ms"
echo '-- 16 simultaneous --'
T0=$(date +%s%3N)
for i in $(seq 1 16); do ( one regional@apoorvasetu.demo "$PW" >/dev/null ) & done
wait
T1=$(date +%s%3N); echo "   16 concurrent in $(( T1 - T0 )) ms"
echo "   sessions rows now: $(PSQL 'select count(*) from sessions')"
echo '-- wrong password costs the same as the right one (no user-enumeration timing leak) --'
printf '   right : %s\n' "$(one aicteadmin@apoorvasetu.demo "$PW")"
printf '   wrong : %s\n' "$(one aicteadmin@apoorvasetu.demo 'Nope@2026x')"
printf '   no such user: %s\n' "$(one nobody@nowhere.test "$PW")"

hdr "P-57 fill a throttle bucket, then restart, then try the CORRECT password"
for i in $(seq 1 6); do printf '   attempt %s: %s\n' "$i" "$(one aicteadmin@apoorvasetu.demo 'Nope@2026x')"; done
printf '   correct password while capped: %s\n' "$(one aicteadmin@apoorvasetu.demo "$PW")"
echo "   audit rows before restart: $(PSQL 'select count(*) from audit_logs')"
docker stats --no-stream --format '   {{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' "$APP" apoorvasetu-db-1
docker restart "$APP" >/dev/null && echo "   docker restart issued"
T0=$(date +%s%3N)
for i in $(seq 1 60); do
  st=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/ready" 2>/dev/null)
  [ "$st" = "200" ] && break
  sleep 1
done
T1=$(date +%s%3N)
echo "   /api/ready 200 after $(( T1 - T0 )) ms (polled once per second from the restart)"
printf '   correct password immediately after restart: %s\n' "$(one aicteadmin@apoorvasetu.demo "$PW")"
echo "   -> 200 means the failed-attempt buckets did not survive the process"
echo "   -> 429 would mean the limiter is persistent"

hdr "P-56 state and cost after the restart"
docker stats --no-stream --format '   {{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' "$APP" apoorvasetu-db-1
echo "   /api/health: $(curl -s "$BASE/api/health")"
echo "   rows: apps=$(PSQL 'select count(*) from applications') docs=$(PSQL 'select count(*) from document_items') users=$(PSQL 'select count(*) from users') audit=$(PSQL 'select count(*) from audit_logs') sessions=$(PSQL 'select count(*) from sessions')"
echo "   seed re-applied? distinct seeded app ids: $(PSQL 'select count(distinct id) from applications') (10 = not duplicated)"
echo "   SSE rev after restart (is the counter in memory or in the db?):"
curl -s -N -m 3 -b "$J/x" -c "$J/x" -H 'Accept: text/event-stream' "$BASE/api/events" 2>/dev/null | head -4 | tr '\n' '|' | sed 's/^/     /'; echo
PSQL "select concat('     system_config.rev = ', coalesce(\"rev\"::text,'no column')) from system_config where id='default';" 2>/dev/null || echo "     (no rev column on system_config - read from source instead)"
echo "   login limiter: distinct buckets in memory are not observable from outside; the restart test above is the evidence"

hdr "P-99 residue after round 11"
echo "   audit rows: $(PSQL 'select count(*) from audit_logs') | FAILED_LOGIN rows: $(PSQL "select count(*) from audit_logs where action='FAILED_LOGIN_BAD_PASSWORD'")"
echo "   users: $(PSQL 'select count(*) from users') | no probe rows were written this round"
rm -rf "$J"
echo "ROUND 11 COMPLETE $(date -u +%FT%TZ)"
