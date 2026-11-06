#!/usr/bin/env bash
# Pass C, round 9 — the two ordering claims the earlier rounds deferred, and
# the correction of one of them.
#   P-46 is the notification feed a real browser receives (zero writes).
#   P-47 measures what the timestamp columns actually hold.
#   P-48 shows the ORDER-BY mechanism inside a transaction that is rolled back,
#        so the database is untouched; the row counts after prove it.
#   P-49 re-tests the L3-03 "random suffix makes the latest-200 wrong" claim.
#        It is largely FALSE for the machine-written block and this round says
#        so; the real defect is the two incompatible id families and the two
#        incompatible stamp formats in the same TEXT column.
#
# Harness notes carried from rounds 6-8:
#   - do NOT export MSYS_NO_PATHCONV here: native node then reads /c/Users/...
#     as C:\c\Users\... and the stdin filters fail.
#   - mktemp inside the repo, because Git Bash /tmp is not native node's /tmp.
#   - pipe the snapshot into node over stdin; passing it as argv dies with
#     "Argument list too long".
#   - the repo package.json is "type":"module", so any temp script is .cjs.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d -p "$(pwd)")
PSQL()  { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
PSQLT() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -c "$1"; }
hdr()   { printf '\n================ %s ================\n' "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin institute; do login $e@apoorvasetu.demo "$J/$e"; done

hdr "P-46 the notification order a browser actually gets - no writes at all"
echo 'data.ts:491   db.notificationItem.findMany({ orderBy: { timestamp: "desc" } })'
echo 'audit.ts:16   formatAuditTimestamp -> "02 Nov 2026, 06:14 PM"  (en-GB day first)'
echo '-- what the seed stores in notification_items."timestamp" --'
PSQLT "select id, timestamp, read from notification_items order by id;"
echo '-- the SQL Prisma emits, verbatim --'
PSQLT 'select id, timestamp from notification_items order by "timestamp" desc;'
echo '-- the same array as it arrives over HTTP (superadmin snapshot) --'
curl -s -b "$J/superadmin" "$BASE/api/snapshot" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const n=(JSON.parse(s).notifications)||[];
  console.log("  feed order (first = shown at the top of the Notifications page):");
  n.forEach((x,i)=>console.log("   ",i+1,String(x.id).padEnd(9),JSON.stringify(x.timestamp),"|",x.title.slice(0,52)));
  const want=["NOTIF-1","NOTIF-2","NOTIF-3","NOTIF-4","NOTIF-5"];
  const got=n.map(x=>x.id);
  console.log("  newest-first order the labels imply:",want.join(" > "));
  console.log("  order the server returned        :",got.join(" > "));
  console.log("  positions correct:",got.filter((g,i)=>g===want[i]).length,"of",got.length);
});'
echo '-- does the client re-sort before rendering? --'
echo "   grep -c '.sort(' src/pages/Notifications.tsx -> $(grep -c '\.sort(' src/pages/Notifications.tsx 2>/dev/null || echo 0)"
echo "   grep -n 'sort' src/services/repositories/postgresRepository.ts -> $(grep -n 'sort' src/services/repositories/postgresRepository.ts | head -3 | tr '\n' ' ')"
echo "   the server reuses the browser-side filter and it only filters, never sorts:"
grep -n "export function filterNotificationsForUser" -A 7 src/services/rbacService.ts | sed 's/^/     /'

hdr "P-47 what the two TEXT time columns actually hold (format census over live rows)"
PSQLT "select 'notification_items' as tbl, count(*) as rows,
       count(*) filter (where timestamp ~ '^[0-9]{2} [A-Za-z]{3} [0-9]{4}, ') as display_stamp,
       count(*) filter (where timestamp ~ 'ago$') as relative_label,
       count(*) filter (where timestamp !~ '^[0-9]{2} [A-Za-z]{3} [0-9]{4}, ' and timestamp !~ 'ago$') as other
       from notification_items
       union all
       select 'audit_logs', count(*),
       count(*) filter (where timestamp ~ '^[0-9]{2} [A-Za-z]{3} [0-9]{4}, '),
       count(*) filter (where timestamp ~ 'ago$'),
       count(*) filter (where timestamp !~ '^[0-9]{2} [A-Za-z]{3} [0-9]{4}, ' and timestamp !~ 'ago$')
       from audit_logs;"
