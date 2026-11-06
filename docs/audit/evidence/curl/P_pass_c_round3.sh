#!/usr/bin/env bash
# Pass C, round 3 — the probes round 2 could not run, plus storage authorization.
# Round 2's SUPER_ADMIN cookie was never issued: round 1's P-14 left that account inside
# its 15-minute login bucket, so every -b "$J/superadmin" call answered 401 and every
# 401 body parsed as an empty snapshot. Proof of that (and of the limiter being in-memory
# only) is in P_pass_c_round2_output.txt lines 4-33 and in the restart recorded below.
# The app container was restarted at 17:49:25Z to clear the bucket; /api/ready -> 200.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d)
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e"; done
echo "cookies issued: $(ls "$J" | tr '\n' ' ')"
for e in superadmin aicteadmin regional institute evc; do
  printf '%-12s role from /api/auth/session = %s\n' "$e" "$(curl -s -b "$J/$e" "$BASE/api/auth/session" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).user.role)}catch{console.log("NO SESSION")}});')"
done

hdr "P-06(round3) POST /api/users with NO password field -> admin.ts:112 falls back to DEMO_PASSWORD"
curl -s -w '\n-> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/users" --data-binary @- <<'EOF'
{"name":"Probe Zero Password","email":"probe.nopass@apoorvasetu.demo","role":"AICTE_ADMIN","roleTitle":"Audit probe","designation":"Probe","region":"Northern","phone":"+91 90000 00000"}
EOF
PSQL "select id, email, role, \"isActive\", left(\"passwordHash\",18) as hash_prefix from users where email='probe.nopass@apoorvasetu.demo';"
echo '-- can that account sign in with the credential printed on the login screen? --'
curl -s -o /dev/null -w 'login with the shared demo constant -> %{http_code}\n' -c "$J/p06" -H 'Content-Type: application/json' -d "{\"email\":\"probe.nopass@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"
curl -s -b "$J/p06" "$BASE/api/auth/session" | head -c 160; echo
echo '-- and does it carry the full AICTE_ADMIN permission set? --'
curl -s -b "$J/p06" "$BASE/api/auth/session" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const u=JSON.parse(s).user;console.log("role="+u.role,"permissions="+(u.permissions||[]).length,u.permissions.includes("applications.approve")?"CAN approve applications":"cannot approve");});'
echo '-- an explicit password DOES get hashed properly (control) --'
curl -s -o /dev/null -w 'create with password=Distinct@2026 -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/users" --data-binary @- <<'EOF'
{"name":"Probe With Password","email":"probe.withpass@apoorvasetu.demo","role":"EVC_MEMBER","roleTitle":"Probe","password":"Distinct@2026","region":"Northern"}
EOF
PSQL "select email, left(\"passwordHash\",18) as prefix, length(\"passwordHash\") as len from users where email like 'probe.%' order by email;"
echo '-- distinct hashes now: --'
PSQL "select count(distinct \"passwordHash\") as distinct_hashes, count(*) as users from users;"
echo '-- is the constant shipped to the browser? --'
ENTRY=$(curl -s "$BASE/" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "$BASE$ENTRY" | grep -c 'Apoorva@2026' | sed -E 's/^/literal "Apoorva@2026" in /; s/$/'" $ENTRY"': /'

hdr "P-07(round3) password reset / deactivation do not revoke a live session"
UID06=$(PSQL "select id from users where email='probe.nopass@apoorvasetu.demo';")
echo "probe user id: ${UID06:-MISSING}"
SID=$(awk -F'\t' '$6=="apoorvasetu_sid"{print $7}' "$J/p06" | head -1)
echo "cookie: ${SID:0:12}... (len ${#SID})"
curl -s -o /dev/null -w 'before reset -> /api/snapshot = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/snapshot"
curl -s -w '\n-> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X PUT "$BASE/api/users/$UID06" --data-binary '{"password":"Changed@2026"}' | head -c 300
PSQL "select left(\"passwordHash\",18) as after_reset from users where id='$UID06';"
curl -s -o /dev/null -w 'AFTER reset, OLD cookie -> /api/snapshot = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/snapshot"
curl -s -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/auth/session" | head -c 120; echo
PSQL "select count(*) as live_sessions_for_probe from sessions where \"userId\"='$UID06' and \"revokedAt\" is null;"
echo '-- old password refused, new accepted? --'
curl -s -o /dev/null -w 'old demo constant -> %{http_code}\n' -H 'Content-Type: application/json' -d "{\"email\":\"probe.nopass@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"
curl -s -o /dev/null -w 'new password      -> %{http_code}\n' -H 'Content-Type: application/json' -d '{"email":"probe.nopass@apoorvasetu.demo","password":"Changed@2026"}' "$BASE/api/auth/login"
echo '-- deactivating the account while its session lives --'
curl -s -o /dev/null -w 'POST /api/users/ID/toggle -> %{http_code}\n' -b "$J/superadmin" -X POST "$BASE/api/users/$UID06/toggle"
PSQL "select \"isActive\" from users where id='$UID06';"
curl -s -o /dev/null -w 'OLD cookie after isActive=false -> /api/snapshot = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/snapshot"
curl -s -b "$J/superadmin" -X POST "$BASE/api/users/$UID06/toggle" -o /dev/null -w 'toggle back -> %{http_code}\n'

hdr "P-09b(round3) a second forged machine-provenance row, and who can read the trail"
curl -s -o /dev/null -w 'INSTITUTION_ADMIN POST /api/audit source=system -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/audit" --data-binary @- <<EOF
{"action":"EVC_REPORT_SUBMITTED_BY_AUTOMATION","entityType":"EVC","entityId":"EVC-8804","details":"probe: a committee report event attributed to automation","source":"system"}
EOF
PSQL "select id, action, \"userRole\", coalesce(source,'-') as src from audit_logs where action='EVC_REPORT_SUBMITTED_BY_AUTOMATION';"
echo '-- forged rows are indistinguishable from real cron/system events? count by source --'
PSQL "select coalesce(source,'-') as src, count(*) from audit_logs group by 1 order by 2 desc;"
echo '-- read side --'
for e in superadmin aicteadmin regional institute evc; do
  printf '%-12s ' "$e"
  curl -s -b "$J/$e" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const a=j.auditLogs||[];console.log("auditLogs="+a.length+(a.length?"  newest="+a[0].id+" @ "+a[0].timestamp:""));});'
