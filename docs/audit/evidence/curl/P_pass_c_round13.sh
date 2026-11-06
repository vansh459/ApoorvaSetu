#!/usr/bin/env bash
# Pass C, round 13 — the three PS-critical writes L9-01 and L9-03 claim but Pass C had not yet run
# against a real row: (a) the deadline an institution owns, (b) the escalation level the sweep is
# supposed to compute, (c) the renewal verification the docs say only an authority can grant.
# Everything is captured as JSON before it is touched, reversed by primary key afterwards, and the
# round ends on a field-by-field equality check against the capture. Two probe rows are created and
# deleted by id; no seeded row is left changed.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d -p "$(pwd)")
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr() { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -c "$J/$1" -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1@apoorvasetu.demo\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
put()  { curl -s -b "$J/$1" -o "$J/out" -w '%{http_code}' -X PUT  -H 'Content-Type: application/json' --data @"$2" "$BASE/api/$3"; }
post() { curl -s -b "$J/$1" -o "$J/out" -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data @"$2" "$BASE/api/$3"; }
AUD() { PSQL 'select count(*) from audit_logs'; }
UND() { PSQL "select id||'|'||\"dueDate\"||'|L'||\"escalationLevel\"||'|'||status||'|evid='||coalesce(array_to_string(\"evidenceDocumentIds\",','),'EMPTY')||'|subBy='||coalesce(nullif(\"submittedBy\",''),'NULL') from undertakings where id='$1';"; }
DOC() { PSQL "select id||'|'||status||'|renewal='||coalesce(nullif(\"renewalStatus\",''),'NULL')||'|expires='||\"expiryDate\"||'|verifiedBy='||coalesce(nullif(\"verifiedBy\",''),'NULL') from document_items where id='$1';"; }
CMP() { PSQL "select id||'|'||\"dueDate\"||'|'||coalesce('L'||\"escalationLevel\"::text,'L-NULL')||'|'||status||'|verifiedBy='||coalesce(nullif(\"verifiedBy\",''),'NULL') from compliance_records where id='$1';"; }

for who in aicteadmin institute; do printf 'login %-10s -> %s\n' "$who" "$(login $who)"; done

PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from undertakings where id='UND-2602') t;"      > "$J/cap_und.json"
PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from compliance_records where id='CMP-101') t;" > "$J/cap_cmp.json"
PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from document_items where id='DOC-508') t;"     > "$J/cap_doc.json"
node -e '
const fs=require("fs");const all=[];
for (const f of ["cap_und.json","cap_cmp.json","cap_doc.json"]) all.push(...JSON.parse(fs.readFileSync(process.argv[1]+"/"+f,"utf8")));
fs.writeFileSync(process.argv[1]+"/capture.json",JSON.stringify(all));
' "$J"
printf 'captured ids: %s\n' "$(node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync(process.argv[1],'utf8')).map(r=>r.id).join(' '))" "$J/capture.json")"
# hard guard: without all three captured rows this round is not reversible, so refuse to write.
node -e '
const fs=require("fs");const rows=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const need=["UND-2602","CMP-101","DOC-508"];
const missing=need.filter((id)=>!rows.find((r)=>r.id===id));
if(missing.length){console.error("ABORT - capture missing "+missing.join(","));process.exit(1);}
' "$J/capture.json" || { echo "ROUND 13 ABORTED BEFORE ANY WRITE"; exit 1; }

# -------------------------------------------------------------- P-62 a real escalated undertaking
hdr "P-62 UND-2602: move the deadline, raise the level, then send the row back without them"
node -e '
const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).find(x=>x.id==="UND-2602");
const base={id:r.id,applicationId:r.applicationId,instituteId:r.instituteId,instituteName:r.instituteName,
  region:r.region,conditionCode:r.conditionCode,title:r.title,dueDate:r.dueDate,status:r.status,
  submittedAt:r.submittedAt,escalationLevel:r.escalationLevel,evidenceDocumentIds:r.evidenceDocumentIds};
