#!/usr/bin/env bash
# Pass C, round 5 — the one-way-door question that rounds 3-4 opened.
# From the source, the generic write API's guards are asymmetric:
#   applications  data.ts:198-204  assertUnchanged(stage,status,decision,timeline) vs the DB row  -> two-way lock
#   documents     data.ts:276-284  blocks only an INCOMING status of "Verified"                   -> one-way door
#   compliance    data.ts:237-245  blocks only an INCOMING status of "Verified"                   -> one-way door
#   undertakings  data.ts:314-322  blocks only INCOMING "Verified" / "Rejected"                   -> one-way door
#   evcVisits     data.ts:207-224  no guard at all, full-row update                               -> open door
#   alerts/notifications/escalations  permissions: [] (data.ts:+22/+53/+76)                       -> any signed-in user
# This run turns each of those five lines into a runtime result.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d)
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e"; done

hdr "P-31 INSTITUTION_ADMIN on its OWN verified document (documents.upload passes the spec check)"
echo "seed/now: $(PSQL "select id||' '||status||' verifiedBy='||coalesce(\"verifiedBy\",'NULL') from document_items where id='DOC-507';")"
A0=$(PSQL "select count(*) from audit_logs;")
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-507" --data-binary @- <<EOF
{"id":"DOC-507","title":"Registered Land Lease Deed (30-year tenure)","category":"Land & Building","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2025-09-27","expiryDate":"2026-11-08","status":"Pending","fileSize":"6.1 MB","fileType":"PDF","documentTypeCode":"LAND_LEASE_DEED","verifiedBy":"Dr. Impersonated (Central RO)","competentAuthority":"Automated Verification System","verifiedAt":"2020-01-01T00:00:00.000Z"}
EOF
echo "after : $(PSQL "select id||' '||status||' verifiedBy='||coalesce(\"verifiedBy\",'NULL')||' verifiedAt='||coalesce(\"verifiedAt\"::text,'NULL') from document_items where id='DOC-507';")"
echo "audit rows $A0 -> $(PSQL 'select count(*) from audit_logs;')"
echo '   ^ the applicant moved its own verified document back to Pending; the human attribution survived,'
echo '     the verification outcome did not, and nothing was recorded.'
echo '-- and the reverse direction is blocked (the guard only points one way) --'
curl -s -w '\n-> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-507" --data-binary @- <<EOF | head -c 200
{"id":"DOC-507","title":"Registered Land Lease Deed (30-year tenure)","category":"Land & Building","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","uploadDate":"2025-09-27","expiryDate":"2026-11-08","status":"Verified","fileSize":"6.1 MB","fileType":"PDF","documentTypeCode":"LAND_LEASE_DEED"}
EOF
echo '-- out-of-scope control: the same institution touching INST-102''s document --'
curl -s -o /dev/null -w 'PUT /api/documents/DOC-503 (Western, INST-102) as INST-101 admin -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-503" --data-binary @- <<EOF
{"id":"DOC-503","title":"Building Stability Certificate from Govt Structural Engineer","category":"Land & Building","instituteName":"XYZ College of Engg.","instituteId":"INST-102","region":"Western","uploadDate":"2026-01-05","expiryDate":"2031-03-20","status":"Expired","fileSize":"5.8 MB","fileType":"PDF","documentTypeCode":"BUILDING_STABILITY"}
EOF

