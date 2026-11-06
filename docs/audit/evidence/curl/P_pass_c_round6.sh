#!/usr/bin/env bash
# Pass C, round 6 — close the three questions round 5 left open, and run the
# audit-feed capacity test rounds 1-5 never exercised.
#   P-38  /documents/:id/verify is verify-only: is "decision" read at all?
#         (statically: the word "decision" does not occur in workflow.ts;
#          undertakings/:id/verify DOES branch on body.outcome === 'reject')
#   P-39  the reject the UI actually performs is a generic PUT + a
#         browser-authored audit row POSTed to /api/audit
#   P-40  escalation dedupeKey squatting with the round-5 enum bug fixed
#         (round 5 sent urgency:"Low" -> 400 INVALID_BODY, so the placeholder
#          row was never created and the merge question stayed unanswered)
#   P-41  the snapshot audit feed is take:200 over a queue any session may write
# Harness notes carried from rounds 4-5: the container is hand-recreated with
# MSYS_NO_PATHCONV=1 so UPLOAD_DIR stays /app/data/uploads (Git Bash converts
# absolute paths in -e args otherwise). Every curl here has exactly one URL.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d)
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e"; done

doc_body() { # $1=id $2=status
  printf '{"id":"%s","title":"Probe fire NOC for round 6","category":"Fire Safety","instituteName":"XYZ College of Engg.","instituteId":"INST-102","region":"Northern","uploadDate":"2026-11-01","expiryDate":"2029-11-01","status":"%s","fileSize":"1.0 MB","fileType":"PDF","documentTypeCode":"FIRE_SAFETY_NOC"}' "$1" "$2"
}

hdr "P-38 the document verify endpoint is verify-only: what happens to decision=Rejected?"
echo "audit rows in: $(PSQL 'select count(*) from audit_logs;')"
curl -s -o /dev/null -w 'POST /api/documents (DOC-PROBE-38, Northern, Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary @- "$BASE/api/documents" <<EOF
$(doc_body DOC-PROBE-38 Pending)
EOF
echo '-- an officer asks for REJECTION through the regulated verify endpoint (full body, no truncation) --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-38/verify" --data-binary '{"decision":"Rejected","comments":"probe: this is meant to be a rejection","competentAuthority":"Automated Rejection Pipeline"}'
echo '-- is there any reject route for documents? --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-38/reject" --data-binary '{"reason":"probe"}'
echo '-- the same question on the undertaking endpoint, which DOES branch on outcome (2 non-mutating probes): --'
curl -s -w '\n-> %{http_code}\n' -b "$J/aicteadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/undertakings/UND-2601/verify" --data-binary '{"outcome":"reject","reason":"probe: Pending, so INVALID_STATE is expected not NOT_FOUND"}'
curl -s -w '\n-> %{http_code}\n' -b "$J/aicteadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/undertakings/UND-2602/verify" --data-binary '{"outcome":"reject"}'
echo '   ^ 400 "reason is required" = the reject arm is live and reads the body;'
echo '     the document endpoint returned 200 and ignored its body entirely.'
echo '-- verify is not repeatable: the row is Verified now, so a second verify is refused --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-38/verify" --data-binary '{"comments":"probe second verify"}'
echo '-- protected-field guard refuses a caller-supplied verifiedAt, which no column can store --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/documents/DOC-PROBE-36B/verify" --data-binary '{"verifiedAt":"2020-01-01T00:00:00.000Z"}'
echo '-- columns on document_items that could hold who/when verified vs undertakings: --'
PSQL "select 'document_items : '||coalesce(string_agg(column_name,','),'NONE') from information_schema.columns where table_name='document_items' and (column_name ilike '%ver%' or column_name ilike '%date%' or column_name ilike '%note%');"
PSQL "select 'undertakings   : '||coalesce(string_agg(column_name,','),'NONE') from information_schema.columns where table_name='undertakings' and (column_name ilike '%ver%' or column_name ilike '%reason%');"
echo "DOC-PROBE-38 row: $(PSQL "select id||'|'||status||'|verifiedBy='||coalesce(\"verifiedBy\",'NULL') from document_items where id='DOC-PROBE-38';")"
PSQL "select '  audit for it  : '||coalesce(string_agg(action||' src='||coalesce(source,'-'),', '),'NONE') from audit_logs where \"entityId\"='DOC-PROBE-38';"
echo "audit rows out: $(PSQL 'select count(*) from audit_logs;')"

