#!/usr/bin/env bash
# Pass C, round 7 — the ops/quantitative artefacts rounds 1-6 owed.
#   P-42  the 200-row audit cap measured (round 6 lost three node calls to
#         "Argument list too long" - the snapshot is piped over stdin here)
#   P-43  the snapshot query shapes: index inventory, EXPLAIN at seed volume,
#         then the same plans with the tables inflated ~200x
#   P-44  docker stats, timed snapshot load, and a 240s quiet soak with a live
#         SSE listener and 20 extra sessions
#   P-45  what each persona's snapshot carries after all of it
#   P-96  cleanup: every row and file this Pass wrote, listed as it is removed
# Read this first: data.ts:485-501 is twelve unfiltered findMany() calls and the
# role filter runs in JS afterwards (data.ts:522-536). So the index inventory in
# P-43 is a strength and the whole-table read is the finding - they are not the
# same observation and must not be merged in the write-up.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
REPO='C:/Users/Shiva/Downloads/project/ApoorvaSetu'
J=$(mktemp -d)
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
PSQLQ() { docker exec -i apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -q -v ON_ERROR_STOP=1; }
hdr() { printf '\n================ %s ================\n' "$1"; }
snap() { curl -s -b "$J/$1" "$BASE/api/snapshot"; }
NODESNAP() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j;try{j=JSON.parse(s)}catch(e){console.log("  unparseable:",e.message,s.slice(0,80));return}const a=j.auditLogs||[];const filler=a.filter(x=>/^ZZZ/.test(x.action)||/^VOL-/.test(x.id)).length;console.log("  "+process.env.LBL+": bytes",(s.length/1024).toFixed(1)+"KB | auditLogs",(a.length)+" | synthetic in feed",filler,"| real in feed",a.length-filler,"| tables",Object.keys(j).length);});'; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
for e in superadmin aicteadmin regional institute evc; do login $e@apoorvasetu.demo "$J/$e"; done
echo "signed in: $(for f in superadmin aicteadmin regional institute evc; do printf '%s ' "$( [ -s "$J/$f" ] && echo ok || echo MISSING)"; done)"

hdr "P-42 the 200-row audit cap, and whether any other path can reach past it"
echo 'data.ts:498-499  audit.read ? auditLog.findMany({orderBy:{id:"desc"},take:200}) : []'
echo "rows in db: $(PSQL 'select count(*) from audit_logs;')"
echo '-- is there any GET for audit besides the snapshot? --'
for p in /api/audit /api/audit-logs /api/auditLogs /api/logs '/api/snapshot?table=auditLogs' '/api/snapshot?auditTake=1000'; do
  printf '  GET %-34s -> %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' -b "$J/superadmin" "$BASE$p")"
done
LBL=superadmin_before snap superadmin | NODESNAP
echo '-- the least-privileged persona writes 210 filler rows through POST /api/audit (requireUser only) --'
T0=$(date +%s)
for i in $(seq -w 1 210); do
  curl -s -o /dev/null -b "$J/evc" -H 'Content-Type: application/json' -X POST "$BASE/api/audit" \
    --data-binary "{\"action\":\"ZZZ PROBE BURY $i\",\"entityType\":\"System\",\"entityId\":\"PROBE-BURY-$i\",\"details\":\"filler row to test the 200-row audit cap\",\"source\":\"ui\"}"
done
echo "  210 POSTs in $(( $(date +%s) - T0 ))s; rows in db now: $(PSQL 'select count(*) from audit_logs;')"
LBL=superadmin_during snap superadmin | NODESNAP
echo "  real events in the database now: $(PSQL "select count(*) from audit_logs where action not like 'ZZZ PROBE BURY%';")"
echo "  newest real: $(PSQL "select id||' | '||action||' | '||\"timestamp\" from audit_logs where action not like 'ZZZ PROBE BURY%' order by id desc limit 1;")"
echo "  oldest real: $(PSQL "select id||' | '||action from audit_logs where action not like 'ZZZ PROBE BURY%' order by id asc limit 1;")"
snap superadmin | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=(JSON.parse(s).auditLogs||[]).filter(x=>!/^ZZZ/.test(x.action));console.log("  real actions still visible in the feed:",a.length);console.log("   ",a.map(x=>x.action).join(", ").slice(0,260));});'
PSQL "delete from audit_logs where action like 'ZZZ PROBE BURY%';" | sed 's/^/  cleanup: /'
LBL=superadmin_after snap superadmin | NODESNAP