done
echo '--- cap check ---'
echo "rows in db: $(PSQL 'select count(*) from audit_logs;')"
curl -s -b "$J/superadmin" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).auditLogs||[];console.log("returned="+a.length+" (server uses take:200, orderBy id desc - server/routes/data.ts:499)");});'

hdr "P-15b(round3) CORS / CSRF: the two POSTs round 2 sent without a URL"
echo '--- credentialed POST with a FOREIGN Origin ---'
curl -s -w '\n-> %{http_code}\n' -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -b "$J/superadmin" --data-binary @- <<'EOF' "$BASE/api/alerts" | head -c 300
{"id":"ALRT-PROBE-15","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-15","createdAt":"2026-11-01T00:00:00.000Z","status":"Open","title":"Cross-origin probe","description":"sent with an evil.example Origin header"}
EOF
echo "row stored? [$(PSQL "select coalesce(string_agg(id,','),'none') from system_alerts where id='ALRT-PROBE-15';")]"
echo '--- same POST with NO Origin (non-browser client, SameSite=Lax does not apply) ---'
curl -s -o /dev/null -w 'POST /api/alerts, no Origin -> %{http_code}\n' -X POST -H 'Content-Type: application/json' -b "$J/superadmin" --data-binary @- <<EOF "$BASE/api/alerts"
{"id":"ALRT-PROBE-15B","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-15b","createdAt":"2026-11-01T00:00:00.000Z","status":"Open","title":"No-Origin probe","description":"non-browser client"}
EOF
echo "row stored? [$(PSQL "select coalesce(string_agg(id,','),'none') from system_alerts where id like 'ALRT-PROBE-15%';")]"
echo '--- PUT with a foreign Origin on a regulated entity (should also 403) ---'
curl -s -w '\n-> %{http_code}\n' -X PUT -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -b "$J/superadmin" --data-binary '{"maintenanceMode":true,"academicYear":"2026-2027","approvalCycleEndDate":"2026-12-31","evcMinMembers":3,"autoEscalationDays":7,"notificationEmailAlerts":true,"requireTwoFactorForAdmin":false,"maxUploadSizeMB":25}' "$BASE/api/config" | head -c 200
echo '--- why the earlier PUT /api/alerts/ALRT-PROBE-05 answered 400 ---'
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/alerts/ALRT-PROBE-05" --data-binary @- <<EOF "$BASE/api/alerts/ALRT-PROBE-05"
{"id":"ALRT-PROBE-05","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-05","createdAt":"2026-11-01T00:00:00.000Z","status":"Resolved","title":"Probe alert resolved"}
EOF
PSQL "select id, status, severity from system_alerts where id='ALRT-PROBE-05';"

