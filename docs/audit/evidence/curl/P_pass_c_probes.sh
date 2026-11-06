#!/usr/bin/env bash
# Pass C — Postgres-overlay probes against the running audit container.
# Target: http://localhost:8081  (image apoorvasetu:audit-pg, VITE_DATA_MODE=postgres)
#         db container apoorvasetu-db-1 (postgres:17-alpine, volume apoorvasetu_apoorvasetu_postgres)
# Synthetic demo data only. Nothing here touches the :8080 demo stack or any external service.
# Application ids contain '/' and are percent-encoded exactly as the client does
# (src/services/repositories/postgresRepository.ts:286 uses encodeURIComponent).
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d)
A75='AICTE%2F2026%2F12875'
A69='AICTE%2F2026%2F12869'
A69raw='AICTE/2026/12869'
A75raw='AICTE/2026/12875'
A72raw='AICTE/2026/12872'
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -i -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }

hdr "P-01 unauthenticated surface"
for p in /api/snapshot /api/audit /api/admin/users /api/config /api/events /api/health /api/ready; do
  printf 'GET  %-19s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$p")"
done
for p in /api/alerts /api/documents /api/applications/$A75/transitions; do
  printf 'POST %-19s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "$BASE$p")"
done
echo -n 'wrong password    -> '; curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"superadmin@apoorvasetu.demo","password":"wrong"}' "$BASE/api/auth/login"; echo

hdr "P-02 login as SUPER_ADMIN: raw headers, Set-Cookie, session shape"
login superadmin@apoorvasetu.demo "$J/sa" | sed -n '1,20p'
echo '--- /api/auth/session ---'
curl -s -b "$J/sa" "$BASE/api/auth/session"; echo
PSQL "select count(*) as sessions, count(distinct \"tokenHash\") as distinct_tokenHash, min(left(\"tokenHash\",10)) as sample_prefix from sessions;"
PSQL "select id, \"userId\", \"expiresAt\", \"revokedAt\", coalesce(ip,'NULL') as ip, left(coalesce(\"userAgent\",'NULL'),24) as ua from sessions order by \"createdAt\" desc limit 3;"

hdr "P-02b cookie flags for every persona"
for e in superadmin aicteadmin regional institute evc; do
  printf '%-11s ' "$e"; login $e@apoorvasetu.demo "$J/$e" | grep -i '^set-cookie'
done

hdr "P-03 snapshot scoping: what each persona is handed"
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e" >/dev/null; done
for e in superadmin regional institute evc; do
  printf '%-11s ' "$e"
  curl -s -b "$J/$e" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const d=j.data||j;const a=d.applications||[];const i=d.institutes||[];const insts=new Set(a.map(x=>x.instituteId));console.log("apps="+a.length,"distinctInstituteIds="+insts.size,"institutes="+i.length,"evc="+(d.evcVisits||[]).length,"notifs="+(d.notifications||[]).length,"alerts="+(d.alerts||[]).length,"audit="+(d.auditLogs||[]).length,"users="+((d.users||[]).length),"bytes="+s.length);});'
done

hdr "P-19 audit rows handed to the client, and text-vs-time ordering"
curl -s -b "$J/sa" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const d=j.data||j;const a=d.auditLogs||[];console.log("auditRowsReturned="+a.length);console.log("first="+a.slice(0,3).map(x=>x.timestamp).join(" | "));console.log("last="+a.slice(-3).map(x=>x.timestamp).join(" | "));});'
echo "db rows: $(PSQL 'select count(*) from audit_logs;')"
PSQL "select timestamp from audit_logs order by timestamp desc limit 4;"
PSQL "select timestamp from audit_logs order by timestamp asc limit 4;"
echo "-- text ordering proof (same table, cast to timestamp when parseable) --"
PSQL "select min(timestamp), max(timestamp) from audit_logs;"