hdr "P-43 index inventory (strength) then EXPLAIN of the twelve snapshot reads at seed volume"
PSQL "select '  '||tablename||' -> '||string_agg(indexname, ', ') from pg_indexes where schemaname='public' group by tablename order by tablename;" | grep -v '^  _prisma'
echo '-- plans, table by table --'
for q in 'select * from "applications"' 'select * from "institutes" order by "name" asc' 'select * from "evc_visits" order by "date" asc' 'select * from "compliance_records" order by "dueDate" asc' 'select * from "document_items"' 'select * from "notification_items" order by "timestamp" desc' 'select * from "undertakings"' 'select * from "system_alerts"' 'select * from "escalation_items"' 'select * from "users" order by "name" asc' 'select * from "role_permissions"' 'select * from "audit_logs" order by "id" desc limit 200'; do
  echo "  -- $q"
  PSQL "explain (analyze, buffers) $q;" | grep -E 'Seq Scan|Index Scan|Index Only|Bitmap|Limit|Sort|Execution Time' | sed 's/^/       /'
done
echo '-- the reads the auth and escalation paths make per request --'
PSQL "explain (analyze, buffers) select * from sessions where \"tokenHash\" = 'deadbeef';" | grep -E 'Scan|Execution' | sed 's/^/  sessions /'
PSQL "explain (analyze, buffers) select * from escalation_items where \"dedupeKey\" = 'x' and status <> 'Resolved' limit 1;" | grep -E 'Scan|Limit|Execution' | sed 's/^/  dedupe  /'
PSQL "explain (analyze, buffers) select * from system_alerts where \"dedupeKey\" = 'x';" | grep -E 'Scan|Execution' | sed 's/^/  alert   /'

hdr "P-43b the same plans with applications/documents/users/audit inflated ~200x"
docker exec -i apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -q -v ON_ERROR_STOP=1 <<SQL
create temp table ta as select a.* from applications a cross join generate_series(1,200) g;
update ta set id = 'VOL-' || md5(id || random()::text);
insert into applications select * from ta;
create temp table td as select d.* from document_items d cross join generate_series(1,200) g;
update td set id = 'VOL-' || md5(id || random()::text);
insert into document_items select * from td;
create temp table tu as select u.* from users u cross join generate_series(1,200) g;
update tu set id = 'VOL-' || md5(id || random()::text), email = 'VOL-' || md5(id || random()::text) || '@probe.invalid';
insert into users select * from tu;
create temp table tl as select l.* from audit_logs l cross join generate_series(1,60) g;
update tl set id = 'VOL-' || md5(id || random()::text);
insert into audit_logs select * from tl;
analyze;
SQL
echo "  rows now: $(PSQL "select 'apps='||count(*) from applications;") $(PSQL "select 'docs='||count(*) from document_items;") $(PSQL "select 'users='||count(*) from users;") $(PSQL "select 'audit='||count(*) from audit_logs;")"
for q in 'select * from "applications"' 'select * from "document_items"' 'select * from "users" order by "name" asc' 'select * from "audit_logs" order by "id" desc limit 200'; do
  echo "  -- $q"
  PSQL "explain (analyze, buffers) $q;" | grep -E 'Seq Scan|Index Scan|Index Only|Sort|Execution Time' | sed 's/^/       /'
done
echo '-- snapshot latency and size at that volume --'
for who in superadmin institute; do
  for i in 1 2 3 4 5; do
    S=$(date +%s%N); B=$(snap "$who" | wc -c); E=$(date +%s%N)
    printf '  %-11s run%s: %8s bytes  %4sms\n' "$who" "$i" "$B" "$(( (E-S)/1000000 ))"
  done
done
LBL=at_volume snap superadmin | NODESNAP
echo "  (200 of these feed rows are synthetic; how many real events survive: )"
snap superadmin | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).auditLogs||[];const real=a.filter(x=>!/^VOL-/.test(x.id));console.log("   feed:",a.length,"| real:",real.length,"| newest real:",real.length?real[0].action+" "+real[0].timestamp:"NONE");});'
echo '-- and the same for a single role query the list pages make --'
PSQL "explain (analyze, buffers) select * from applications where region = 'Northern';" | grep -E 'Scan|Execution' | sed 's/^/  region-filtered /'
echo "  note: the app never issues that WHERE - data.ts:486 reads the whole table and filterApplicationsForUser runs in JS"
echo '-- cleaning the volume rows --'
docker exec -i apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -q -v ON_ERROR_STOP=1 <<SQL
delete from applications where id like 'VOL-%';
delete from document_items where id like 'VOL-%';
delete from users where id like 'VOL-%';
delete from audit_logs where id like 'VOL-%';
analyze;
SQL
echo "  rows after: $(PSQL "select 'apps='||count(*) from applications;") $(PSQL "select 'docs='||count(*) from document_items;") $(PSQL "select 'users='||count(*) from users;") $(PSQL "select 'audit='||count(*) from audit_logs;")"
LBL=after_cleanup snap superadmin | NODESNAP

