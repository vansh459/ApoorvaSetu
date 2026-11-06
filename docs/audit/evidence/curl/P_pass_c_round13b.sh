#!/usr/bin/env bash
# Pass C, round 13b — one loose end from round 13's P-63.
# Round 13's transcript shows 409 ALREADY_EXISTS for the institution's POST because the FIRST
# execution of round 13 died on a malformed capture query (its guard aborted before any write, but
# bash had already parsed and run the literal-body probes above it) and left UND-PROBE-63 behind
# without reaching the restore step. That residue is what this round consumes. It records the create
# the way P-63 claimed it: 201, submittedBy stamped from the session, then the owning institution
# moving its own deadline, then the row deleted by primary key.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d -p "$(pwd)")
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
UND() { PSQL "select id||'|'||\"dueDate\"||'|L'||\"escalationLevel\"||'|'||status||'|evid='||coalesce(nullif(array_to_string(\"evidenceDocumentIds\",','),''),'EMPTY')||'|subBy='||coalesce(nullif(\"submittedBy\",''),'NULL') from undertakings where id='UND-PROBE-63';"; }
AUD() { PSQL 'select count(*) from audit_logs'; }
printf 'pre-flight: row present? [%s] | undertakings=%s | audit=%s\n' "$(UND UND-PROBE-63)" \
  "$(PSQL 'select count(*) from undertakings')" "$(AUD)"
printf 'login institute -> %s\n' "$(curl -s -c "$J/inst" -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' \
  -d "{\"email\":\"institute@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login")"

cat > "$J/create.json" <<'BODY'
{"id":"UND-PROBE-63","applicationId":"AICTE/2026/12876","instituteId":"INST-101",
 "instituteName":"ABC Institute of Tech","region":"Northern","conditionCode":"UND_FACULTY_RETENTION",
 "title":"Faculty retention undertaking (probe)","dueDate":"2026-11-20","status":"Submitted",
 "submittedAt":"2026-11-01T10:00:00.000Z","evidenceDocumentIds":["Probe_Faculty_Retention.pdf"]}
BODY
cat > "$J/extend.json" <<'BODY'
{"id":"UND-PROBE-63","applicationId":"AICTE/2026/12876","instituteId":"INST-101",
 "instituteName":"ABC Institute of Tech","region":"Northern","conditionCode":"UND_FACULTY_RETENTION",
 "title":"Faculty retention undertaking (probe)","dueDate":"2027-11-20","status":"Submitted"}
BODY

A=$(AUD)
printf 'P-63a POST /api/undertakings as INSTITUTION_ADMIN (own instituteId) -> %s\n' \
  "$(curl -s -b "$J/inst" -o "$J/out" -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data @"$J/create.json" "$BASE/api/undertakings")"
echo "     $(head -c 240 "$J/out")"
echo "     stored: $(UND UND-PROBE-63)   audit $A -> $(AUD)"
A=$(AUD)
printf 'P-63b PUT its own dueDate 2026-11-20 -> 2027-11-20 by that institution -> %s\n' \
  "$(curl -s -b "$J/inst" -o "$J/out" -w '%{http_code}' -X PUT -H 'Content-Type: application/json' --data @"$J/extend.json" "$BASE/api/undertakings/UND-PROBE-63")"
echo "     stored: $(UND UND-PROBE-63)   audit $A -> $(AUD)"
echo "     ^ note what the round-trip cost: evidenceDocumentIds is EMPTY again and escalationLevel"
echo "       stayed 0 - the fields the body omitted were written, not preserved (L9-07)."

echo "-- delete the probe row by primary key, then prove the dataset is where round 13 left it --"
PSQL "delete from undertakings where id='UND-PROBE-63';"
echo "   row after delete: [$(UND UND-PROBE-63)]"
PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from undertakings order by id) t;" > "$J/now.json"
node -e '
const fs=require("fs");
const now=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const want=[["UND-2601","2026-10-20",0,"Pending"],["UND-2602","2026-11-05",0,"Submitted"],
            ["UND-2603","2026-11-28",0,"Verified"],["UND-2604","2026-11-10",0,"Rejected"],
            ["UND-2605","2026-12-13",0,"Pending"],["UND-2606","2026-10-07",0,"Verified"],
            ["UND-2607","2026-12-26",0,"Pending"]];
let bad=0;
for (const [id,dueDate,level,status] of want) { const r=now.find((x)=>x.id===id);
  if(!r){console.log("   MISSING "+id);bad++;continue;}
  const mism = r.dueDate!==dueDate || r.escalationLevel!==level || r.status!==status;
  if(mism){console.log(`   ${id}: due=${r.dueDate} want=${dueDate} L${r.escalationLevel} want L${level} ${r.status} want ${status}`);bad++;} }
console.log("   seed-shape rows checked: "+want.length+" | mismatches: "+bad);
console.log("   evidence links restored on UND-2602: "+JSON.stringify((now.find((x)=>x.id==="UND-2602")||{}).evidenceDocumentIds));
' "$J/now.json"
echo "   final counts: undertakings=$(PSQL 'select count(*) from undertakings') docs=$(PSQL 'select count(*) from document_items') cmp=$(PSQL 'select count(*) from compliance_records') audit=$(AUD) sessions=$(PSQL 'select count(*) from sessions')"
rm -rf "$J"
echo "ROUND 13B COMPLETE $(date -u +%FT%TZ)"