hdr "P-04 transition replay — the D-08 double-audit question"
echo "case before : $(PSQL "select id||'  stage='||stage||'  status='||status||'  v='||version from applications where id='$A75raw';")"
echo "audit rows for the case: $(PSQL "select count(*) from audit_logs where \"entityId\"='$A75raw';")"
echo '-- (a) same expectedVersion:1 sent twice --'
echo "first  -> HTTP $(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" -H 'Content-Type: application/json' -d '{"action":"FORWARD","toStage":"Expert Visit Committee (EVC)","expectedVersion":1,"note":"audit probe P-04a"}' "$BASE/api/applications/$A75/transitions")"
echo -n "replay -> "; curl -s -w '\n' -b "$J/aicteadmin" -H 'Content-Type: application/json' -d '{"action":"FORWARD","toStage":"Expert Visit Committee (EVC)","expectedVersion":1,"note":"audit probe P-04a replay"}' "$BASE/api/applications/$A75/transitions" | tail -c 260
echo "case now  : $(PSQL "select id||'  stage='||stage||'  status='||status||'  v='||version from applications where id='$A75raw';")"
echo "audit rows now: $(PSQL "select count(*) from audit_logs where \"entityId\"='$A75raw';")"
echo '-- (b) expectedVersion omitted, two successive legal actions (a retry pattern) --'
echo "case before : $(PSQL "select id||'  stage='||stage||'  v='||version from applications where id='$A69raw';")"
n0=$(PSQL "select count(*) from audit_logs;")
echo "first  -> HTTP $(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" -H 'Content-Type: application/json' -d '{"action":"RETURN","reasonCode":"DOC_INCOMPLETE","note":"audit probe P-04b first"}' "$BASE/api/applications/$A69/transitions")"
echo "second -> HTTP $(curl -s -o /dev/null -w '%{http_code}' -b "$J/aicteadmin" -H 'Content-Type: application/json' -d '{"action":"RESUBMIT","note":"audit probe P-04b second"}' "$BASE/api/applications/$A69/transitions")"
echo "case after  : $(PSQL "select id||'  stage='||stage||'  status='||status||'  v='||version from applications where id='$A69raw';")"
echo "audit rows added by the two no-version calls: $(( $(PSQL 'select count(*) from audit_logs;') - n0 ))"
PSQL "select id||' | '||action||' | '||\"entityId\"||' | '||\"userId\"||' | '||\"userRole\"||' | '||\"ipAddress\"||' | '||coalesce(source,'-') from audit_logs where details like '%audit probe P-04%' order by id;"