hdr "P-32 compliance and undertaking one-way doors"
echo "CMP-104: $(PSQL "select status||' verifiedBy='||coalesce(\"verifiedBy\",'NULL') from compliance_records where id='CMP-104';")"
curl -s -o /dev/null -w 'PUT /api/compliance/CMP-104 status Verified -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/compliance/CMP-104" --data-binary @- <<EOF
{"id":"CMP-104","title":"Documents Expired","category":"Expired Documents","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","status":"Verified","dueDate":"2026-09-17","urgency":"high"}
EOF
echo "CMP-101: $(PSQL "select status||' verifiedBy='||coalesce(\"verifiedBy\",'NULL') from compliance_records where id='CMP-101';")"
curl -s -o /dev/null -w 'PUT /api/compliance/CMP-101 (Northern, Pending -> Submitted) -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/compliance/CMP-101" --data-binary @- <<EOF
{"id":"CMP-101","title":"Lease Documents (expiring < 3 months)","category":"Lease Documents","instituteName":"ABC Institute of Tech","instituteId":"INST-101","region":"Northern","status":"Submitted","dueDate":"2026-11-08","urgency":"high"}
EOF
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') from compliance_records where id in ('CMP-101','CMP-104') order by id;"
echo '-- undertakings: can a Submitted one be pushed back to Pending (un-submitted) by the institution? --'
echo "UND-2602 (Eastern, owned by Techno Institute): $(PSQL "select status||' submittedBy='||coalesce(\"submittedBy\",'NULL') from undertakings where id='UND-2602';")"
curl -s -o /dev/null -w 'PUT /api/undertakings/UND-2602 status Pending as INSTITUTION_ADMIN(Northern user, Eastern record) -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/undertakings/UND-2602" --data-binary @- <<EOF
{"id":"UND-2602","applicationId":"AICTE/2026/12873","instituteId":"INST-104","instituteName":"Techno Institute","region":"Eastern","conditionCode":"UND_FACULTY_RETENTION","title":"Faculty retention undertaking","dueDate":"2026-11-05","evidenceDocumentIds":[],"status":"Pending","escalationLevel":0}
EOF
echo '   (institute user is INST-101/Northern, so a 403 here means scope held; a 200 means it did not)'

hdr "P-33 the EVC visit door is open on both sides (no guard, full-row update)"
echo "EVC-8805 now: $(PSQL "select status||' reportSubmitted='||\"reportSubmitted\"::text from evc_visits where id='EVC-8805';")"
echo "REGIONAL_OFFICER permissions: $(PSQL "select array_to_string(permissions,', ') from role_permissions where role='REGIONAL_OFFICER';" | grep -o 'evc[a-z.]*' | tr '\n' ' ')"
echo '   ^ note evc.report.submit is ABSENT - the spec check is any-of [evc.schedule, evc.report.submit] and the officer holds evc.schedule.'
A1=$(PSQL "select count(*) from audit_logs;")
curl -s -o /dev/null -w 'PUT /api/evc-visits/EVC-8803 (Central, out of region) -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/evc-visits/EVC-8803" --data-binary @- <<EOF
{"id":"EVC-8803","applicationId":"AICTE/2026/12872","instituteId":"INST-105","instituteName":"Sunrise College","stateRegion":"Madhya Pradesh (Central Region)","region":"Central","date":"2026-09-07","displayDate":{"day":"07","month":"Sep"},"status":"Completed","assignedCommittee":"x","committeeMembers":[],"mode":"Physical","reportSubmitted":true}
EOF
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/evc-visits/EVC-8805" --data-binary @- <<EOF | head -c 260
{"id":"EVC-8805","applicationId":"AICTE/2026/12876","instituteId":"INST-101","instituteName":"ABC Institute of Tech","stateRegion":"Uttar Pradesh (Northern Region)","region":"Northern","date":"2026-11-07","displayDate":{"day":"07","month":"Nov"},"status":"Scheduled","assignedCommittee":"Committee North-D (Prof. S. Banerjee, Dr. O. P. Singh)","committeeMembers":["Prof. S. Banerjee (IIT Roorkee)","Dr. O. P. Singh (KNIT Sultanpur)"],"mode":"Physical","scheduledAt":"2026-11-07","reportDueAt":"2026-11-14","reportSubmitted":false,"evidenceFiles":[]}
EOF
echo "EVC-8805 after the restore attempt: $(PSQL "select status||' reportSubmitted='||\"reportSubmitted\"::text||' committee='||\"assignedCommittee\" from evc_visits where id='EVC-8805';")"
echo "audit rows $A1 -> $(PSQL 'select count(*) from audit_logs;')"
echo '   ^ the same endpoint that let an officer file a committee report is now used to un-file one.'