hdr "P-44 memory, load and a quiet soak with one live SSE listener"
echo '-- baseline --'
docker stats --no-stream --format '{{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}} ({{.MemPerc}}) | net {{.NetIO}}' apoorvasetu-audit-pg apoorvasetu-db-1 | sed 's/^/  /'
docker exec apoorvasetu-audit-pg sh -c 'cat /sys/fs/cgroup/memory.current 2>/dev/null' | sed 's/^/  container cgroup memory.current: /'
echo '-- 30 sequential superadmin snapshots --'
S=$(date +%s%N); for i in $(seq 1 30); do snap superadmin > /dev/null; done; E=$(date +%s%N)
echo "  30 snapshots in $(( (E-S)/1000000 ))ms -> mean $(( (E-S)/1000000/30 ))ms each"
echo '-- 4 waves of 5 concurrent snapshots --'
S=$(date +%s%N)
for w in 1 2 3 4; do for i in 1 2 3 4 5; do snap superadmin > /dev/null & done; wait; done
E=$(date +%s%N)
echo "  20 concurrent requests in $(( (E-S)/1000000 ))ms"
docker stats --no-stream --format '{{.Name}} | cpu {{.CPUPerc}} | mem {{.MemUsage}}' apoorvasetu-audit-pg apoorvasetu-db-1 | sed 's/^/  post-load: /'
echo '-- hold an SSE stream open, add 20 sessions, then 240s of silence --'
SSE="$J/sse.txt"; : > "$SSE"
curl -s -N -b "$J/superadmin" "$BASE/api/events" > "$SSE" 2>/dev/null &
echo $! > "$J/sse.pid"
sleep 3
echo "  stream lines so far: $(wc -l < "$SSE")"
for i in $(seq 1 20); do login superadmin@apoorvasetu.demo "$J/re$i"; done
echo "  sessions in db after 20 more logins: $(PSQL 'select count(*) from sessions;')"
docker stats --no-stream --format '{{.Name}} | mem {{.MemUsage}}' apoorvasetu-audit-pg | sed 's/^/  soak t+0s:   /'
for m in 1 2 3 4; do
  sleep 60
  printf '  soak t+%ss: %s | sse lines %s | db %s\n' "$((m*60))" "$(docker stats --no-stream --format '{{.MemUsage}}' apoorvasetu-audit-pg)" "$(wc -l < "$SSE")" "$(docker stats --no-stream --format '{{.MemUsage}}' apoorvasetu-db-1)"
done
echo "  events on the held stream: $(grep -c '^event:' "$SSE") total, $(grep -c 'event: change' "$SSE") change"
head -6 "$SSE" | sed 's/^/    /'
kill "$(cat "$J/sse.pid")" 2>/dev/null
echo '-- session housekeeping --'
PSQL "select '  sessions total='||count(*)::text||' | expired='||count(*) filter (where \"expiresAt\" < now())::text||' | distinct users='||count(distinct \"userId\")::text||' | oldest expiry='||min(\"expiresAt\")::text||' | newest='||max(\"expiresAt\")::text from sessions;"
grep -rn 'deleteMany\|expiresAt' "$REPO/server/db.ts" "$REPO/server/session.ts" "$REPO/server/index.ts" 2>/dev/null | grep -iE 'delete|prune|reap|clean' | sed 's/^/  /'
echo "  (any DELETE FROM sessions anywhere in the server:) $(grep -rn 'session.deleteMany\|deleteMany' "$REPO/server" --include=*.ts | wc -l) sites"

hdr "P-45 what each persona snapshot carries now"
for who in institute evc regional aicteadmin superadmin; do
  LBL=$who snap "$who" | WHO=$who node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const t=Object.keys(j).filter(k=>Array.isArray(j[k])).map(k=>k+":"+(j[k]||[]).length).join(" ");console.log("  "+process.env.WHO+":",(s.length/1024).toFixed(1)+"KB",t);});'
done