fs.writeFileSync(process.argv[2]+"/p62a.json",JSON.stringify({...base,dueDate:"2026-12-05",escalationLevel:4}));
const drop={...base,dueDate:"2026-12-05"}; delete drop.escalationLevel; delete drop.evidenceDocumentIds;
fs.writeFileSync(process.argv[2]+"/p62b.json",JSON.stringify(drop));
' "$J/capture.json" "$J"
echo "   before: $(UND UND-2602)"
A=$(AUD); printf '   (a) PUT as AICTE_ADMIN, dueDate +30d and escalationLevel 0->4 -> %s\n' "$(put aicteadmin "$J/p62a.json" undertakings/UND-2602)"
echo "        $(UND UND-2602)  audit $A -> $(AUD)"
A=$(AUD); printf '   (b) PUT the same row WITHOUT escalationLevel/evidenceDocumentIds -> %s\n' "$(put aicteadmin "$J/p62b.json" undertakings/UND-2602)"
echo "        $(UND UND-2602)  audit $A -> $(AUD)"
printf '   (c) scope control: INSTITUTION_ADMIN(Northern) on the Eastern row -> %s\n' "$(put institute "$J/p62a.json" undertakings/UND-2602)"
echo "        $(head -c 120 "$J/out")"

# -------------------------------------------------------------- P-63 the owning institution's own row
hdr "P-63 no INST-101 undertaking is seeded, so create one as the institution and move its own deadline"
node -e '
const fs=require("fs");
fs.writeFileSync(process.argv[1]+"/p63a.json",JSON.stringify({id:"UND-PROBE-63",applicationId:"AICTE/2026/12876",
  instituteId:"INST-101",instituteName:"ABC Institute of Tech",region:"Northern",
  conditionCode:"UND_FACULTY_RETENTION",title:"Faculty retention undertaking (probe)",dueDate:"2026-11-20",
  status:"Submitted",submittedAt:"2026-11-01T10:00:00.000Z",evidenceDocumentIds:["Probe_Faculty_Retention.pdf"]}));
fs.writeFileSync(process.argv[1]+"/p63b.json",JSON.stringify({id:"UND-PROBE-63",applicationId:"AICTE/2026/12876",
  instituteId:"INST-101",instituteName:"ABC Institute of Tech",region:"Northern",
  conditionCode:"UND_FACULTY_RETENTION",title:"Faculty retention undertaking (probe)",dueDate:"2027-11-20",
  status:"Submitted",submittedAt:"2026-11-01T10:00:00.000Z"}));
fs.writeFileSync(process.argv[1]+"/p63c.json",JSON.stringify({id:"UND-PROBE-63",applicationId:"AICTE/2026/12876",
  instituteId:"INST-101",instituteName:"ABC Institute of Tech",region:"Northern",
  conditionCode:"UND_FACULTY_RETENTION",title:"Faculty retention undertaking (probe)",dueDate:"2027-11-20",
  status:"Pending"}));
' "$J"
printf '   (a) POST /api/undertakings as the institution (status Submitted) -> %s\n' "$(post institute "$J/p63a.json" undertakings)"
echo "        $(head -c 200 "$J/out")"
echo "        $(UND UND-PROBE-63)"
A=$(AUD); printf '   (b) PUT its own dueDate 2026-11-20 -> 2027-11-20 by that institution -> %s\n' "$(put institute "$J/p63b.json" undertakings/UND-PROBE-63)"
echo "        $(UND UND-PROBE-63)  audit $A -> $(AUD)"
A=$(AUD); printf '   (c) PUT it back to status Pending (un-submit) by the same session      -> %s\n' "$(put institute "$J/p63c.json" undertakings/UND-PROBE-63)"
echo "        $(UND UND-PROBE-63)  audit $A -> $(AUD)"

# -------------------------------------------------------------- P-64 the renewal chain
hdr "P-64 DOC-508 (renewal of DOC-504, Submitted): can renewalStatus become Verified off-endpoint?"
node -e '
const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).find(x=>x.id==="DOC-508");
const body=(x)=>({id:x.id,title:x.title,category:x.category,instituteName:x.instituteName,instituteId:x.instituteId,
  region:x.region,uploadDate:x.uploadDate,expiryDate:x.expiryDate,status:x.status,fileSize:x.fileSize,
  fileType:x.fileType,documentTypeCode:x.documentTypeCode,renewalOfId:x.renewalOfId,
  renewalStatus:x.renewalStatus,renewalNote:x.renewalNote});
const v={...body(r),renewalStatus:"Verified",renewalNote:"Renewal approved (probe), no verification endpoint used."};
fs.writeFileSync(process.argv[2]+"/p64a.json",JSON.stringify(v));
const s={...v,status:"Verified"};
fs.writeFileSync(process.argv[2]+"/p64b.json",JSON.stringify(s));
fs.writeFileSync(process.argv[2]+"/p64c.json",JSON.stringify({...body(r),id:"DOC-PROBE-64",
  instituteId:"INST-101",instituteName:"ABC Institute of Tech",region:"Northern",renewalStatus:"Submitted",
  renewalOfId:"DOC-502",title:"Fire Safety NOC renewal (probe)",category:"Fire Safety",
  documentTypeCode:"FIRE_SAFETY_NOC",uploadDate:"2026-11-01",expiryDate:"2027-11-01",status:"Pending"}));