hdr "P-34 escalation dedupeKey: can a caller pre-poison the key a real escalation would use?"
K="AICTE/2026/12876|SLA_BREACH"
A2=$(PSQL "select count(*) from escalation_items;")
curl -s -o /dev/null -w 'POST /api/escalations with dedupeKey=<case>|SLA_BREACH (EVC member) -> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' --data-binary @- "$BASE/api/escalations" <<EOF
{"id":"ESCL-PROBE-34","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Institution","raisedDate":"01 Nov 2026","urgency":"Low","reason":"probe: a placeholder escalation squatting on the SLA key","status":"Open","level":1,"slaBreachDays":1,"dedupeKey":"$K"}
EOF
echo '-- now the "real" escalation for the same case+rule arrives: does it create a row or silently merge? --'
curl -s -w '\n-> %{http_code}\n' -b "$J/aicteadmin" -H 'Content-Type: application/json' --data-binary @- "$BASE/api/escalations" <<EOF | head -c 320
{"id":"ESCL-PROBE-34B","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Amit Sharma","raisedDate":"01 Nov 2026","urgency":"Critical","reason":"the genuine SLA breach","status":"Open","level":3,"slaBreachDays":40,"dedupeKey":"$K"}
EOF
echo "escalation rows $A2 -> $(PSQL 'select count(*) from escalation_items;')  (34B inserted? $(PSQL "select count(*) from escalation_items where id='ESCL-PROBE-34B';"))"
PSQL "select id, urgency, level, \"slaBreachDays\", \"raisedBy\" from escalation_items where applicationId='AICTE/2026/12876';"
echo '   ^ if only the placeholder exists, the genuine critical escalation was swallowed by a row the'
echo '     lowest-privileged persona in the system was allowed to write.'

hdr "P-35 notifications: who may mark whom's notification read, and rewrite it"
PSQL "select id, coalesce(\"targetRole\",'NULL') as target_role, read, title from notification_items order by id limit 7;"
curl -s -o /dev/null -w 'EVC member PUT /api/notifications/NOTIF-3 (targetRole NULL, application category) -> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X PUT "$BASE/api/notifications/NOTIF-3" --data-binary '{"id":"NOTIF-3","title":"Techno Institute Undertaking Overdue","description":"Rewritten by an EVC member through the generic API.","category":"application","timestamp":"3 hours ago","read":true,"priority":"low","link":"/applications"}'
PSQL "select id, title, read, priority from notification_items where id='NOTIF-3';"
echo '-- and does the rewrite reach the institution that was expecting it? --'
curl -s -b "$J/institute" "$BASE/api/snapshot" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const n=(JSON.parse(s).notifications||[]).find(x=>x.id==="NOTIF-3");console.log("institute sees NOTIF-3:",n?JSON.stringify({title:n.title,read:n.read,priority:n.priority}).slice(0,160):"no");});'