hdr "P-05 field-level authority on the generic write API (L4-03 / L3-01)"
echo '-- INSTITUTION_ADMIN creates a national alert (its spec has permissions: []) --'
curl -s -w '\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/alerts" --data-binary @- <<'EOF'
{"id":"ALRT-PROBE-05","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"critical","dedupeKey":"audit-probe-05","createdAt":"2026-11-01T00:00:00.000Z","status":"Open","title":"Probe alert written by an institution","description":"region and instituteId are null, so this is a national alert.","region":null,"instituteId":null,"targetRoles":["SUPER_ADMIN"]}
EOF
PSQL "select id, coalesce(region,'NULL') region, coalesce(\"instituteId\",'NULL') inst, severity, \"targetRoles\" from system_alerts where id='ALRT-PROBE-05';"
echo '-- EVC_MEMBER creates a SUPER_ADMIN-targeted notification (spec permissions: []) --'
curl -s -w '\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/notifications" --data-binary @- <<'EOF'
{"id":"NOTIF-PROBE-05","title":"Issued by an EVC member","description":"A committee member wrote a system notification addressed to Super Administrator.","category":"system","timestamp":"2026-11-01T00:00:00.000Z","read":false,"priority":"high","targetRole":"SUPER_ADMIN","targetRegion":null}
EOF
PSQL "select id, title, coalesce(\"targetRole\",'NULL') tr from notification_items where id='NOTIF-PROBE-05';"
echo '-- can the same INSTITUTION_ADMIN overwrite someone else''s application row wholesale? --'
curl -s -o /dev/null -w 'PUT /api/applications/AICTE%2F2026%2F12870 (INST-107 owner is another institute) -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/applications/$A75" --data-binary @- <<EOF
{"id":"$A75raw","instituteId":"INST-102","instituteName":"Rewritten by probe","type":"New Proposal of College","region":"Western","state":"Maharashtra","stage":"Final Approval","status":"Approved","lastUpdated":"01 Nov 2026","appliedDate":"01 Nov 2026","category":"Engineering & Technology","intakeProposed":1000,"programs":["B Tech Fraud"],"contactEmail":"a@b.c","contactPhone":"+91 90000 00000","timeline":[],"documents":[],"version":99}
EOF
PSQL "select id, stage, status, version, \"instituteName\" from applications where id='$A75raw';"

hdr "P-06 admin user created without a password, then signed in with the demo constant (L4-02)"
curl -s -w '\n' -b "$J/sa" -H 'Content-Type: application/json' -X POST "$BASE/api/admin/users" --data-binary @- <<'EOF'
{"name":"Probe Zero Password","email":"probe.nopass@apoorvasetu.demo","role":"AICTE_ADMIN","roleTitle":"Audit probe","designation":"Probe","region":"Northern","phone":"+91 90000 00000"}
EOF
echo '-- sign in with the credential printed on the login screen --'
login probe.nopass@apoorvasetu.demo "$J/probe06" | sed -n '1,2p'
PSQL "select email, role, left(\"passwordHash\",26) as hash_prefix from users where email='probe.nopass@apoorvasetu.demo';"
echo '-- every seeded account shares that same hash (per-user salt check) --'
PSQL "select count(distinct \"passwordHash\") as distinct_hashes, count(*) as users from users;"

hdr "P-07 password reset does not revoke live sessions (L4-09)"
UID06=$(PSQL "select id from users where email='probe.nopass@apoorvasetu.demo';")
echo "probe user id: $UID06"
echo "sessions for the probe user before reset: $(PSQL "select count(*) from sessions s where s.\"userId\"='$UID06' and s.\"revokedAt\" is null;")"
echo 'Set-Cookie line for the probe user:'; login probe.nopass@apoorvasetu.demo /dev/null | grep -i '^set-cookie'
login probe.nopass@apoorvasetu.demo "$J/c06" >/dev/null
SID=$(awk -F'\t' '$6=="apoorvasetu_sid"{print $7}' "$J/c06" | head -1)
echo "cookie held: ${SID:0:14}..."
echo "-- admin resets the password --"
curl -s -w '\n' -b "$J/sa" -H 'Content-Type: application/json' -X PUT "$BASE/api/admin/users/$UID06" --data-binary @- <<'EOF'
{"password":"Changed@2026"}
EOF
echo "-- replay the OLD session cookie --"
curl -s -o /dev/null -w 'old cookie -> GET /api/auth/session = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/auth/session"
curl -s -o /dev/null -w 'old cookie -> GET /api/snapshot      = %{http_code}\n' -H "Cookie: apoorvasetu_sid=$SID" "$BASE/api/snapshot"
echo "-- old password now refused? --"
curl -s -o /dev/null -w 'old password login -> %{http_code}\n' -H 'Content-Type: application/json' -d "{\"email\":\"probe.nopass@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"
curl -s -o /dev/null -w 'new password login -> %{http_code}\n' -H 'Content-Type: application/json' -d '{"email":"probe.nopass@apoorvasetu.demo","password":"Changed@2026"}' "$BASE/api/auth/login"
PSQL "select count(*) as live_sessions_after_reset from sessions s where s.\"userId\"='$UID06' and s.\"revokedAt\" is null;"

hdr "P-09 forged machine provenance on POST /api/audit (L3-01 / L4-03)"
curl -s -w '\n' -b "$J/institute" -H 'Content-Type: application/json' -X POST "$BASE/api/audit" --data-binary @- <<EOF
{"action":"APPLICATION_APPROVED","entityType":"Application","entityId":"$A72raw","details":"Written by an INSTITUTION_ADMIN but labelled source=cron","previousState":{"stage":"Final Approval"},"newState":{"stage":"Final Approval","status":"Approved"},"source":"cron"}
EOF
PSQL "select id, action, \"entityId\", \"userId\", \"userRole\", coalesce(source,'-') src, \"ipAddress\" from audit_logs order by id desc limit 3;"

hdr "P-12 escalation raisedBy is caller-supplied (L4-03)"
curl -s -w '\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-12","applicationId":"$A75raw","instituteName":"Audit Probe Institute","region":"Northern","raisedBy":"Automated SLA Monitor","raisedDate":"01 Nov 2026","urgency":"Critical","reason":"Probe: the caller typed a machine identity into raisedBy.","status":"Open","level":3,"slaBreachDays":40}
EOF
PSQL "select id, \"raisedBy\", region, status, \"slaBreachDays\" from escalation_items where id='ESCL-PROBE-12';"
PSQL "select id, \"userId\", \"userName\", \"userRole\", \"ipAddress\" from audit_logs where \"entityId\"='ESCL-PROBE-12';"

