#!/bin/bash
# Wrapper to run seed-50-songs.mjs with env loaded from backend/.env
# but DATABASE_URL overridden to the Railway production public proxy URL
# (because backend/.env still points at a stale Neon DB).
set -euo pipefail
cd "$(dirname "$0")/.."

# Load backend/.env
set -a
# shellcheck disable=SC1091
. ./.env
set +a

# Override DATABASE_URL with the Railway production DB
TOKEN=$(node -e 'const c=require("/Users/zan/.railway/config.json");process.stdout.write(c.user?.token||c.token||"")')
DB_PUBLIC=$(curl -sS -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query($p:String!,$e:String!,$s:String){ variables(projectId:$p,environmentId:$e,serviceId:$s) }","variables":{"p":"5f848dc5-9838-466b-9e48-a482319a04b5","e":"efcb223c-0e59-47c2-9cb2-ab37bae6d8a5","s":"97fbb627-8063-4a0e-9823-e9577c449534"}}' \
  | node -e 'let buf=""; process.stdin.on("data",c=>buf+=c); process.stdin.on("end",()=>{ const r=JSON.parse(buf); process.stdout.write(r.data.variables.DATABASE_PUBLIC_URL||""); });')

if [ -z "$DB_PUBLIC" ]; then
  echo "FATAL: could not fetch Railway DATABASE_PUBLIC_URL" >&2
  exit 1
fi

# Pull Cloudinary creds from Railway api service (not in backend/.env)
API_VARS=$(curl -sS -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query($p:String!,$e:String!,$s:String){ variables(projectId:$p,environmentId:$e,serviceId:$s) }","variables":{"p":"5f848dc5-9838-466b-9e48-a482319a04b5","e":"efcb223c-0e59-47c2-9cb2-ab37bae6d8a5","s":"30023413-7681-4746-b846-5bcad120d094"}}')
CLOUDINARY_CLOUD_NAME=$(echo "$API_VARS" | node -e 'let b="";process.stdin.on("data",c=>b+=c);process.stdin.on("end",()=>process.stdout.write(JSON.parse(b).data.variables.CLOUDINARY_CLOUD_NAME||""))')
CLOUDINARY_API_KEY=$(echo "$API_VARS" | node -e 'let b="";process.stdin.on("data",c=>b+=c);process.stdin.on("end",()=>process.stdout.write(JSON.parse(b).data.variables.CLOUDINARY_API_KEY||""))')
CLOUDINARY_API_SECRET=$(echo "$API_VARS" | node -e 'let b="";process.stdin.on("data",c=>b+=c);process.stdin.on("end",()=>process.stdout.write(JSON.parse(b).data.variables.CLOUDINARY_API_SECRET||""))')
export CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET

if [ -z "$CLOUDINARY_API_KEY" ]; then
  echo "FATAL: could not fetch Cloudinary credentials from Railway" >&2
  exit 1
fi

echo "Env ready (db=$(echo "$DB_PUBLIC" | head -c 30)..., cloudinary=$CLOUDINARY_CLOUD_NAME)"
DATABASE_URL="$DB_PUBLIC" node scripts/seed-50-songs.mjs