hdr "P-36 where did the machine-sounding competentAuthority go? (DOC-PROBE-25 was verified in round 4)"
PSQL "select id, action, \"userRole\", coalesce(source,'-') as src from audit_logs where \"entityId\"='DOC-PROBE-25' order by id;"
PSQL "select coalesce(details,'') from audit_logs where \"entityId\"='DOC-PROBE-25' order by id desc limit 1;"
PSQL "select coalesce(new_state,'') from audit_logs where \"entityId\"='DOC-PROBE-25' order by id desc limit 1;"
echo '-- the verifiedBy the server stamped: --'
PSQL "select \"verifiedBy\", coalesce(\"verifiedAt\"::text,'NULL') from document_items where id='DOC-PROBE-25';"
echo '-- does the verify endpoint accept an EMPTY / machine-shaped competentAuthority, or a missing one? --'
curl -s -o /dev/null -w 'POST /api/documents (DOC-PROBE-36, Northern, Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary @- "$BASE/api/documents" <<EOF
{"id":"DOC-PROBE-36","title":"Probe fire NOC C","category":"Fire Safety","instituteName":"XYZ College of Engg.","instituteId":"INST-102","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"Pending","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC"}
EOF
curl -s -w '\n  no competentAuthority at all -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-36/verify" --data-binary '{"decision":"Verified","comments":"probe"}' | head -c 240
curl -s -o /dev/null -w 'POST /api/documents (DOC-PROBE-36B, Northern, Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary @- "$BASE/api/documents" <<EOF
{"id":"DOC-PROBE-36B","title":"Probe fire NOC D","category":"Fire Safety","instituteName":"XYZ College of Engg.","instituteId":"INST-102","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"Pending","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC"}
EOF
curl -s -w '\n  a Reject decision -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-36B/verify" --data-binary '{"decision":"Rejected","comments":"probe reject","competentAuthority":"Automated Rejection Pipeline"}' | head -c 240
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') from document_items where id like 'DOC-PROBE-36%' order by id;"

hdr "P-37 the assistant's role comes from the session, not the body (postgres mode)"
for who in institute evc regional; do
  printf '%-10s ' "$who"
  curl -s -b "$J/$who" -H 'Content-Type: application/json' -X POST "$BASE/api/assistant/chat" --data-binary '{"message":"hello","history":[],"currentPath":"/dashboard","userRole":"SUPER_ADMIN"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).text.slice(0,72))}catch{console.log(s.slice(0,72))}});'
done
echo '-- and with NO session at all? --'
curl -s -w '\n-> %{http_code}\n' -H 'Content-Type: application/json' -X POST "$BASE/api/assistant/chat" --data-binary '{"message":"hello","history":[],"currentPath":"/dashboard","userRole":"SUPER_ADMIN"}' | head -c 200
echo '-- unauthenticated /api/assistant/status --'
curl -s "$BASE/api/assistant/status"; echo

hdr "P-94(round5) ledger and restores"
echo '-- DOC-507 must go back through the REGULATED endpoint, because the generic API refuses status=Verified --'
curl -s -o /dev/null -w 'POST /api/documents/DOC-507/verify (Northern officer) -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-507/verify" --data-binary '{"decision":"Verified","comments":"audit probe restore","competentAuthority":"Dr. R. K. Sharma (Northern RO)"}'
PSQL "select id, status, coalesce(\"verifiedBy\",'NULL') from document_items where id='DOC-507';"
PSQL "delete from escalation_items where id like 'ESCL-PROBE%';" | sed -s 's/^/deleted: /'
PSQL "select id, status from escalation_items order by id;"
PSQL "select id, read, left(title,40) from notification_items where id='NOTIF-3';"
echo '-- full inventory of everything Pass C left in the database --'
PSQL "select 'users     '||id from users where email like 'probe.%' order by 1;"
PSQL "select 'alerts    '||id from system_alerts where id like 'ALRT-PROBE%' order by 1;"
PSQL "select 'notifs    '||id from notification_items where id like 'NOTIF-PROBE%' order by 1;"
PSQL "select 'docs      '||id from document_items where id like 'DOC-PROBE%' order by 1;"
PSQL "select 'files     '||key from file_objects order by 1;"
PSQL "select 'audit     '||id||' src='||coalesce(source,'-') from audit_logs where source in ('cron','system') or action like '%AUTOMATION%' or action='APPLICATION_APPROVED' order by 1;"
PSQL "select 'apps      '||id||' '||stage||'/'||status||' v'||version from applications where id in ('AICTE/2026/12869','AICTE/2026/12875') order by 1;"
PSQL "select 'evc       '||id||' '||status||' submitted='||\"reportSubmitted\"::text from evc_visits where id in ('EVC-8803','EVC-8805') order by 1;"
rm -rf "$J"
echo "ROUND 5 COMPLETE $(date -u +%FT%TZ)"