fs.writeFileSync(process.argv[2]+"/p64d.json",JSON.stringify({...body(r),id:"DOC-PROBE-64",
  instituteId:"INST-101",instituteName:"ABC Institute of Tech",region:"Northern",renewalOfId:"DOC-502",
  title:"Fire Safety NOC renewal (probe)",category:"Fire Safety",documentTypeCode:"FIRE_SAFETY_NOC",
  uploadDate:"2026-11-01",expiryDate:"2036-11-01",status:"Pending",renewalStatus:"Verified",
  renewalNote:"Self-marked verified by the institution (probe)."}));
' "$J/capture.json" "$J"
echo "   before: $(DOC DOC-508)"
A=$(AUD); printf '   (a) PUT renewalStatus=Verified as AICTE_ADMIN (central scope) -> %s\n' "$(put aicteadmin "$J/p64a.json" documents/DOC-508)"
echo "        $(head -c 200 "$J/out")"
echo "        $(DOC DOC-508)  audit $A -> $(AUD)"
A=$(AUD); printf '   (b) same body with status=Verified too (the guard only reads status) -> %s\n' "$(put aicteadmin "$J/p64b.json" documents/DOC-508)"
echo "        $(head -c 160 "$J/out")  audit $A -> $(AUD)"
echo "   (c) the applicant path: institution creates its own renewal, then verifies it"
printf "        POST /api/documents as INSTITUTION_ADMIN -> %s\n" "$(post institute "$J/p64c.json" documents)"
echo "        after create : $(DOC DOC-PROBE-64)"
A=$(AUD); printf '        PUT renewalStatus=Verified, expiryDate 2036 by the SAME institution -> %s\n' "$(put institute "$J/p64d.json" documents/DOC-PROBE-64)"
echo "        after self-verify: $(DOC DOC-PROBE-64)  audit $A -> $(AUD)"

# -------------------------------------------------------------- P-65 compliance deadline
hdr "P-65 CMP-101 (INST-101's own): the institution moves its own compliance deadline and level"
node -e '
const fs=require("fs");const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8")).find(x=>x.id==="CMP-101");
const body=(x)=>({id:x.id,title:x.title,category:x.category,instituteName:x.instituteName,instituteId:x.instituteId,
  region:x.region,status:x.status,dueDate:x.dueDate,submissionDate:x.submissionDate,documentRef:x.documentRef,
  urgency:x.urgency,undertakingId:x.undertakingId,escalationLevel:x.escalationLevel});
fs.writeFileSync(process.argv[2]+"/p65a.json",JSON.stringify({...body(r),dueDate:"2027-08-01",escalationLevel:5}));
const drop={...body(r),dueDate:"2027-08-01"}; delete drop.escalationLevel;
fs.writeFileSync(process.argv[2]+"/p65b.json",JSON.stringify(drop));
' "$J/capture.json" "$J"
echo "   before: $(CMP CMP-101)"
A=$(AUD); printf '   (a) PUT dueDate +9 months, escalationLevel 5 as the owning institution -> %s\n' "$(put institute "$J/p65a.json" compliance/CMP-101)"
echo "        $(CMP CMP-101)  audit $A -> $(AUD)"
A=$(AUD); printf '   (b) PUT again with escalationLevel omitted (does compliance reset too?) -> %s\n' "$(put institute "$J/p65b.json" compliance/CMP-101)"
echo "        $(CMP CMP-101)  audit $A -> $(AUD)"

# -------------------------------------------------------------- P-66 the claim the UI makes
hdr "P-66 what the audit trail actually holds: previous/new state and correlation IDs"
echo "   rows with a non-empty previousState: $(PSQL "select count(*) from audit_logs where \"previousState\" is not null and \"previousState\" not in ('','{}');")"
echo "   rows with a non-empty newState     : $(PSQL "select count(*) from audit_logs where \"newState\" is not null and \"newState\" not in ('','{}');")"
echo "   rows with a correlationId          : $(PSQL "select count(*) from audit_logs where \"correlationId\" is not null and \"correlationId\"<>'';")"
echo "   total rows                         : $(AUD)"
echo "   of the rows this round wrote (none by design), the write path is:"
grep -n "previousState\|newState\|correlationId" server/audit.ts | sed 's/^/        /' 2>/dev/null
PSQL "select '        LOG sample: '||id||' | '||action||' | prev='||coalesce(\"previousState\",'NULL')||' | new='||coalesce(\"newState\",'NULL')||' | corr='||coalesce(\"correlationId\",'NULL') from audit_logs where \"previousState\" is not null order by id desc limit 2;"

