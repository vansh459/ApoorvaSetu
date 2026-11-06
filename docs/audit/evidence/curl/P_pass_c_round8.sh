#!/usr/bin/env bash
# Pass C, round 8 — prove the database is back at its seed state, field by field.
# Rounds 1-7 wrote probe rows and moved seeded rows around; those restores were
# written by hand from the transcripts. This round does not probe the API: it
# imports the app's OWN seed module inside the container, reads the live rows
# with psql, and compares only the fields the seed actually specifies.
#   report only :  bash P_pass_c_round8.sh
#   then restore:  APPLY=1 bash P_pass_c_round8.sh
# Restores are single-row UPDATEs pinned to id = <seed id> for the columns that
# differ; nothing is deleted and no table is truncated.
set +e
# NOTE: do not re-add MSYS2_ARG_CONV_EXCL='*' here. Rounds 4-7 need it for the
# -e UPLOAD_DIR=/app/... argument at container creation; here it would stop Git
# Bash from converting the temp-dir argument passed to the native node binary,
# and node then resolves it against the drive root (C:\c\Users\...).
# The comparison script is written as .cjs because the repo package.json declares
# "type": "module", so a .js file next to it is treated as ESM and require() fails.
APP=apoorvasetu-audit-pg
DB=apoorvasetu-db-1
# mktemp inside the working directory: Git Bash /tmp and the native Windows node
# binary disagree about where /tmp is, so a script written here would not be
# found by node when the temp dir is /tmp.
T=$(mktemp -d -p "$(pwd)")
APPLY=${APPLY:-0}
SKIP_FIELDS='applications:stage applications:stageEnteredAt applications:stageDueAt applications:lastUpdated applications:timeline'
PAIRS='applications:applications evc_visits:evcVisits compliance_records:complianceRecords document_items:documents undertakings:undertakings notification_items:notifications'

echo "seed day in the container: $(docker exec "$APP" date -u +%F) | live DB day: $(docker exec "$DB" psql -U apoorvasetu -d apoorvasetu -tAc 'select current_date;')"

docker exec "$APP" node --experimental-strip-types --input-type=module -e '
const m = await import("/app/src/data/initialData.ts");
console.log(JSON.stringify({
  applications: m.initialApplications,
  evcVisits: m.initialEVCVisits,
  complianceRecords: m.initialComplianceRecords,
  documents: m.initialDocuments,
  undertakings: m.initialUndertakings,
  notifications: m.initialNotifications
}));
' > "$T/seed.json" 2> "$T/seed.err"
if [ ! -s "$T/seed.json" ]; then echo 'seed import failed:'; cat "$T/seed.err"; exit 1; fi
echo "seed.json bytes: $(wc -c < "$T/seed.json")"