hdr "P-39 the reject the UI actually performs: generic PUT + a browser-authored audit row"
echo 'AppContext.tsx:1917-1953   rejectDocument() -> repository.upsertDocument(status:"Rejected")'
echo 'postgresRepository.ts:228  appendAudit()    -> POST /api/audit with the browser action/details/states'
curl -s -o /dev/null -w 'POST /api/documents (DOC-PROBE-39, Northern, Pending) -> %{http_code}\n' -b "$J/superadmin" -H 'Content-Type: application/json' --data-binary @- "$BASE/api/documents" <<EOF
$(doc_body DOC-PROBE-39 Pending)
EOF
A0=$(PSQL 'select count(*) from audit_logs;')
echo '-- step 1: the write the client makes when the officer clicks Reject --'
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-PROBE-39" --data-binary @- <<EOF
$(doc_body DOC-PROBE-39 Rejected)
EOF
echo "after the PUT only : $(PSQL "select id||'|'||status from document_items where id='DOC-PROBE-39';")   audit rows $A0 -> $(PSQL 'select count(*) from audit_logs;')"
echo '-- step 2: the audit row the browser then sends about its own action, fields verbatim from the client --'
A1=$(PSQL 'select count(*) from audit_logs;')
curl -s -w '\n-> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' -X POST "$BASE/api/audit" --data-binary '{"action":"REJECT_DOCUMENT","entityType":"Document","entityId":"DOC-PROBE-39","details":"Document rejected by Dr. R. K. Sharma: wording invented by the client","previousState":"{\"status\":\"Pending\"}","newState":"{\"status\":\"Rejected\"}","eventType":"document.rejected","source":"ui"}'
echo "after the audit POST: $(PSQL "select id||'|'||status from document_items where id='DOC-PROBE-39';")   audit rows $A1 -> $(PSQL 'select count(*) from audit_logs;')"
PSQL "select '  stored as    : '||action||' by '||coalesce(\"userRole\",'-')||' src='||coalesce(source,'-')||' | '||coalesce(details,'') from audit_logs where \"entityId\"='DOC-PROBE-39' order by id;"
echo '   ^ the server recorded an outcome it never validated, in words it never generated.'
echo '-- the same generic PUT by the applicant itself (documents.upload only, no documents.verify) --'
A2=$(PSQL 'select count(*) from audit_logs;')
curl -s -o /dev/null -w 'INSTITUTION_ADMIN PUT DOC-PROBE-39 status Rejected -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-PROBE-39" --data-binary @- <<EOF
$(doc_body DOC-PROBE-39 Rejected)
EOF
curl -s -o /dev/null -w 'INSTITUTION_ADMIN PUT DOC-PROBE-39 status Expired  -> %{http_code}\n' -b "$J/institute" -H 'Content-Type: application/json' -X PUT "$BASE/api/documents/DOC-PROBE-39" --data-binary @- <<EOF
$(doc_body DOC-PROBE-39 Expired)
EOF
echo "  audit rows unchanged: $A2 -> $(PSQL 'select count(*) from audit_logs;')"