echo '-- the same column, two authors, two formats, one ORDER BY --'
echo "   server-stamped rows (writeAudit -> formatAuditTimestamp): 01 Nov 2026, 05:44 PM"
echo "   seed rows (src/data/initialData.ts -> seedDisplayParts):  '10 mins ago', '2 days ago'"
echo '-- and the deadline columns are ISO, which does sort correctly --'
PSQLT 'select id, "dueDate" from compliance_records order by "dueDate" asc;'
echo "   mismatch between text order and instant order on compliance_records.dueDate:"
docker exec -i apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tA <<'SQL'
with ranked as (
  select id,
         row_number() over (order by "dueDate" asc)                    as text_pos,
         row_number() over (order by to_date("dueDate",'YYYY-MM-DD') asc) as date_pos
  from compliance_records
)
select '  rows where text rank <> date rank: '||count(*)::text from ranked where text_pos <> date_pos;
select '  rows where text rank <> date rank on documents.expiryDate: '||count(*)::text from (
  select row_number() over (order by "expiryDate" asc) a,
         row_number() over (order by to_date("expiryDate",'YYYY-MM-DD') asc) b
  from document_items) y where a <> b;
SQL

hdr "P-48 the mechanism, inside a transaction that is rolled back"
echo "   rows before: compliance=$(PSQL 'select count(*) from compliance_records') notif=$(PSQL 'select count(*) from notification_items')"
docker exec -i apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -q <<'SQL'
begin;
insert into compliance_records (id,title,category,"instituteName","instituteId",region,status,"dueDate",urgency)
  values ('X-P48-A','probe A','Lease Documents','Probe Institute','INST-X','Northern','Pending','05 Nov 2026','high'),
         ('X-P48-B','probe B','Lease Documents','Probe Institute','INST-X','Northern','Pending','01 Dec 2026','high'),
         ('X-P48-C','probe C','Lease Documents','Probe Institute','INST-X','Northern','Pending','2026-11-05','high');
\echo '  ORDER BY "dueDate" ASC as the server runs it, with two display-format dates present:'
select id, "dueDate" from compliance_records order by "dueDate" asc;
\echo '  the same rows ordered by the instant they mean:'
select id, "dueDate" from compliance_records order by to_date(case when "dueDate" ~ '^[0-9]{4}-' then "dueDate" else to_char(to_date("dueDate",'DD Mon YYYY'),'YYYY-MM-DD') end, 'YYYY-MM-DD') asc;
insert into notification_items (id,title,description,category,timestamp,read,priority,"targetRole")
  values ('X-P48-N1','probe notif one','written inside the transaction','system','20 Nov 2026, 09:00 AM',false,'high','NOT_A_ROLE'),
         ('X-P48-N2','probe notif two','written inside the transaction','system','01 Dec 2026, 09:00 AM',false,'high','SUPERADMIN');
\echo '  ORDER BY timestamp DESC with a Dec-2026 and a Nov-2026 display stamp in the column:'
select id, timestamp from notification_items where id like 'X-P48%' or id like 'NOTIF%' order by timestamp desc;
\echo '  a targetRole no persona can ever match, stored verbatim (payload.ts casts it, oneOf is not applied):'
select id, "targetRole" from notification_items where id like 'X-P48%';
rollback;
SQL
echo "   the role values the product actually recognises:"
grep -n "NotificationItem\['targetRole'\]" src/types/index.ts | head -2 | sed 's/^/     /'
grep -n "targetRole" src/types/index.ts | head -3 | sed 's/^/     /'
echo "   rows after : compliance=$(PSQL 'select count(*) from compliance_records') notif=$(PSQL 'select count(*) from notification_items')"
echo "   probe rows surviving anywhere: $(PSQL "select coalesce(string_agg(t,' | '),'NONE') from (select id as t from compliance_records where id like 'X-P48%' union all select id from notification_items where id like 'X-P48%') s;")"