hdr "P-17 REGIONAL_OFFICER overwriting EVC evidence (D-18 item 3, runtime-suspected until now)"
PSQL "select id, status, \"reportSubmitted\", \"evidenceFiles\", \"assignedCommittee\" from evc_visits where id='EVC-8805';"
PSQL "select permissions from role_permissions where role='REGIONAL_OFFICER';"
curl -s -w '\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/evc-visits/EVC-8805" --data-binary @- <<'EOF'
{"id":"EVC-8805","instituteId":"INST-101","instituteName":"ABC Institute of Tech","stateRegion":"Uttar Pradesh","region":"Northern","date":"2026-11-20","displayDate":{"day":"20","month":"Nov"},"status":"Completed","assignedCommittee":"Committee N-1 (probe)","committeeMembers":["Dr. Probe"],"mode":"Physical","reportSubmitted":true,"evidenceFiles":[]}
EOF
PSQL "select id, status, \"reportSubmitted\", \"evidenceFiles\", \"assignedCommittee\" from evc_visits where id='EVC-8805';"
echo '-- out-of-region control: same officer PUTting EVC-8801 (Eastern) --'
curl -s -o /dev/null -w 'PUT EVC-8801 as REGIONAL_OFFICER -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/evc-visits/EVC-8801" --data-binary @- <<'EOF'
{"id":"EVC-8801","instituteId":"INST-106","instituteName":"Probe","stateRegion":"x","region":"Eastern","date":"2026-11-20","displayDate":{"day":"20","month":"Nov"},"status":"Cancelled","assignedCommittee":"c","committeeMembers":[],"mode":"Physical","reportSubmitted":true,"evidenceFiles":[]}
EOF
PSQL "select id, status, \"reportSubmitted\" from evc_visits where id='EVC-8801';"

hdr "P-18 unparsable expiryDate stored on a document row"
curl -s -w '\n' -b "$J/sa" -H 'Content-Type: application/json' -X POST "$BASE/api/documents" --data-binary @- <<'EOF'
{"id":"DOC-PROBE-18","title":"Expiry that cannot be parsed","category":"Land & Building","instituteName":"Audit Probe Institute","instituteId":"INST-101","region":"Northern","uploadDate":"01 Nov 2026","expiryDate":"not-a-date","status":"Verified","fileSize":"1.2 MB","fileType":"PDF"}
EOF
PSQL "select id, \"expiryDate\", status, coalesce(\"expiryTier\",'-') tier from document_items where id='DOC-PROBE-18';"
echo '-- the client-side guard the UI uses would have rejected it (AppContext.uploadDocument parseDate) --'
node --input-type=module -e 'const p=(s)=>{const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString()};console.log("parseDate(\"not-a-date\") =",p("not-a-date"));'

hdr "P-15 response headers on :8081 (SPA document + API) and CORS"
curl -s -i "$BASE/" | sed -n '1,22p'
echo '----- /api/snapshot headers -----'
curl -s -i -b "$J/sa" "$BASE/api/snapshot" | sed -n '1,16p'
echo '----- CORS preflight from a foreign origin -----'
curl -s -i -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' "$BASE/api/alerts" | sed -n '1,14p'
echo '----- credentialed cross-site-style POST (Origin: https://evil.example) -----'
curl -s -w '\n' -o /dev/null -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -b "$J/sa" -d '{}' "$BASE/api/alerts"
curl -s -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -b "$J/sa" --data-binary @- <<'EOF' | head -c 240
{"id":"ALRT-PROBE-15","rule":"audit.probe","entityType":"Application","entityId":"AICTE/2026/12870","tier":"L1","severity":"low","dedupeKey":"audit-probe-15","createdAt":"2026-11-01T00:00:00.000Z","status":"Open","title":"Cross-origin probe","description":"sent with an evil.example Origin header"}
EOF
echo
echo '----- oversized body guard -----'
node -e 'const fs=require("fs");fs.writeFileSync("/tmp/big.json",JSON.stringify({id:"ALRT-BIG",rule:"x",entityType:"Application",entityId:"y",tier:"L1",severity:"low",dedupeKey:"k",createdAt:"2026",status:"Open",title:"z".repeat(3*1024*1024),description:"probe"}))'
ls -l /tmp/big.json | awk '{print "body bytes:",$5}'
curl -s -o /dev/null -w 'POST /api/alerts with that body -> %{http_code}\n' -b "$J/sa" -H 'Content-Type: application/json' --data-binary @/tmp/big.json "$BASE/api/alerts"