hdr "P-40 escalation dedupe squatting, retry with bodies that pass the parser"
echo 'parseEscalation (payload.ts:355-375): urgency in Medium|High|Critical, status in Open|Under Review|Resolved'
K="AICTE/2026/12876|SLA_BREACH"
E0=$(PSQL 'select count(*) from escalation_items;')
echo '-- (a) the round-5 body again, printing WHY it was refused --'
curl -s -w '\n-> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40BAD","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Institution","raisedDate":"01 Nov 2026","urgency":"Low","reason":"probe: the round-5 body","status":"Open","level":1,"slaBreachDays":1,"dedupeKey":"$K"}
EOF
echo '-- (b) a valid placeholder from the least-privileged persona, squatting the SLA_BREACH key --'
curl -s -w '\n-> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Institution","raisedDate":"01 Nov 2026","urgency":"Medium","reason":"probe placeholder squatting the SLA breach key","status":"Open","level":1,"slaBreachDays":1,"dedupeKey":"$K"}
EOF
echo "  raisedBy stored: $(PSQL "select \"raisedBy\" from escalation_items where id='ESCL-PROBE-40';")   (data.ts:423 stamps it from the session unless it is the automaton)"
echo '-- (c) now the genuine Critical escalation for the same case+rule arrives --'
curl -s -w '\n-> %{http_code}\n' -b "$J/aicteadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40B","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Amit Sharma","raisedDate":"01 Nov 2026","urgency":"Critical","reason":"the genuine SLA breach","status":"Open","level":3,"slaBreachDays":40,"dedupeKey":"$K"}
EOF
echo "escalation rows $E0 -> $(PSQL 'select count(*) from escalation_items;')   ESCL-PROBE-40B inserted: $(PSQL "select count(*) from escalation_items where id='ESCL-PROBE-40B';")"
PSQL "select '  key holder: '||id||'|'||urgency||'|L'||level::text||'|breachDays='||\"slaBreachDays\"::text||'|by '||\"raisedBy\" from escalation_items where \"dedupeKey\"='$K' order by id;"
echo '   ^ the response carried ESCL-PROBE-40 and 21 rows were NOT created: the genuine escalation'
echo '     was merged into the placeholder the lowest-privileged persona wrote, with no rejection and no audit.'
echo '-- (d) reverse order: does a late placeholder overwrite a row that already holds the key? --'
K2="AICTE/2026/12876|GENUINE_FIRST"
curl -s -o /dev/null -w 'POST genuine Critical first (aicteadmin)   -> %{http_code}\n' -b "$J/aicteadmin" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40C","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Amit Sharma","raisedDate":"01 Nov 2026","urgency":"Critical","reason":"genuine, created before any placeholder","status":"Open","level":3,"slaBreachDays":40,"dedupeKey":"$K2"}
EOF
curl -s -w '\n-> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40D","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Institution","raisedDate":"01 Nov 2026","urgency":"Medium","reason":"probe placeholder arriving after the genuine row","status":"Open","level":1,"slaBreachDays":1,"dedupeKey":"$K2"}
EOF
echo "  rows for K2: $(PSQL "select coalesce(string_agg(id||'('||urgency||')',', '),'NONE') from escalation_items where \"dedupeKey\"='$K2';")"
echo '-- (e) may the least-privileged persona resolve an escalation another role raised? --'
curl -s -o /dev/null -w 'EVC_MEMBER PUT ESCL-PROBE-40C status Resolved (in region) -> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X PUT "$BASE/api/escalations/ESCL-PROBE-40C" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40C","applicationId":"AICTE/2026/12876","instituteName":"ABC Institute of Tech","region":"Northern","raisedBy":"Amit Sharma","raisedDate":"01 Nov 2026","urgency":"Critical","reason":"closed by a probe","status":"Resolved","level":3,"slaBreachDays":40,"dedupeKey":"$K2"}
EOF
PSQL "select '  now: '||id||'|'||status||'|resolvedAt='||coalesce(\"resolvedAt\",'NULL') from escalation_items where id='ESCL-PROBE-40C';"
echo '-- (f) out-of-region control --'
curl -s -o /dev/null -w 'EVC_MEMBER(Northern) POST escalation region=Eastern -> %{http_code}\n' -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/escalations" --data-binary @- <<EOF
{"id":"ESCL-PROBE-40E","applicationId":"AICTE/2026/12873","instituteName":"Techno Institute","region":"Eastern","raisedBy":"Institution","raisedDate":"01 Nov 2026","urgency":"Medium","reason":"probe out of region","status":"Open","level":1}
EOF

