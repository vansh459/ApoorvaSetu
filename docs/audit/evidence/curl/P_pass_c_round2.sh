#!/usr/bin/env bash
# Pass C, round 2 — repairs the five probes that missed their route/contract in round 1,
# and adds the follow-ups that round 1's data made possible.
# Target: http://localhost:8081 (apoorvasetu:audit-pg, VITE_DATA_MODE=postgres).
# Round 1 left ALRT-PROBE-05, NOTIF-PROBE-05, ESCL-PROBE-12, DOC-PROBE-18 and mutated
# AICTE/2026/12875 + EVC-8805 in place; several probes here depend on those rows existing.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d)
A75='AICTE%2F2026%2F12875'
A72raw='AICTE/2026/12872'
A70raw='AICTE/2026/12870'
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e"; done

hdr "P-06(round2) POST /api/users with no password field, then sign in with the printed demo credential"
echo 'note: round 1 used /api/admin/users, which is not the mounted path (adminRouter paths are /users, mounted at /api).'
CREATE=$(curl -s -w '\n-> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/users" --data-binary @- <<'EOF'
{"name":"Probe Zero Password","email":"probe.nopass@apoorvasetu.demo","role":"AICTE_ADMIN","roleTitle":"Audit probe","designation":"Probe","region":"Northern","phone":"+91 90000 00000"}
EOF
)
echo "$CREATE"
PSQL "select email, role, left(\"passwordHash\",20) as hash_prefix, length(\"passwordHash\") as hash_len, \"isActive\" from users where email='probe.nopass@apoorvasetu.demo';"
echo '-- sign in with the credential the login screen prints --'
curl -s -o /dev/null -w 'login probe.nopass with Apoorva@2026 -> %{http_code}\n' -H 'Content-Type: application/json' -d "{\"email\":\"probe.nopass@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"
echo '-- is the shared constant visible in the browser bundle at all? --'
curl -s "$BASE/" -o /dev/null
ENTRY=$(curl -s "$BASE/" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
echo "bundle: $ENTRY"
curl -s "$BASE$ENTRY" | grep -c 'Apoorva@2026' | sed -s 's/^/literal credential occurrences in the shipped JS: /'
echo '-- per-user salt check: how many distinct hashes for how many users --'
PSQL "select count(distinct \"passwordHash\") as distinct_hashes, count(*) as users from users;"

hdr "P-07(round2) password reset does not revoke live sessions"
UID06=$(PSQL "select id from users where email='probe.nopass@apoorvasetu.demo';")
echo "probe user id: ${UID06:-MISSING}"
login probe.nopass@apoorvasetu.demo "$J/c06"
SID=$(awk -F'\t' '$6=="apoorvasetu_sid"{print $7}' "$J/c06" | head -1)
echo "live sessions for the probe user before reset: $(PSQL "select count(*) from sessions where \"userId\"='${UID06:-none}' and \"revokedAt\" is null;")"
echo "cookie held: ${SID:0:16}...  (length ${#SID})"
curl -s -o /dev/null -w 'old cookie before reset -> /api/auth/session = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/auth/session"
echo "-- SUPER_ADMIN resets the password (PUT /api/users/:id) --"
curl -s -w '\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X PUT "$BASE/api/users/$UID06" --data-binary @- <<'EOF'
{"password":"Changed@2026"}
EOF
PSQL "select left(\"passwordHash\",20) as hash_prefix_after, length(\"passwordHash\") as hash_len from users where email='probe.nopass@apoorvasetu.demo';"
echo "-- replay the OLD session cookie after the reset --"
curl -s -o /dev/null -w 'old cookie AFTER reset -> /api/auth/session = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/auth/session"
curl -s -o /dev/null -w 'old cookie AFTER reset -> /api/snapshot      = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/snapshot"
curl -s -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/auth/session" | head -c 200; echo
PSQL "select count(*) as live_sessions_after_reset from sessions where \"userId\"='$UID06' and \"revokedAt\" is null;"
echo "-- and the old password is now refused? --"
curl -s -o /dev/null -w 'old password login -> %{http_code}\n' -H 'Content-Type: application/json' -d "{\"email\":\"probe.nopass@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"
curl -s -o /dev/null -w 'new password login -> %{http_code}\n' -H 'Content-Type: application/json' -d '{"email":"probe.nopass@apoorvasetu.demo","password":"Changed@2026"}' "$BASE/api/auth/login"
echo "-- deactivate the account; does the live session die with it? --"
curl -s -o /dev/null -w 'POST /api/users/'$UID06'/toggle -> %{http_code}\n' -b "$J/superadmin" -X POST "$BASE/api/users/$UID06/toggle"
curl -s -o /dev/null -w 'same cookie after isActive=false -> /api/snapshot = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/snapshot"
PSQL "select \"isActive\" from users where id='$UID06';"
echo "-- restore so the ledger stays tidy --"
curl -s -o /dev/null -w 'toggle back -> %{http_code}\n' -b "$J/superadmin" -X POST "$BASE/api/users/$UID06/toggle"

