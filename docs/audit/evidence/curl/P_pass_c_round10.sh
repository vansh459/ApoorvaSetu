#!/usr/bin/env bash
# Pass C, round 10 — one probe, chosen so the write changes nothing.
#   P-52 does PUT /api/roles/:role/permissions audit itself? admin.ts:252-276 has
#        no writeAudit call, while :140, :199 and :232 (create/update/toggle) all
#        do. The route also rewrites every user row of that role (:273), so the
#        blast radius is the whole role. The body sent here is the role's
#        CURRENT list, so the ACL is unchanged either way - this proves the
#        absence of a trail, not a change in authority.
set +e
BASE=http://localhost:8081
PW='Apoorva@2026'
J=$(mktemp -d -p "$(pwd)")
PSQL() { docker exec apoorvasetu-db-1 psql -U apoorvasetu -d apoorvasetu -P pager=off -tAc "$1"; }
login() { curl -s -o /dev/null -c "$2" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}" "$BASE/api/auth/login"; }
login superadmin@apoorvasetu.demo "$J/superadmin"

hdr() { printf '\n================ %s ================\n' "$1"; }
hdr "P-52 a role-permission rewrite, with the role's own current list"
ROLE=EVC_MEMBER
BEFORE_MATRIX=$(PSQL "select permissions::text from role_permissions where role='$ROLE';")
BEFORE_USERS=$(PSQL "select count(*) from users where role='$ROLE';")
BEFORE_USER_PERMS=$(PSQL "select id||'='||permissions::text from users where role='$ROLE' order by id;" | tr '\n' ' ')
BEFORE_AUDIT=$(PSQL "select count(*) from audit_logs;")
echo "   role_permissions[$ROLE] before: $BEFORE_MATRIX"
echo "   users of that role            : $BEFORE_USERS   ($BEFORE_USER_PERMS)"
echo "   audit rows before             : $BEFORE_AUDIT"
LIST=$(PSQL "select to_jsonb(permissions)::text from role_permissions where role='$ROLE';" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s.replace(/\r?\n/,""));console.log(JSON.stringify({permissions:j}));});')
echo "   body sent (identical to the stored list): $LIST"
CODE=$(curl -s -o "$J/resp.json" -w '%{http_code}' -b "$J/superadmin" -H 'Content-Type: application/json' -X PUT "$BASE/api/roles/$ROLE/permissions" --data-binary "$LIST")
echo "   -> HTTP $CODE  $(head -c 160 "$J/resp.json")"
AFTER_AUDIT=$(PSQL "select count(*) from audit_logs;")
AFTER_MATRIX=$(PSQL "select permissions::text from role_permissions where role='$ROLE';")
AFTER_USER_PERMS=$(PSQL "select id||'='||permissions::text from users where role='$ROLE' order by id;" | tr '\n' ' ')
echo "   audit rows after              : $AFTER_AUDIT   (delta $(( AFTER_AUDIT - BEFORE_AUDIT )))"
echo "   matrix unchanged              : $([ "$BEFORE_MATRIX" = "$AFTER_MATRIX" ] && echo YES || echo NO)"
echo "   user permission arrays same   : $([ "$BEFORE_USER_PERMS" = "$AFTER_USER_PERMS" ] && echo YES || echo NO)"
echo "   any audit row naming this action? $(PSQL "select coalesce(string_agg(id,','),'NONE') from audit_logs where action like '%ROLE%' or action like '%PERMISSION%';")"
echo '-- contrast: the three user routes in the same file DO audit --'
grep -n "writeAudit(" server/routes/admin.ts | sed 's/^/     admin.ts:/'
echo '-- and the role route in full, to show there is no call between 252 and 277 --'
sed -n '252,277p' server/routes/admin.ts | sed 's/^/     /'
echo '-- what the audit screen would have to say about it --'
PSQL "select '  most recent audit row: '||id||' | '||action||' | '||\"timestamp\" from audit_logs order by id desc limit 1;"

hdr "P-98 residue after round 10"
echo "   audit rows: $AFTER_AUDIT | matrix and users verified unchanged above"
echo "   USER_* rows written by this round: 0 (no user route was called)"
rm -rf "$J"
echo "ROUND 10 COMPLETE $(date -u +%FT%TZ)"