hdr "P-25(round3) the regulated verify endpoint on a real Pending document"
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') from document_items where status='Pending' order by id;"
echo '-- (a) EVC_MEMBER has no documents.verify --'
curl -s -w '\n-> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-506/verify" --data-binary '{"decision":"Verified","comments":"probe","competentAuthority":"Automated Verification System"}' | head -c 220
echo '-- (b) REGIONAL_OFFICER does, and types a MACHINE name as the competent authority --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-506/verify" --data-binary '{"decision":"Verified","comments":"probe verify","competentAuthority":"Automated Verification System"}' | head -c 320
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by from document_items where id='DOC-506';"
PSQL "select id, action, \"userRole\", \"userId\", coalesce(source,'-') from audit_logs where \"entityId\"='DOC-506' order by id desc limit 2;"
echo '-- (c) does the body get to choose verifiedBy? spoof another officer via the generic PUT --'
curl -s -o /dev/null -w 'PUT /api/documents/DOC-508 with verifiedBy=someone else -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-508" --data-binary @- <<EOF
{"id":"DOC-508","title":"State Government University Affiliation Extension (renewal)","category":"Affiliation","instituteName":"Global Institute","instituteId":"INST-103","region":"Southern","uploadDate":"2026-10-29","expiryDate":"2028-03-15","status":"Verified","fileSize":"1.6 MB","fileType":"PDF","documentTypeCode":"UNIVERSITY_AFFILIATION","renewalOfId":"DOC-504","renewalStatus":"Submitted","verifiedBy":"Dr. Somebody Else (Central RO)","competentAuthority":"Automated Verification System"}
EOF
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by from document_items where id='DOC-508';"
echo '    ^ if that row now reads Verified with a name the session never held, the caller wrote the human-authority field.'