hdr "P-09(round2) forged machine provenance on POST /api/audit (previousState/newState are STRINGS, max 1000)"
N0=$(PSQL "select count(*) from audit_logs;")
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/audit" --data-binary @- <<EOF
{"action":"APPLICATION_APPROVED","entityType":"Application","entityId":"$A72raw","details":"Written by an INSTITUTION_ADMIN but labelled source=cron.","previousState":"{\"stage\":\"Approval (Subject to Undertaking)\"}","newState":"{\"stage\":\"Final Approval\",\"status\":\"Approved\"}","eventType":"application.approved","source":"cron"}
EOF
echo "audit rows before=$N0 after=$(PSQL 'select count(*) from audit_logs;')"
PSQL "select id, action, \"entityId\", \"userId\", \"userRole\", coalesce(source,'-') as src, \"ipAddress\" from audit_logs order by \"rowid\" desc limit 2;" 2>/dev/null || PSQL "select id, action, \"entityId\", \"userId\", \"userRole\", coalesce(source,'-') as src from audit_logs where action='APPLICATION_APPROVED';"
echo '-- a second forgery: source=system, action claiming an EVC report, by an INSTITUTION_ADMIN --'
curl -s -o /dev/null -w 'POST /api/audit source=system -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' --data-binary @- <<EOF
{"action":"EVC_REPORT_SUBMITTED_BY_AUTOMATION","entityType":"EVC","entityId":"EVC-8804","details":"probe","source":"system"}
EOF
echo '-- can a non-auditor read the trail they just forged? (audit.read) --'
curl -s -o /dev/null -w 'INSTITUTION_ADMIN snapshot audit rows -> %{http_code}\n' -b "$J/institute" "$BASE/api/snapshot"
curl -s -b "$J/institute" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("institute sees auditLogs="+(j.auditLogs||[]).length,"rolePermissions="+(j.rolePermissions||[]).length,"config="+(j.config?"yes":"no"));});'
curl -s -b "$J/evc" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("evc sees auditLogs="+(j.auditLogs||[]).length,"rolePermissions="+(j.rolePermissions||[]).length,"escalations="+(j.escalations||[]).length);});'

hdr "P-21(round2) generic writes leave no audit trail at all (the L3-01 gap, isolated)"
N1=$(PSQL "select count(*) from audit_logs;")
echo "audit rows now: $N1"
curl -s -o /dev/null -w 'PUT /api/documents/DOC-501 as REGIONAL_OFFICER (Verified -> Expired) -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-501" --data-binary @- <<'EOF'
{"id":"DOC-501","title":"Registered Land Deed & Possession Certificate","category":"Land & Building","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2025-06-19","expiryDate":"2026-09-17","status":"Expired","fileSize":"4.2 MB","fileType":"PDF","documentTypeCode":"LAND_OWNERSHIP_DEED"}
EOF
PSQL "select id, status from document_items where id='DOC-501';"
curl -s -o /dev/null -w 'PUT /api/alerts/ALRT-PROBE-05 (critical Open -> resolved) -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/alerts/ALRT-PROBE-05" --data-binary @- <<'EOF'
{"id":"ALRT-PROBE-05","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-05","createdAt":"2026-11-01T00:00:00.000Z","status":"Resolved","title":"Probe alert resolved by the institution that did not own it"}
EOF
N2=$(PSQL "select count(*) from audit_logs;")
echo "audit rows after both writes: $N2  (added: $((N2-N1)))"

hdr "P-23(round2) cross-role visibility of the rows Pass C wrote (do alerts/notifications respect targetRole/region?)"
echo "-- ALRT-PROBE-05 is region NULL + instituteId NULL (national). NOTIF-PROBE-05 targets SUPER_ADMIN. --"
for e in superadmin regional institute evc aicteadmin; do
  printf '%-12s ' "$e"
  curl -s -b "$J/$e" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const a=(j.alerts||[]).map(x=>x.id);const n=(j.notifications||[]).map(x=>x.id);const esc=(j.escalations||[]).map(x=>x.id);console.log("alerts["+a.length+"]="+a.join(",")+" notifs["+n.length+"]="+n.join(",")+" escal["+esc.length+"]="+esc.join(","));});'
done