hdr "P-14 login throttling: bucket key, Retry-After, cost per attempt, memory delta"
echo '-- cost of a single wrong-password attempt (server does full scrypt even for unknown email) --'
for i in 1 2 3; do curl -s -o /dev/null -w 'attempt %{time_total}s http=%{http_code}\n' -H 'Content-Type: application/json' -d '{"email":"superadmin@apoorvasetu.demo","password":"Nope9"}' "$BASE/api/auth/login"; done
docker stats --no-stream --format '{{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' | grep apoorvasetu
echo '-- 40 failures, each a DISTINCT unknown email (credential-stuffing shape) --'
codes=""; t0=$(date +%s%N)
for i in $(seq 1 40); do codes="$codes$(curl -s -o /dev/null -w '%{http_code} ' -H 'Content-Type: application/json' -d "{\"email\":\"nobodyX$i@x.example\",\"password\":\"BadPass123\"}" "$BASE/api/auth/login")"; done
t1=$(date +%s%N)
echo "distinct-email result: $(echo $codes | tr ' ' '\n' | grep -v '^$' | sort | uniq -c | tr '\n' ' ')"
echo "wall: $(( (t1-t0)/1000000 ))ms for 40 requests (avg $(( (t1-t0)/1000000/40 ))ms each)"
echo '-- same 40 emails reused: per-email buckets now hold 2 each --'
codes=""
for i in $(seq 1 40); do codes="$codes$(curl -s -o /dev/null -w '%{http_code} ' -H 'Content-Type: application/json' -d "{\"email\":\"nobodyX$i@x.example\",\"password\":\"BadPass123\"}" "$BASE/api/auth/login")"; done
echo "second pass over the same 40: $(echo $codes | tr ' ' '\n' | grep -v '^$' | sort | uniq -c | tr '\n' ' ')"
echo '-- one account hammered: expect the cap to bite at MAX_ATTEMPTS --'
for i in $(seq 1 11); do printf 'try%s=%s ' "$i" "$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -d "{\"email\":\"superadmin@apoorvasetu.demo\",\"password\":\"Bad$i\"}" "$BASE/api/auth/login")"; done
echo
echo '-- headers on the capped attempt --'
curl -s -i -H 'Content-Type: application/json' -d '{"email":"superadmin@apoorvasetu.demo","password":"Bad12"}' "$BASE/api/auth/login" | grep -iE '^HTTP/|^retry-after'
curl -s -o /dev/null -w 'CORRECT password while the bucket is capped -> %{http_code}\n' -H 'Content-Type: application/json' -d "{\"email\":\"superadmin@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"
docker stats --no-stream --format '{{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' | grep apoorvasetu
echo '-- are the 80 unknown-email failures visible in the audit trail at all? --'
PSQL "select action, count(*) from audit_logs group by 1 order by 2 desc;"

hdr "P-20 SSE smoke"
curl -s -N --max-time 3 -b "$J/sa" "$BASE/api/events" | head -c 240; echo

hdr "P-22 regulated verification endpoints still demand a human (invariant check)"
curl -s -w '\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-18/verify" --data-binary @- <<'EOF'
{"decision":"Verified","comments":"probe verify","competentAuthority":"Automated System"}
EOF
PSQL "select id, status, \"verifiedBy\" from document_items where id='DOC-PROBE-18';" 2>/dev/null

hdr "P-90 what Pass C wrote (cleanup ledger)"
PSQL "select 'alert' k, id from system_alerts where id in ('ALRT-PROBE-05','ALRT-PROBE-15') union all select 'notif', id from notification_items where id='NOTIF-PROBE-05' union all select 'escal', id from escalation_items where id='ESCL-PROBE-12' union all select 'doc', id from document_items where id='DOC-PROBE-18' union all select 'user', id from users where email='probe.nopass@apoorvasetu.demo';"
echo '-- seeded rows whose values Pass C changed (reverse by re-seed / down -v) --'
PSQL "select 'app '||id||' -> stage='||stage||' status='||status||' v='||version from applications where id in ('$A75raw','$A69raw') order by id;"
PSQL "select 'evc  '||id||' -> status='||status||' reportSubmitted='||\"reportSubmitted\"::text||' committee='||\"assignedCommittee\" from evc_visits where id in ('EVC-8805','EVC-8801') order by id;"
PSQL "select 'audit_rows_total='||count(*) from audit_logs;"
PSQL "select 'sessions_total='||count(*)||' live='||count(*) filter (where \"revokedAt\" is null) from sessions;"
rm -rf "$J" /tmp/big.json
echo "PROBE RUN COMPLETE $(date -u +%FT%TZ)"
