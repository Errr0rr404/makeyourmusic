#!/bin/bash
# Wrapper for audit-demo-tracks.mjs — same env loading pattern.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
. ./.env
set +a

TOKEN=$(node -e 'const c=require("/Users/zan/.railway/config.json");process.stdout.write(c.user?.token||c.token||"")')
DB_PUBLIC=$(curl -sS -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query($p:String!,$e:String!,$s:String){ variables(projectId:$p,environmentId:$e,serviceId:$s) }","variables":{"p":"5f848dc5-9838-466b-9e48-a482319a04b5","e":"efcb223c-0e59-47c2-9cb2-ab37bae6d8a5","s":"97fbb627-8063-4a0e-9823-e9577c449534"}}' \
  | node -e 'let buf=""; process.stdin.on("data",c=>buf+=c); process.stdin.on("end",()=>{ const r=JSON.parse(buf); process.stdout.write(r.data.variables.DATABASE_PUBLIC_URL||""); });')

DATABASE_URL="$DB_PUBLIC" node scripts/audit-demo-tracks.mjs