hdr "P-24(round2) audit cap and ordering, from the running server"
echo "rows in db: $(PSQL 'select count(*) from audit_logs;')"
curl -s -b "$J/superadmin" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const a=j.auditLogs||[];console.log("returned="+a.length);console.log("order ids: "+a.slice(0,4).map(x=>x.id).join(" -> ")+" ... "+a.slice(-2).map(x=>x.id).join(" -> "));console.log("timestamps: first="+a[0].timestamp+"  last="+a[a.length-1].timestamp);});'
echo '-- proof the ordering is by id, not time: same table ordered two ways --'
PSQL "select 'by id desc : '||string_agg(id,' | ') from (select id from audit_logs order by id desc limit 4) t;"
PSQL "select 'by time asc: '||string_agg(id,' | ') from (select id from audit_logs order by timestamp asc limit 4) t;"

hdr "P-15(round2) CORS: preflight and credentialed POST, both origins, with the URL supplied"
echo '--- preflight from a FOREIGN origin ---'
curl -s -i -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' "$BASE/api/alerts" | sed -n '1,12p'
echo '--- preflight from an ALLOWED origin (same host:port) ---'
curl -s -i -X OPTIONS -H 'Origin: http://localhost:8081' -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: content-type' "$BASE/api/alerts" | sed -n '1,12p'
grep -n -A12 'isOriginAllowed' server/config.ts 2>/dev/null || grep -rn -A12 'export function isOriginAllowed' server/
echo '--- credentialed POST with a FOREIGN Origin (CSRF-shaped) ---'
curl -s -w '\n-> %{http_code}\n' -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -b "$J/superadmin" --data-binary @- <<'EOF' | head -c 300
{"id":"ALRT-PROBE-15","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-15","createdAt":"2026-11-01T00:00:00.000Z","status":"Open","title":"Cross-origin probe","description":"sent with an evil.example Origin header"}
EOF
PSQL "select id from system_alerts where id='ALRT-PROBE-15';" | sed -s 's/^/row stored?: /'
echo '--- same POST with NO Origin header (curl/non-browser client) ---'
curl -s -o /dev/null -w 'POST /api/alerts, no Origin -> %{http_code}\n' -X POST -H 'Content-Type: application/json' -b "$J/superadmin" --data-binary @- <<'EOF'
{"id":"ALRT-PROBE-15B","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-15b","createdAt":"2026-11-01T00:00:00.000Z","status":"Open","title":"No-Origin probe","description":"non-browser client"}
EOF
echo '--- oversized body guard (express.json limit) ---'
BIG="$J/big.json"
node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],JSON.stringify({id:"ALRT-BIG",rule:"x",entityType:"Application",entityId:"y",tier:"L1",severity:"low",dedupeKey:"k",createdAt:"2026",status:"Open",title:"z".repeat(3*1024*1024),description:"probe"}))' "$BIG"
echo "body bytes: $(wc -c < "$BIG")"
curl -s -o /dev/null -w 'POST /api/alerts with that body -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary "@$BIG" "$BASE/api/alerts"
grep -rn 'MAX_BODY_BYTES' src/services/aiGuard.ts | head -3
echo '--- unauthenticated /api/health body (what does it disclose?) ---'
curl -s "$BASE/api/health"; echo
echo '--- full response header set on the SPA document ---'
curl -s -i "$BASE/" | sed -n '1,14p' | grep -viE '^(content-length|etag|last-modified|date|connection|keep-alive|accept-ranges)'