PSQL() { docker exec "$DB" psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
for tb in applications evc_visits compliance_records document_items undertakings notification_items; do
  PSQL "select json_agg(row_to_json(t)) from (select * from $tb) t;" > "$T/$tb.json"
done

cat > "$T/diff.cjs" <<'JS'
const fs = require('fs');
const [seedPath, pairsArg, sqlPath, dir] = process.argv.slice(2);
const apply = process.env.APPLY === '1';
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const norm = (v) => {
  if (v === undefined) return undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try { return norm(JSON.parse(s)); } catch { return s; }
    }
    return v;
  }
  if (v === null) return null;
  if (Array.isArray(v)) return v.map(norm);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = norm(v[k]);
    return o;
  }
  return v;
};
const eq = (a, b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
// Fields deliberately left in place: AICTE/2026/12875 was advanced by a REAL
// audited call to POST /api/applications/:id/transitions (probe P-04a), so the
// stage, its dates and the timeline entry are legitimate demo state with a
// matching audit row. Rolling them back would leave an audit trail describing a
// transition whose effect the database no longer shows.
const SKIP = new Set((process.env.SKIP || '').split(' ').filter(Boolean));
// seedStamp(offsetDays) = new Date() + offset, so a re-import at a different
// time of day produces different timestamps for the SAME seeded day. Those are
// artefacts of the seed helper, not drift written by this Pass.
const isStamp = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
const sameSeedDay = (a, b) => isStamp(a) && isStamp(b) && a.slice(0, 10) === b.slice(0, 10);
const quote = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const literal = (v) =>
  v === undefined || v === null ? 'NULL'
  : typeof v === 'object' ? quote(JSON.stringify(v))
  : typeof v === 'boolean' ? (v ? 'true' : 'false')
  : quote(v);
let totalDiff = 0;
const sql = [];
for (const pair of pairsArg.split(' ')) {
  const [table, key] = pair.split(':');
  const raw = fs.readFileSync(`${dir}/${table}.json`, 'utf8').trim();
  const rows = raw === '' ? [] : JSON.parse(raw);
  const byId = {};
  for (const r of rows) byId[r.id] = r;
  const want = seed[key] || [];
  const diffs = [];
  const kept = [];
  let artefacts = 0;
  for (const s of want) {
    const d = byId[s.id];
    if (!d) { diffs.push([s.id, '__MISSING_ROW__', null]); continue; }
    for (const f of Object.keys(s)) {
      if (s[f] === undefined) continue;
      if (eq(s[f], d[f])) continue;
      if (sameSeedDay(s[f], d[f])) { artefacts++; continue; }
      if (SKIP.has(`${table}:${f}`)) { kept.push(`${s.id}.${f} seed=${JSON.stringify(norm(s[f])).slice(0, 60)} db=${JSON.stringify(norm(d[f])).slice(0, 60)}`); continue; }
      diffs.push([s.id, f, { seed: s[f], db: d[f] }]);
    }
  }
  totalDiff += diffs.length;
  if (artefacts) console.log(`\n== ${table} (${want.length} seeded rows compared, ${rows.length} live rows) ==   [${artefacts} seed-time-of-day artefacts ignored]`);
  else console.log(`\n== ${table} (${want.length} seeded rows compared, ${rows.length} live rows) ==`);
  if (!diffs.length) console.log('   identical to the seed on every field the seed specifies');
  for (const [id, f, v] of diffs) {
    if (f === '__MISSING_ROW__') { console.log(`   ${id}: ROW ABSENT from the table`); continue; }
    console.log(`   ${id}.${f}:\n      seed=${JSON.stringify(norm(v.seed)).slice(0, 120)}\n      db  =${JSON.stringify(norm(v.db)).slice(0, 120)}`);
    sql.push(`update ${table} set "${f}" = ${literal(v.seed)} where id = ${quote(id)};`);
  }
  for (const k of kept) console.log(`   left in place (real audited transition): ${k}`);
}
fs.writeFileSync(sqlPath, sql.join('\n') + '\n');
console.log(`\ntotal field differences: ${totalDiff}  (restore statements written: ${sql.length})`);
JS

SKIP="$SKIP_FIELDS" APPLY=$APPLY node "$T/diff.cjs" "$T/seed.json" "$PAIRS" "$T/restores.sql" "$T"

echo
echo '-- restore statements --'
cat "$T/restores.sql"
if [ "$APPLY" = "1" ]; then
  echo '-- applying, then re-running the comparison --'
  docker exec -i "$DB" psql -U apoorvasetu -d apoorvasetu -q -v ON_ERROR_STOP=1 < "$T/restores.sql"
  for tb in applications evc_visits compliance_records document_items undertakings notification_items; do
    PSQL "select json_agg(row_to_json(t)) from (select * from $tb) t;" > "$T/$tb.json"
  done
  SKIP="$SKIP_FIELDS" APPLY=0 node "$T/diff.cjs" "$T/seed.json" "$PAIRS" "$T/restores2.sql" "$T"
  echo '-- rows this Pass left that are NOT in the seed (probe rows) --'
  PSQL "select '  live ids not in the seed: '||coalesce(string_agg(id,','),'NONE') from applications where id not like 'AICTE/%';"
else
  echo '-- APPLY=1 not set: nothing was written --'
fi

echo '-- remaining Pass C residue anywhere: --'
PSQL "select '  probe ids : '||coalesce(string_agg(t,' | '),'NONE') from (select id||'@'||'document_items' as t from document_items where id like '%PROBE%' union all select id||'@compliance_records' from compliance_records where id like '%PROBE%' union all select id||'@undertakings' from undertakings where id like '%PROBE%' union all select id||'@evc_visits' from evc_visits where id like '%PROBE%' union all select id||'@notification_items' from notification_items where id like '%PROBE%' union all select id||'@system_alerts' from system_alerts where id like '%PROBE%' union all select id||'@escalation_items' from escalation_items where id like '%PROBE%' union all select id||'@users' from users where id like '%PROBE%' or email like 'probe.%' union all select key||'@file_objects' from file_objects) s;"
PSQL "select '  audit     : '||c::text||' rows | sources: '||coalesce(s,'-') from (select count(*) as c, string_agg(distinct coalesce(source,'-'),' ') as s from audit_logs) x;"
PSQL "select '  audit actions: '||string_agg(a,', ') from (select action||' x'||count(*)::text as a from audit_logs group by action order by action) t;"
PSQL "select '  users     : '||coalesce(string_agg(id,',' ),'')||'  count='||count(*) from users;"
docker exec "$APP" sh -c 'find /app/data/uploads -type f 2>/dev/null | wc -l' | sed 's/^/  files on disk in the volume: /'
rm -rf "$T"
echo "ROUND 8 COMPLETE $(date -u +%FT%TZ)"