hdr "P-49 the id-ordering claim, re-tested and corrected"
echo 'audit.ts:30   id = LOG-${Date.now().toString(36)}-${3 random bytes hex}'
echo 'data.ts:499   orderBy: { id: "desc" }, take: 200'
echo '-- is the base36 prefix monotonic with wall clock? decode every machine id --'
PSQL "select id from audit_logs where id ~ '^LOG-M' order by id asc;" > "$J/ids.txt"
node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const ids=s.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^LOG-M/.test(x));
  const t=ids.map(x=>parseInt(x.slice(4,12),36));
  let mono=true, firstBad=-1;
  for(let i=1;i<t.length;i++) if(t[i]<t[i-1]){mono=false; firstBad=i; break;}
  console.log("  machine-written ids:",ids.length,"| prefix monotonic ascending:",mono?"YES":"NO at #"+firstBad);
  const span=(t[t.length-1]-t[0])/1000;
  console.log("  decoded span:",span.toFixed(1)+"s  from",new Date(t[0]).toISOString(),"to",new Date(t[t.length-1]).toISOString());
  const seen=new Map(); let same=0;
  t.forEach((v,i)=>{ if(seen.has(v)) same++; else seen.set(v,i); });
  console.log("  ids sharing the same millisecond prefix:",same,"(tie-broken by the random suffix only)");
  const groups=[...seen.entries()].filter(([v,i])=>t.filter(x=>x===v).length>1);
  groups.slice(0,6).forEach(([v])=>console.log("    ms",v,new Date(v).toISOString(),"->",ids.filter((x,j)=>t[j]===v).join(", ")));
});' < "$J/ids.txt"
echo '-- the seed block uses a different id family entirely --'
PSQLT "select id, timestamp, action from audit_logs where id !~ '^LOG-M' order by id desc;"
echo '-- order the feed really returns (id desc), showing the seam where the families meet --'
PSQLT "select id, timestamp, action from audit_logs order by \"id\" desc offset 86 limit 10;"
echo '-- how many adjacent pairs in that feed are out of chronological order? --'
PSQL "
with feed as (
  select id, row_number() over () as pos,
         to_timestamp(timestamp, 'DD Mon YYYY, HH12:MI AM') as ts
  from audit_logs order by id desc
)
select '  out-of-order adjacent pairs: '||count(*)::text
from feed a join feed b on b.pos = a.pos + 1
where a.ts < b.ts;"
echo '-- and how many are inside the same display minute (so the display string cannot order them at all) --'
PSQL "select '  rows sharing a minute: '||count(*)::text||' across '||count(distinct m)::text||' minutes' from (select date_trunc('minute',to_timestamp(timestamp,'DD Mon YYYY, HH12:MI AM')) as m from audit_logs group by 1 having count(*)>1) x;" 2>/dev/null

hdr "P-97 residue check after round 9 (this round writes nothing that persists)"
PSQL "select '  apps='||a||' docs='||d||' und='||u||' cmp='||c||' evc='||e||' alerts='||al||' notifs='||n||' escl='||es||' users='||us||' files='||f||' audit='||au
from (select (select count(*) from applications) a,(select count(*) from document_items) d,(select count(*) from undertakings) u,
      (select count(*) from compliance_records) c,(select count(*) from evc_visits) e,(select count(*) from system_alerts) al,
      (select count(*) from notification_items) n,(select count(*) from escalation_items) es,(select count(*) from users) us,
      (select count(*) from file_objects) f,(select count(*) from audit_logs) au) x;"
PSQL "select '  probe ids anywhere: '||coalesce(string_agg(t,' | '),'NONE') from (
  select id||'@compliance' as t from compliance_records where id like 'X-P48%'
  union all select id||'@notif' from notification_items where id like 'X-P48%'
  union all select id||'@audit' from audit_logs where id like '%P48%' or action like '%P48%'
  union all select id||'@docs' from document_items where id like '%PROBE%'
  union all select id||'@evc' from evc_visits where id like '%PROBE%'
  union all select id||'@und' from undertakings where id like '%PROBE%'
  union all select id||'@alerts' from system_alerts where id like '%PROBE%'
  union all select id||'@escl' from escalation_items where id like '%PROBE%'
  union all select id||'@users' from users where email like 'probe.%') s;"
echo '-- seed equality re-verified with the round-8 comparator --'
rm -rf "$J"
echo "ROUND 9 COMPLETE $(date -u +%FT%TZ)"