hdr "P-25(round2) a real Pending document, then the regulated verify endpoint with a machine-sounding authority"
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') from document_items where status='Pending' limit 3;"
curl -s -o /dev/null -w 'POST /api/documents DOC-PROBE-25 (status Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary @- <<'EOF'
{"id":"DOC-PROBE-25","title":"Probe document awaiting verification","category":"Fire Safety","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"Pending","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC"}
EOF
echo '-- REGIONAL_OFFICER verifies it, claiming the authority is an automated system --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-25/verify" --data-binary @- <<'EOF'
{"decision":"Verified","comments":"probe verify","competentAuthority":"Automated Verification System"}
EOF
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by, coalesce(\"verifiedAt\"::text,'NULL') from document_items where id='DOC-PROBE-25';" 2>/dev/null || PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by from document_items where id='DOC-PROBE-25';"
echo '-- is verifiedBy taken from the session or from the body? send a spoofed one --'
curl -s -o /dev/null -w 'POST /api/documents DOC-PROBE-25B with spoofed verifiedBy -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' --data-binary @- <<'EOF'
{"id":"DOC-PROBE-25B","title":"Probe doc B","category":"Fire Safety","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"Pending","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC","verifiedBy":"Dr. Somebody Else (Central RO)"}
EOF
curl -s -o /dev/null -w 'verify DOC-PROBE-25B -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-25B/verify" --data-binary '{"decision":"Verified","comments":"probe","competentAuthority":"Dr. Somebody Else (Central RO)"}'
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') from document_items where id='DOC-PROBE-25B';"
echo '-- EVC_MEMBER (no documents.verify) tries the same --'
curl -s -w '\n-> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-25/verify" --data-binary '{"decision":"Verified","comments":"probe","competentAuthority":"EVC"}' | head -c 200

hdr "P-26(round2) session hygiene: concurrent sessions, expiry, logout revocation"
PSQL "select count(*) as total, count(*) filter (where \"revokedAt\" is null) as live, count(distinct \"userId\") as users from sessions;"
PSQL "select \"userId\", count(*) from sessions group by 1 order by 2 desc;"
echo '-- logout revokes exactly one session --'
BEFORE=$(PSQL "select count(*) from sessions where \"revokedAt\" is null;")
curl -s -o /dev/null -w 'POST /api/auth/logout -> %{http_code}\n' -b "$J/evc" -X POST "$BASE/api/auth/logout"
AFTER=$(PSQL "select count(*) from sessions where \"revokedAt\" is null;")
echo "live sessions $BEFORE -> $AFTER"
curl -s -o /dev/null -w 'the logged-out cookie now -> /api/snapshot = %{http_code}\n' -b "$J/evc" "$BASE/api/snapshot"
echo '-- rememberMe vs not: two different lifetimes? --'
R1=$(curl -s -i -H 'Content-Type: application/json' -d "{\"email\":\"institute@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login" | grep -i '^set-cookie')
R2=$(curl -s -i -H 'Content-Type: application/json' -d "{\"email\":\"institute@apoorvasetu.demo\",\"password\":\"$PW\",\"rememberMe\":true}" "$BASE/api/auth/login" | grep -i '^set-cookie')
echo "no rememberMe : $R1"
echo "rememberMe    : $R2"
echo '-- cookie Secure flag when served over plain http (expected absent) and SameSite --'
echo "$R1" | grep -oiE 'httponly|samesite=[a-z]+|secure' | sort -u | tr '\n' ' '; echo

hdr "P-27(round2) PUT /api/config is permission-checked (contrast with the unguarded writes)"
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/config" --data-binary '{"maintenanceMode":true,"academicYear":"2026-2027","approvalCycleEndDate":"2026-12-31","evcMinMembers":3,"autoEscalationDays":7,"notificationEmailAlerts":true,"requireTwoFactorForAdmin":false,"maxUploadSizeMB":25}' | head -c 240
PSQL "select \"maintenanceMode\" from system_config where id='default';"
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/config" --data-binary '{"maintenanceMode":true,"academicYear":"2026-2027","approvalCycleEndDate":"2026-12-31","evcMinMembers":3,"autoEscalationDays":7,"notificationEmailAlerts":true,"requireTwoFactorForAdmin":false,"maxUploadSizeMB":25}' | head -c 240
echo '-- and a role-permission rewrite by a non-admin? --'
curl -s -o /dev/null -w 'PUT /api/roles/EVC_MEMBER/permissions as REGIONAL_OFFICER -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/roles/EVC_MEMBER/permissions" --data-binary '{"permissions":["applications.approve","documents.verify","evc.read"]}'
PSQL "select permissions from role_permissions where role='EVC_MEMBER';"

hdr "P-91(round2) what Pass C wrote (cleanup ledger, both rounds)"
PSQL "select 'alert' k, id from system_alerts where id like 'ALRT-PROBE%' or id='ALRT-BIG'
      union all select 'notif', id from notification_items where id='NOTIF-PROBE-05'
      union all select 'escal', id from escalation_items where id='ESCL-PROBE-12'
      union all select 'doc', id from document_items where id like 'DOC-PROBE%'
      union all select 'user', id from users where email like 'probe.%'
      union all select 'audit-forged', id from audit_logs where action in ('APPLICATION_APPROVED','EVC_REPORT_SUBMITTED_BY_AUTOMATION')
      order by 1,2;"
echo '-- seeded rows whose values Pass C changed --'
PSQL "select 'doc DOC-501 -> status='||status from document_items where id='DOC-501';"
PSQL "select 'app '||id||' -> stage='||stage||' status='||status||' v='||version from applications where id in ('AICTE/2026/12875','AICTE/2026/12869') order by id;"
PSQL "select 'evc  '||id||' -> status='||status||' reportSubmitted='||\"reportSubmitted\"::text from evc_visits where id in ('EVC-8805','EVC-8801') order by id;"
PSQL "select 'audit_rows_total='||count(*),'live_sessions='||(select count(*) from sessions where \"revokedAt\" is null) from audit_logs;"
rm -rf "$J"
echo "ROUND 2 COMPLETE $(date -u +%FT%TZ)"
