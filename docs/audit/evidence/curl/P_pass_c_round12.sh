#!/usr/bin/env bash
# Pass C, round 12 — the login throttle and the IP the audit trail records.
#   P-58  reads the limiter's real parameters from source and corrects round 1,
#         whose "capped at the 6th attempt" was an already-partly-filled bucket.
#   P-59  is clientIp() trusting X-Forwarded-For unconditionally: a constant
#         header reaches the cap, a rotating header never does.
#   P-60  the same header lands in audit_logs."ipAddress", which is the field a
#         regulator reads to ask "where did this come from".
#   P-61  cleanup: the container is restarted so no bucket survives into the
#         delivered demo, then health and a real sign-in are re-verified.
# Only unknown emails are used for the failing logins, so no probe user is
# created and no FAILED_LOGIN row is written (auth.ts:66-70 audits only when the
# user exists). The one audit row P-60 writes is listed and deleted by id.
set +e
BASE=http://localhost:8081
APP=apoorvasetu-audit-pg
J=$(mktemp -d -p "$(pwd)")
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr()  { printf '\n================ %s ================\n' "$1"; }
try()  { curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' ${1:+-H "X-Forwarded-For: $1"} -d "{\"email\":\"$2\",\"password\":\"Wrong@2026x\"}" "$BASE/api/auth/login"; }

hdr "P-58 the limiter as written"
sed -n '1,25p' server/rateLimit.ts | grep -n "WINDOW_MS\|MAX_ATTEMPTS\|buckets\|x-forwarded-for\|return first" | sed 's/^/   rateLimit.ts:/'
echo "   -> key = clientIp(req) + ':' + email; window 15 min; MAX_ATTEMPTS 8"
echo "   -> clientIp() prefers the FIRST x-forwarded-for element from any client, with no proxy trust list"
echo "   -> clearLoginRate(rateKey) runs on success (auth.ts:100), and DUMMY_PASSWORD_HASH keeps unknown emails"
echo "      on the same scrypt path - both correct designs."
echo "   correction to round 1 (P-14): that transcript shows try1-5=401, try6=429. The cap is 8, so the"
echo "   bucket already held 3 failures from the P-06/P-07 probes earlier in the same round. The 429 and"
echo "   Retry-After: 889 were real; the apparent threshold was not."

hdr "P-59 constant header reaches the cap, rotating header never does"
E1=throttle-const@apoorvasetu.demo
printf '   constant XFF 203.0.113.9, same unknown address, 10 attempts:\n     '
for i in $(seq 1 10); do printf '%s ' "$(try 203.0.113.9 $E1)"; done; echo
echo "   (expect the first 8 as 401 and the last two as 429 - the cap exists and works)"
E2=throttle-spin@apoorvasetu.demo
printf '   rotating XFF 203.0.113.1 .. .10, same unknown address, 10 attempts:\n     '
for i in $(seq 1 10); do printf '%s ' "$(try "203.0.113.$i" $E2)"; done; echo
echo "   (expect ten 401s: every attempt is a brand-new bucket, so guessing has no rate cost at all)"
echo "   and a fresh identity with the same spoofed IP also starts clean:"
printf '     %s\n' "$(try 203.0.113.9 another-address@apoorvasetu.demo)"
echo "   rows this created anywhere: users=$(PSQL "select count(*) from users where email like 'throttle-%' or email like 'nosuch%' or email like 'another-address%'") (0 - no account is created for a failed login)"

hdr "P-60 the same header is stored as the audit trail's ipAddress"
BEFORE=$(PSQL 'select count(*) from audit_logs')
curl -s -o "$J/a.json" -c "$J/c" -H 'Content-Type: application/json' -d '{"email":"superadmin@apoorvasetu.demo","password":"Apoorva@2026"}' "$BASE/api/auth/login" >/dev/null
curl -s -b "$J/c" -H 'Content-Type: application/json' -H 'X-Forwarded-For: 198.51.100.7, 203.0.113.99' \
  -X POST "$BASE/api/audit" \
  --data-binary '{"action":"PROBE_XFF_IP","entityType":"System","entityId":"PROBE-XFF","details":"written to see which IP the server keeps","source":"ui"}' > "$J/audit.json"
echo "   server response: $(head -c 300 "$J/audit.json" | tr -d '\n')"
ROW=$(PSQL "select id||' | ipAddress='||coalesce(\"ipAddress\",'NULL') from audit_logs where action='PROBE_XFF_IP';")
echo "   stored row: $ROW"
echo "   sent:       X-Forwarded-For: 198.51.100.7, 203.0.113.99   (first element is the client-supplied one)"
echo "   the address every earlier probe really arrived from: ::ffff:172.19.0.1 (docker bridge),"
echo "   recorded in rounds 1-9 - so the stored value above replaced the true one."
XFFID=$(PSQL "select id from audit_logs where action='PROBE_XFF_IP';")
PSQL "delete from audit_logs where id='$XFFID';" | sed 's/^/   cleanup: /'
echo "   audit rows: before=$BEFORE after=$(PSQL 'select count(*) from audit_logs')"

hdr "P-61 cleanup: restart so no bucket survives, then re-verify the demo state"
docker restart "$APP" >/dev/null && echo "   restarted"
T0=$(date +%s%3N)
for i in $(seq 1 60); do st=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/ready"); [ "$st" = "200" ] && break; sleep 1; done
T1=$(date +%s%3N); echo "   /api/ready 200 after $(( T1 - T0 )) ms"
printf '   the throttled identity now signs in (unknown email, so 401 is expected, not 429): %s\n' "$(try '' throttle-const@apoorvasetu.demo)"
printf '   real superadmin sign-in: %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -d '{"email":"superadmin@apoorvasetu.demo","password":"Apoorva@2026"}' "$BASE/api/auth/login")"
echo "   /api/health: $(curl -s "$BASE/api/health")"
docker stats --no-stream --format '   {{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' "$APP" apoorvasetu-db-1
echo "   rows: apps=$(PSQL 'select count(*) from applications') users=$(PSQL 'select count(*) from users') audit=$(PSQL 'select count(*) from audit_logs') sessions=$(PSQL 'select count(*) from sessions')"
echo "   probe audit actions left: $(PSQL "select coalesce(string_agg(id,','),'NONE') from audit_logs where action like 'PROBE_XFF%'")"
rm -rf "$J"
echo "ROUND 12 COMPLETE $(date -u +%FT%TZ)"