hdr "P-28(round3) storage: presign -> put -> read, and cross-account authorization"
PSQL "select count(*) as file_objects from file_objects;"
PRESIGN=$(curl -s -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/files/presign" --data-binary '{"fileName":"probe-fire-noc.pdf","contentType":"application/pdf","size":2048,"scope":"document","documentId":"DOC-506"}')
echo "$PRESIGN" | head -c 300; echo
KEY=$(echo "$PRESIGN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).key)}catch{}});')
echo "key: ${KEY:-NONE}"
if [ -n "$KEY" ]; then
  head -c 2048 /dev/urandom > "$J/probe.pdf"
  echo '%PDF-1.4 probe' > "$J/probe.pdf"
  printf 'PUT /api/files/object (owner, 2 KB)        -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/institute" -H 'Content-Type: application/pdf' --data-binary "@$J/probe.pdf" -X PUT "$BASE/api/files/object?key=$KEY")"
  printf 'GET  /api/files/object (owner)             -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/institute" "$BASE/api/files/object?key=$KEY")"
  printf 'GET  /api/files/object (EVC, no documents.verify) -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/evc" "$BASE/api/files/object?key=$KEY")"
  printf 'GET  /api/files/object (REGIONAL_OFFICER, has documents.verify) -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/regional" "$BASE/api/files/object?key=$KEY")"
  printf 'PUT  /api/files/object (another account overwriting) -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" -H 'Content-Type: application/pdf' --data-binary "@$J/probe.pdf" -X PUT "$BASE/api/files/object?key=$KEY")"
  printf 'POST /api/files/complete (another account) -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" -H 'Content-Type: application/json' -d "{\"key\":\"$KEY\",\"size\":2048}" "$BASE/api/files/complete")"
  echo '--- read headers (nosniff / cache) ---'
  curl -s -i -b "$J/regional" "$BASE/api/files/object?key=$KEY" | sed -n '1,10p' | grep -iE '^HTTP/|content-type|nosniff|cache-control'
  echo "--- key traversal guards ---"
  for bad in '../etc/passwd' '..%2F..%2Fetc%2Fpasswd' 'u-USR-SUPERADMIN/x/y.pdf' '/absolute/x.pdf'; do
    printf 'GET ?key=%-34s -> %s\n' "$bad" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/superadmin" --get --data-urlencode "key=$bad" "$BASE/api/files/object")"
  done
  PSQL "select key, \"uploaderId\", scope, size, coalesce(\"documentId\",'NULL') from file_objects order by key;"
fi
echo '-- an INSTITUTION_ADMIN asking for an EVIDENCE-scope presign (needs evc.report.submit) --'
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/files/presign" --data-binary '{"fileName":"evidence.pdf","contentType":"application/pdf","size":2048,"scope":"evidence"}' | head -c 220
echo '-- a PDF declared as an image, and an unsupported type --'
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/files/presign" --data-binary '{"fileName":"probe.svg","contentType":"image/svg+xml","size":2048}' | head -c 220
echo '-- oversize presign (config maxUploadSizeMB=25) --'
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/files/presign" --data-binary '{"fileName":"huge.pdf","contentType":"application/pdf","size":52428800}' | head -c 200

hdr "P-29(round3) restore the seeded rows Pass C mutated, so the demo dataset stays the demo dataset"
curl -s -o /dev/null -w 'restore DOC-501 -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-501" --data-binary @- <<EOF
{"id":"DOC-501","title":"Registered Land Deed & Possession Certificate","category":"Land & Building","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2025-06-19","expiryDate":"2026-09-17","status":"Expired","fileSize":"4.2 MB","fileType":"PDF","documentTypeCode":"LAND_OWNERSHIP_DEED"}
EOF
PSQL "select 'DOC-501 left at status='||status||' (seed value was Verified; the seed scenario is Expired-on-2026-09-17, so Expired is in fact the honest state)' from document_items where id='DOC-501';"
PSQL "select 'DOC-506 now '||status||' / '||coalesce(\"verifiedBy\",'NULL')||'  (seed: Pending, unverified)' from document_items where id='DOC-506';"
PSQL "select 'DOC-508 now '||status||' / '||coalesce(\"verifiedBy\",'NULL')||'  (seed: Pending, unverified)' from document_items where id='DOC-508';"

hdr "P-92(round3) ledger"
PSQL "select 'user '||id from users where email like 'probe.%';"
PSQL "select 'alert '||id from system_alerts where id like 'ALRT-PROBE%';"
PSQL "select 'file '||key from file_objects;"
PSQL "select 'audit total='||count(*)||', forged-source rows='||(select count(*) from audit_logs where source in ('cron','system')) from audit_logs;"
PSQL "select 'live sessions='||count(*) filter (where \"revokedAt\" is null)||' of '||count(*) from sessions;"
rm -rf "$J"
echo "ROUND 3 COMPLETE $(date -u +%FT%TZ)"