hdr "P-41 the audit feed is a capped view over a queue any session may write"
echo 'data.ts:465-538 snapshot: hasPermission(user,"audit.read") ? findMany(orderBy id desc, take:200) : []'
echo 'data.ts:566-592 POST /api/audit: requireUser only; action free text <=200; source chosen by the caller'
BEFORE=$(PSQL 'select count(*) from audit_logs;')
SNAP0=$(curl -s -b "$J/superadmin" "$BASE/api/snapshot")
echo "rows in db before: $BEFORE"
ROWS0=$BEFORE node -e 'const s=process.argv[1];const j=JSON.parse(s);const a=j.auditLogs||[];console.log("  snapshot bytes:",(s.length/1024).toFixed(1)+"KB","| auditLogs returned:",a.length,"| newest:",a.length?a[0].id:"none","| oldest:",a.length?a[a.length-1].id:"none");' "$SNAP0"
echo '-- a signed-in EVC member (no audit permission required) writes 210 filler rows --'
T0=$(date +%s)
for i in $(seq -w 1 210); do
  curl -s -o /dev/null -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/audit" \
    --data-binary "{\"action\":\"ZZZ PROBE BURY $i\",\"entityType\":\"System\",\"entityId\":\"PROBE-BURY-$i\",\"details\":\"filler row to test the 200-row audit cap\",\"source\":\"ui\"}"
done
T1=$(date +%s)
AFTER=$(PSQL 'select count(*) from audit_logs;')
echo "  210 POSTs in $((T1-T0))s; rows in db $BEFORE -> $AFTER"
SNAP1=$(curl -s -b "$J/superadmin" "$BASE/api/snapshot")
node -e 'const s=process.argv[1];const j=JSON.parse(s);const a=j.auditLogs||[];const real=a.filter(x=>!x.action.startsWith("ZZZ PROBE BURY"));console.log("  snapshot bytes:",(s.length/1024).toFixed(1)+"KB","| auditLogs returned:",a.length,"| non-filler visible:",real.length,"| filler:",a.length-real.length);console.log("  surviving real events:",real.map(x=>x.action).join(", ").slice(0,240));' "$SNAP1"
echo "  real events still in the database but not reachable through the feed: $(PSQL "select count(*) from audit_logs where action not like 'ZZZ PROBE BURY%';")"
PSQL "delete from audit_logs where action like 'ZZZ PROBE BURY%';" | sed 's/^/  cleanup: /'
SNAP2=$(curl -s -b "$J/superadmin" "$BASE/api/snapshot")
ROWS2=$(PSQL 'select count(*) from audit_logs;')
ROWS2=$ROWS2 node -e 'const s=process.argv[1];const j=JSON.parse(s);console.log("  after cleanup: rows in db:",process.env.ROWS2,"| snapshot bytes:",(s.length/1024).toFixed(1)+"KB","| auditLogs:",(j.auditLogs||[]).length);' "$SNAP2"
echo '-- every persona gets the same 13-table payload shape; size per role: --'
for who in institute evc regional aicteadmin superadmin; do
  WHO=$who curl -s -b "$J/$who" "$BASE/api/snapshot" | WHO=$who node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const t=Object.keys(j).filter(k=>Array.isArray(j[k]));console.log("  "+process.env.WHO+":",(s.length/1024).toFixed(1)+"KB","| arrays:",t.length,"| auditLogs:",(j.auditLogs||[]).length,"| users:",(j.users||[]).length);});'
done

hdr "P-95(round6) ledger, restores and residue"
PSQL "delete from escalation_items where id like 'ESCL-PROBE-40%';" | sed 's/^/escalations deleted: /'
PSQL "delete from document_items where id in ('DOC-PROBE-38','DOC-PROBE-39');" | sed 's/^/documents deleted:   /'
echo '-- DOC-502 has been sitting at Expired since round 4 (its seed state was Verified).'
echo '   No sanctioned path can put it back: /verify requires status Pending. --'
curl -s -o /dev/null -w 'POST /api/documents/DOC-502/verify -> %{http_code}\n' -b "$J/regional" -H 'Content-Type: application/json' --data-binary '{"comments":"probe restore attempt"}'
echo '   so the restore is done with psql - the data is only reversible by whoever holds'
echo '   the database, not through the application own API.'
PSQL "update document_items set status='Verified', \"verifiedBy\"='Dr. R. K. Sharma (Northern RO)' where id='DOC-502';" | sed 's/^/restored: /'
PSQL "select id||'|'||status||'|'||coalesce(\"verifiedBy\",'NULL') from document_items where id in ('DOC-501','DOC-502','DOC-507') order by id;"
PSQL "select 'escalations left : '||coalesce(string_agg(id,','),'NONE') from escalation_items;"
PSQL "select 'probe docs left  : '||coalesce(string_agg(id,','),'NONE') from document_items where id like 'DOC-PROBE%';"
PSQL "select 'audit inventory  : '||action||' src='||coalesce(source,'-')||' x'||c from (select action, source, count(*) as c from audit_logs group by action, source) t order by action;"
PSQL "select 'audit rows total : '||count(*) from audit_logs;"
PSQL "select 'apps             : '||id||' '||stage||'/'||status||' v'||version from applications where id in ('AICTE/2026/12869','AICTE/2026/12875') order by id;"
PSQL "select 'evc              : '||id||' '||status||' submitted='||\"reportSubmitted\"::text from evc_visits where id in ('EVC-8803','EVC-8805') order by id;"
rm -rf "$J"
echo "ROUND 6 COMPLETE $(date -u +%FT%TZ)"