hdr "P-96(round7) cleanup: every artefact this Pass wrote, listed as it is removed"
PSQL "select '  probe users : '||coalesce(string_agg(id||' '||email,' | '),'NONE') from users where id in ('USR-MVY4M8L8-190E','USR-MVY4M9CX-27CB');"
PSQL "delete from users where id in ('USR-MVY4M8L8-190E','USR-MVY4M9CX-27CB');" | sed 's/^/  users: /'
PSQL "delete from sessions where \"userId\" in ('USR-MVY4M8L8-190E','USR-MVY4M9CX-27CB');" | sed 's/^/  probe sessions: /'
PSQL "select '  probe alerts: '||coalesce(string_agg(id,' | '),'NONE') from system_alerts where id like 'ALRT-PROBE%';"
PSQL "delete from system_alerts where id like 'ALRT-PROBE%';" | sed 's/^/  alerts: /'
PSQL "select '  probe notifs: '||coalesce(string_agg(id,' | '),'NONE') from notification_items where id like 'NOTIF-PROBE%';"
PSQL "delete from notification_items where id like 'NOTIF-PROBE%';" | sed 's/^/  notifs: /'
PSQL "select '  probe docs  : '||coalesce(string_agg(id,' | '),'NONE') from document_items where id like 'DOC-PROBE%';"
PSQL "delete from document_items where id like 'DOC-PROBE%';" | sed 's/^/  docs: /'
PSQL "select '  file rows   : '||coalesce(string_agg(key,' | '),'NONE') from file_objects;"
PSQL "delete from file_objects where key like '%probe-fire-noc%';" | sed 's/^/  file_objects: /'
docker exec apoorvasetu-audit-pg sh -c 'rm -rf /app/data/uploads/u-USR-INSTITUTE-ADMIN; ls -la /app/data/uploads' 2>&1 | sed 's/^/  disk: /'
echo '-- audit rows this Pass wrote: forged machine sources, the SSE trigger, the client-authored reject --'
PSQL "select '  forged/probe audit: '||id||' | '||action||' | src='||coalesce(source,'-')||' | '||coalesce(details,'') from audit_logs where action in ('APPLICATION_APPROVED','EVC_REPORT_SUBMITTED_BY_AUTOMATION','PROBE_SSE_TRIGGER','REJECT_DOCUMENT') or action like 'ZZZ%' order by id;"
PSQL "delete from audit_logs where action in ('APPLICATION_APPROVED','EVC_REPORT_SUBMITTED_BY_AUTOMATION','PROBE_SSE_TRIGGER','REJECT_DOCUMENT') or action like 'ZZZ%' or \"entityId\" like 'PROBE-BURY%';" | sed 's/^/  removed: /'
echo '-- final state versus the seed --'
PSQL "select '  counts : apps='||(select count(*) from applications)::text||' docs='||(select count(*) from document_items)::text||' und='||(select count(*) from undertakings)::text||' cmp='||(select count(*) from compliance_records)::text||' evc='||(select count(*) from evc_visits)::text||' alerts='||(select count(*) from system_alerts)::text||' notifs='||(select count(*) from notification_items)::text||' escl='||(select count(*) from escalation_items)::text||' users='||(select count(*) from users)::text||' files='||(select count(*) from file_objects)::text||' audit='||(select count(*) from audit_logs)::text;"
PSQL "select '  docs(N) : '||id||'|'||status||'|'||coalesce(\"verifiedBy\",'NULL') from document_items where region='Northern' order by id;"
PSQL "select '  apps    : '||id||'|'||stage||'|'||status||'|'||decision||' v'||version from applications order by id;"
PSQL "select '  evc     : '||id||'|'||status||'|submitted='||\"reportSubmitted\"::text||'|'||coalesce(\"assignedCommittee\",'-') from evc_visits order by id;"
PSQL "select '  und     : '||id||'|'||status from undertakings order by id;"
PSQL "select '  cmp     : '||id||'|'||status from compliance_records order by id;"
PSQL "select '  audit sources : '||coalesce(string_agg(s,', '),'NONE') from (select distinct coalesce(source,'-') as s from audit_logs) t;"
PSQL "select '  audit actions : '||action||' x'||c from (select action, count(*) c from audit_logs group by action) t order by action;"
PSQL "select '  notifs  : '||id||'|'||title||'|read='||\"read\"::text from notification_items order by id;"
rm -rf "$J"
echo "ROUND 7 COMPLETE $(date -u +%FT%TZ)"
