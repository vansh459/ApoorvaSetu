#!/usr/bin/env bash
# Pass C, round 9b — the append-only claim (L3-05) tested against the database
# that actually runs, inside a transaction that is rolled back.
#   P-50  can an audit row be UPDATEd or DELETEd in the Prisma/Postgres schema?
#         No INSERT/UPDATE trigger exists (evidence/raw/S17_audit_chain.txt), so
#         the answer must be yes; this shows the statement executing and the row
#         changing under the same connection, then ROLLBACK restores it.
#   P-50b the same three probes against the Supabase migration, read statically,
#         because that is the path the append-only sentence was written for.
set +e
DB=apoorvasetu-db-1
PSQL()  { docker exec $DB psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
hdr()   { printf '\n================ %s ================\n' "$1"; }

hdr "P-50 UPDATE and DELETE on the running audit_logs table, rolled back"
TARGET=$(PSQL "select id from audit_logs order by id desc limit 1;")
echo "   target row: $TARGET"
echo "   before    : $(PSQL "select action||' | '||coalesce(details,'-') from audit_logs where id='$TARGET';")"
echo "   triggers on audit_logs: $(PSQL "select coalesce(string_agg(tgname,' '),'NONE - no INSERT/UPDATE/DELETE trigger exists') from pg_trigger where tgrelid='audit_logs'::regclass and not tgisinternal;")"
echo "   rules     : $(PSQL "select coalesce(string_agg(rulename,' '),'NONE') from pg_rules where tablename='audit_logs';")"
echo "   grants to the app role: $(PSQL "select privilege_type from information_schema.role_table_grants where table_name='audit_logs' and grantee='apoorvasetu' order by 1;" | tr '\n' ' ')"
docker exec -i $DB psql -U apoorvasetu -d apoorvasetu -q -v ON_ERROR_STOP=0 <<SQL
begin;
\echo '  -- rewriting the history of a regulated decision, as the table owner:'
update audit_logs set details = 'REWRITTEN BY THIS PROBE: the officer never said this',
                      action  = 'APPLICATION_REJECTED',
                      source  = 'cron'
  where id = '$TARGET';
\echo '  -- the row the audit screen would now show:'
select id||' | '||action||' | src='||coalesce(source,'-')||' | '||details from audit_logs where id = '$TARGET';
\echo '  -- and deleting it outright:'
delete from audit_logs where id = '$TARGET';
select '  rows after the DELETE inside the transaction: '||count(*)::text from audit_logs;
rollback;
SQL
echo "   after ROLLBACK: $(PSQL "select action||' | '||coalesce(details,'-') from audit_logs where id='$TARGET';")"
echo "   rows now      : $(PSQL 'select count(*) from audit_logs')"
echo "   is the target row still there: $(PSQL "select count(*) from audit_logs where id='$TARGET';") (1 = the rollback held, nothing persisted)"

hdr "P-50b the guard that exists, and where it lives"
echo "   Prisma migrations - create trigger anywhere (case-insensitive):"
P=$(grep -rni "create trigger" prisma/migrations 2>/dev/null); [ -n "$P" ] && printf '%s\n' "$P" | sed 's/^/     /' || echo "     none - the running schema has no trigger of any kind"
echo "   Supabase migration - the append-only guard (NOT the running schema):"
grep -in "create trigger\|raise exception\|revoke" supabase/migrations/20261101090000_production_hardening.sql 2>/dev/null | sed -n '1,14p' | sed 's/^/     /'
echo "   hash-chain columns anywhere in the schema:"
H=$(grep -in "prevhash\|hashchain\|chainindex\|rowhash\|digest(" prisma/schema.prisma supabase/migrations/*.sql 2>/dev/null); [ -n "$H" ] && printf '%s\n' "$H" | sed 's/^/     /' || echo "     none - nothing can detect silent rewriting after the fact"

hdr "P-51 residue check"
echo "   audit rows: $(PSQL 'select count(*) from audit_logs') | probe actions surviving: $(PSQL "select coalesce(string_agg(id,','),'NONE') from audit_logs where details like '%THIS PROBE%' or action='APPLICATION_REJECTED';")"
echo "ROUND 9B COMPLETE $(date -u +%FT%TZ)"