# -------------------------------------------------------------- restore
hdr "P-67 restore the three captured rows by primary key and delete the two probe rows"
node -e '
const fs=require("fs");const Q=String.fromCharCode(39);
const rows=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const table=(r)=>r.id.startsWith("UND")?"undertakings":r.id.startsWith("CMP")?"compliance_records":"document_items";
const lit=(v)=>{ if(v===null) return "null";
  if(Array.isArray(v)) return "ARRAY[" + v.map((x)=>Q+String(x).split(Q).join(Q+Q)+Q).join(",") + "]::text[]";
  return Q + String(v).split(Q).join(Q+Q) + Q; };
const sql=rows.map((r)=>{const set=Object.keys(r).filter((k)=>k!=="id")
  .map((k)=>String.fromCharCode(34)+k+String.fromCharCode(34)+"="+lit(r[k])).join(", ");
  return "update "+table(r)+" set "+set+" where id="+lit(r.id)+";";});
fs.writeFileSync(process.argv[2]+"/restore.sql",sql.join("\n")+"\n"+
  "delete from undertakings where id="+lit("UND-PROBE-63")+";\n"+
  "delete from document_items where id="+lit("DOC-PROBE-64")+";\n");
' "$J/capture.json" "$J"
echo "   generated restore.sql:"; sed 's/^/        /' "$J/restore.sql" | cut -c1-150
docker exec -i apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -v ON_ERROR_STOP=1 -q < "$J/restore.sql" \
  && echo "   restore + probe deletes executed"
echo "   UND-2602 : $(UND UND-2602)"
echo "   CMP-101  : $(CMP CMP-101)"
echo "   DOC-508  : $(DOC DOC-508)"

hdr "P-68 field-by-field equality against the capture"
PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from undertakings where id='UND-2602') t;"      > "$J/after_und.json"
PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from compliance_records where id='CMP-101') t;" > "$J/after_cmp.json"
PSQL "select coalesce(json_agg(row_to_json(t))::text,'[]') from (select * from document_items where id='DOC-508') t;"     > "$J/after_doc.json"
node -e '
const fs=require("fs");const all=[];
for (const f of ["after_und.json","after_cmp.json","after_doc.json"]) all.push(...JSON.parse(fs.readFileSync(process.argv[1]+"/"+f,"utf8")));
fs.writeFileSync(process.argv[1]+"/after.json",JSON.stringify(all));
' "$J"
node -e '
const fs=require("fs");const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const b=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));let d=0;
for (const r of a) { const o=b.find(x=>x.id===r.id); if(!o){console.log("   MISSING "+r.id);d++;continue;}
  for (const k of Object.keys(r)) if (String(r[k])!==String(o[k])) {
    console.log(`   ${r.id}.${k}: captured=${JSON.stringify(r[k])} now=${JSON.stringify(o[k])}`); d++; } }
console.log(`   rows compared: ${a.length} | total field differences: ${d}`);
' "$J/capture.json" "$J/after.json"

hdr "P-69 residue"
echo "   probe rows left: $(PSQL "select count(*) from undertakings where id like '%PROBE%';") undertaking, $(PSQL "select count(*) from document_items where id like '%PROBE%';") document"
echo "   audit rows: $(AUD) | sessions: $(PSQL 'select count(*) from sessions')"
echo "   counts: apps=$(PSQL 'select count(*) from applications') und=$(PSQL 'select count(*) from undertakings') cmp=$(PSQL 'select count(*) from compliance_records') docs=$(PSQL 'select count(*) from document_items') users=$(PSQL 'select count(*) from users') alerts=$(PSQL 'select count(*) from system_alerts') notifs=$(PSQL 'select count(*) from notification_items') escl=$(PSQL 'select count(*) from escalation_items') files=$(PSQL 'select count(*) from file_objects')"
rm -rf "$J"
echo "ROUND 13 COMPLETE $(date -u +%FT%TZ)"
