#!/usr/bin/env bash
# Pass C, round 4 — storage end-to-end on the CORRECT container, and the verify probes
# that round 3 lost to jurisdiction (DOC-506/508 are Eastern/Southern, the officer is Northern).
# WHY THIS RUN EXISTS: the container used for rounds 1-3 was started by hand with
#   -e UPLOAD_DIR=/app/data/uploads
# and Git Bash rewrote that to C:/Program Files/Git/app/data/uploads, so the local driver
# tried mkdir '/app/C:' -> EACCES and every upload answered 500. That was my harness, not
# the application. The container is now started with MSYS_NO_PATHCONV=1 and printenv
# confirms UPLOAD_DIR=/app/data/uploads, matching docker-compose.postgres.yml:13.
# Container log evidence for the artefact: "Unhandled API error: Error: EACCES: permission
# denied, mkdir '/app/C:'" at server/storage/local.ts:37 via server/routes/files.ts:185.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d)
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e"; done
echo "UPLOAD_DIR in the container: $(docker exec apoorvasetu-audit-pg printenv UPLOAD_DIR)"

hdr "P-28(round4) storage end-to-end on the local driver"
N0=$(PSQL "select count(*) from file_objects;")
PRESIGN=$(curl -s -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/files/presign" --data-binary '{"fileName":"probe-fire-noc.pdf","contentType":"application/pdf","size":2048,"scope":"document","documentId":"DOC-PROBE-25"}')
echo "$PRESIGN"
KEY=$(echo "$PRESIGN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).key)}catch{}});')
KKEY=$(printf '%s' "$KEY" | sed 's|/|%2F|g')
printf 'PDF magic bytes written: '; head -c 2048 /dev/zero | tr '\0' 'A' > "$J/probe.pdf"; printf '%%PDF-1.4 probe body\n' | cat - "$J/probe.pdf" > "$J/p2.pdf"; mv "$J/p2.pdf" "$J/probe.pdf"; head -c 24 "$J/probe.pdf"; echo " (size $(wc -c < "$J/probe.pdf"))"
printf 'PUT    /api/files/object (owner)                       -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/institute" -H 'Content-Type: application/octet-stream' --data-binary "@$J/probe.pdf" -X PUT "$BASE/api/files/object?key=$KKEY")"
printf 'GET    /api/files/object (owner)                       -> %s\n' "$(curl -s -o /dev/null -w '%{http_code} bytes=%{size_download}' -b "$J/institute" "$BASE/api/files/object?key=$KKEY")"
printf 'GET    /api/files/object (REGIONAL_OFFICER, has documents.verify) -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/regional" "$BASE/api/files/object?key=$KKEY")"
printf 'GET    /api/files/object (AICTE_ADMIN, has documents.verify)      -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" "$BASE/api/files/object?key=$KKEY")"
printf 'GET    /api/files/object (EVC_MEMBER, no documents.verify)        -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/evc" "$BASE/api/files/object?key=$KKEY")"
printf 'GET    /api/files/object (unauthenticated)                        -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/files/object?key=$KKEY")"
printf 'PUT    /api/files/object (another account overwrites)             -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" -H 'Content-Type: application/octet-stream' --data-binary "@$J/probe.pdf" -X PUT "$BASE/api/files/object?key=$KKEY")"
echo '--- response headers on a real download (nosniff / private / no-store) ---'
curl -s -i -b "$J/regional" "$BASE/api/files/object?key=$KKEY" | sed -n '1,12p' | grep -iE '^HTTP/|content-type|nosniff|cache-control|content-length'
echo '--- signed-url path (local driver returns a relative URL) ---'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/files/signed-url" --data-binary "{\"key\":\"$KEY\"}"
PSQL "select key, \"uploaderId\", scope, \"contentType\", size, coalesce(\"documentId\",'NULL') from file_objects order by key desc limit 3;"
echo '--- traversal and absolute-path keys ---'
for bad in '../etc/passwd' '..%2F..%2Fetc%2Fpasswd' 'u-USR-SUPERADMIN/x/y.pdf' '/app/etc/passwd' ''; do
  enc=$(printf '%s' "$bad" | sed 's|/|%2F|g')
  printf 'GET ?key=%-32s -> %s\n' "[$bad]" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/superadmin" "$BASE/api/files/object?key=$enc")"
  printf 'PUT ?key=%-32s -> %s\n' "[$bad]" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/superadmin" -H 'Content-Type: application/octet-stream' --data-binary 'x' -X PUT "$BASE/api/files/object?key=$enc")"
done
echo '--- a file written on disk inside the container (is it on the named volume?) ---'
docker exec apoorvasetu-audit-pg sh -c 'ls -lR "$UPLOAD_DIR" | head -12'
echo '--- oversize PUT against the raw body limit (25 MB) ---'
head -c 27000000 /dev/zero > "$J/big.bin"
printf 'PUT 27 MB -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/institute" -H 'Content-Type: application/octet-stream' --data-binary "@$J/big.bin" -X PUT "$BASE/api/files/object?key=$KKEY")"
echo '--- empty body ---'
printf 'PUT 0 bytes -> %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/institute" -H 'Content-Type: application/octet-stream' --data-binary '' -X PUT "$BASE/api/files/object?key=$KKEY")"
PSQL "select count(*) from file_objects;" | sed -s "s/^/file_objects now (was $N0): /"

hdr "P-25b(round4) the regulated verify endpoint inside the officer's own region"
echo '-- create a Northern Pending document (superadmin, generic POST) --'
curl -s -o /dev/null -w 'POST /api/documents DOC-PROBE-25 (Northern, Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/documents" --data-binary @- <<EOF
{"id":"DOC-PROBE-25","title":"Probe fire NOC awaiting verification","category":"Fire Safety","instituteName":"XYZ College of Engg.","instituteId":"INST-102","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"Pending","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC"}
EOF
PSQL "select id, region, status, coalesce(\"verifiedBy\",'NULL') from document_items where id='DOC-PROBE-25';"
echo '-- (a) the Northern officer verifies it, TYPING A MACHINE NAME as the competent authority --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-25/verify" --data-binary '{"decision":"Verified","comments":"probe","competentAuthority":"Automated Verification System"}' | head -c 400
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by from document_items where id='DOC-PROBE-25';"
echo '-- (b) does the endpoint take the human identity from the session or from the body? send both --'
curl -s -o /dev/null -w 'POST /api/documents (DOC-PROBE-25B, Northern, Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary @- <<EOF
{"id":"DOC-PROBE-25B","title":"Probe fire NOC B","category":"Fire Safety","instituteName":"XYZ College of Engg.","instituteId":"INST-102","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"Pending","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC"}
EOF
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-25B/verify" --data-binary '{"decision":"Verified","comments":"probe","competentAuthority":"Member Secretary, AICTE","verifiedBy":"Dr. Somebody Else (Central RO)","userId":"USR-SUPERADMIN","role":"SUPER_ADMIN"}' | head -c 400
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by from document_items where id='DOC-PROBE-25B';"
echo '-- (c) the generic write API on an IN-REGION document: can the body set status + verifiedBy directly? --'
A0=$(PSQL "select count(*) from audit_logs;")
curl -s -o /dev/null -w 'PUT /api/documents/DOC-502 (Northern, in-region) with status=Expired verifiedBy=spoof -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-502" --data-binary @- <<EOF
{"id":"DOC-502","title":"Fire Safety NOC (Valid to 2028)","category":"Fire Safety","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2025-09-27","expiryDate":"2028-10-01","status":"Expired","fileSize":"2.1 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC","verifiedBy":"Dr. Impersonated (Central RO)","competentAuthority":"Automated Verification System","version":1}
EOF
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') as verified_by from document_items where id='DOC-502';"
echo "audit rows before=$A0 after=$(PSQL 'select count(*) from audit_logs;')"
echo '   (seed had DOC-502 Verified / verifiedBy "Dr. R. K. Sharma (Northern RO)" - restored below)'
echo '-- (d) same trick on an application row inside the region: stage + decision by generic PUT --'
curl -s -o /dev/null -w 'PUT /api/applications/12869 (Northern, in-region) stage=Final Approval status=Approved -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/applications/AICTE%2F2026%2F12869" --data-binary @- <<EOF
{"id":"AICTE/2026/12869","instituteId":"INST-108","instituteName":"GGSIPU Delhi","type":"Addition of Integrated Course","region":"Northern","state":"Delhi","stage":"Final Approval","status":"Approved","lastUpdated":"01 Nov 2026","appliedDate":"30 Sept 2026","category":"Engineering & Technology","intakeProposed":120,"programs":["Integrated B.Tech - M.Tech Biotech"],"contactEmail":"vc@ipu.ac.in","contactPhone":"+91 11 25302170","timeline":[],"documents":[],"remarks":"probe","stageEnteredAt":"2026-11-01","stageDueAt":"2026-11-11","version":1,"decision":{"at":"2026-11-01","by":"Dr. Impersonated","code":"APPROVED_FINAL","outcome":"Approved","competentAuthority":"Automated Approval Engine","note":"written through the generic API, no transition, no human check"}}
EOF
PSQL "select id, stage, status, version from applications where id='AICTE/2026/12869';"
PSQL "select case when new_state is null then 'no audit row for the generic write' else new_state end from (select coalesce(new_state,'') as new_state from audit_logs order by id desc limit 1) t;" 2>/dev/null
PSQL "select count(*) as audit_rows_now from audit_logs;"
echo '   ^ this is the L3-01 / L9 case: REGIONAL_OFFICER has no applications.approve permission'
echo '     (role_permissions above) yet the generic PUT wrote stage=Final Approval status=Approved.'

hdr "P-30(round4) what the assistant surface exposes with no key configured"
curl -s -w '\n-> %{http_code}\n' "$BASE/api/assistant/status"
curl -s -w '\n-> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/assistant/chat" --data-binary '{"message":"hello","history":[],"currentPath":"/dashboard","userRole":"SUPER_ADMIN"}' | head -c 300
echo '-- userRole is taken from the body in demo mode, from the session otherwise (authGuard.ts:159-162) --'
curl -s -o /dev/null -w 'chat with a spoofed userRole=REGIONAL_OFFICER -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/assistant/chat" --data-binary '{"message":"hi","history":[],"currentPath":"/dashboard","userRole":"SUPER_ADMIN"}'
echo '-- oversized chat body (MAX_BODY_BYTES = 64 KB) --'
node -e 'const fs=require("fs");fs.writeFileSync(process.argv[1],JSON.stringify({message:"x".repeat(200*1024),history:[],currentPath:"/"}))' "$J/chat.json"
curl -s -o /dev/null -w 'POST /api/assistant/chat with a 200 KB body -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary "@$J/chat.json" "$BASE/api/assistant/chat"
echo '-- SSE: does a write reach a live listener? --'
curl -s -N --max-time 4 -b "$J/superadmin" "$BASE/api/events" > "$J/sse.txt" &
SVPID=$!
sleep 1
curl -s -o /dev/null -X POST -b "$J/institute" -H 'Content-Type: application/json' --data-binary '{"action":"PROBE_SSE_TRIGGER","entityType":"System","entityId":"SSE-1","details":"probe","source":"ui"}' "$BASE/api/audit"
wait $SVPID 2>/dev/null
echo "events seen while listening: $(grep -c '^event:' "$J/sse.txt")"
sed -n '1,12p' "$J/sse.txt"

hdr "P-93(round4) restore every seeded row this pass touched"
curl -s -o /dev/null -w 'restore DOC-502 -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-502" --data-binary @- <<EOF
{"id":"DOC-502","title":"Fire Safety NOC (Valid to 2028)","category":"Fire Safety","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2025-09-27","expiryDate":"2028-10-01","status":"Verified","fileSize":"2.1 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC","verifiedBy":"Dr. R. K. Sharma (Northern RO)"}
EOF
curl -s -o /dev/null -w 'restore application 12869 -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' -X PUT "$BASE/api/applications/AICTE%2F2026%2F12869" --data-binary @- <<EOF
{"id":"AICTE/2026/12869","instituteId":"INST-108","instituteName":"GGSIPU Delhi","type":"Addition of Integrated Course","region":"Northern","state":"Delhi","stage":"Scrutiny / Re-scrutiny","status":"Returned","lastUpdated":"29 Oct 2026","appliedDate":"30 Sept 2026","category":"Engineering & Technology","intakeProposed":120,"programs":["Integrated B.Tech - M.Tech Biotech"],"contactEmail":"vc@ipu.ac.in","contactPhone":"+91 11 25302170","timeline":[{"date":"30 Sept 2026","stage":"Submitted","status":"completed","enteredAt":"2026-09-30"},{"date":"12 Oct 2026","notes":"Returned (DOC_MISSING): the state NOC copy is illegible.","stage":"Scrutiny / Re-scrutiny","status":"current","officer":"Dr. R. K. Sharma (RO)","enteredAt":"2026-10-12"},{"date":"Pending","stage":"Approval (Subject to Undertaking)","status":"pending"},{"date":"Pending","stage":"Final Approval","status":"pending"}],"documents":[{"name":"State Govt NOC","type":"PDF","status":"Pending","uploadedOn":"02 Oct 2026"}],"remarks":"Returned for correction (DOC_MISSING): the state NOC copy is illegible.","stageEnteredAt":"2026-10-12","stageDueAt":"2026-11-11","deficiencies":[{"code":"DOC_MISSING","note":"The State Government NOC uploaded on the portal is illegible. Upload a signed, self-attested copy.","stage":"Scrutiny / Re-scrutiny","raisedAt":"2026-10-29","raisedBy":"Dr. R. K. Sharma (RO)"}],"returns":[{"at":"2026-10-29","by":"Dr. R. K. Sharma (RO)","code":"DOC_MISSING","note":"The State Government NOC uploaded on the portal is illegible. Upload a signed, self-attested copy.","toStage":"Scrutiny / Re-scrutiny","fromStage":"Scrutiny / Re-scrutiny"}],"version":1}
EOF
echo '-- final state of everything this pass wrote or changed --'
PSQL "select id, region, status, coalesce(\"verifiedBy\",'NULL') from document_items where id in ('DOC-501','DOC-502','DOC-506','DOC-508') order by id;"
PSQL "select id, stage, status, version from applications where id in ('AICTE/2026/12869','AICTE/2026/12875') order by id;"
PSQL "select id, status, \"reportSubmitted\" from evc_visits where id in ('EVC-8801','EVC-8805') order by id;"
PSQL "select 'audit='||count(*)||' forged(cron|system)='||(select count(*) from audit_logs where source in ('cron','system')) from audit_logs;"
PSQL "select 'live sessions='||count(*) filter (where \"revokedAt\" is null)||' of '||count(*) from sessions;"
PSQL "select 'probe users='||count(*) from users where email like 'probe.%';"
PSQL "select 'probe alerts='||count(*) from system_alerts where id like 'ALRT-PROBE%';"
PSQL "select 'file_objects='||count(*) from file_objects;"
rm -rf "$J"
echo "ROUND 4 COMPLETE $(date -u +%FT%TZ)"
