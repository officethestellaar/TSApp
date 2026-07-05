#!/bin/bash

# =====================================================
# Stellaar V2.0 - Supabase Cloud Wake-Up Protocol
# =====================================================
# Supabase automatically pauses free-tier databases after
# 7 days of inactivity. This script detects if the DB is
# paused, uses the Management API to wake it up, waits for
# it to boot, and then launches the Stellaar system.

PROJECT_REF="ljtqknffczbtfymeyovn"

set -e

echo "====================================================="
echo "☁️ Supabase Cloud - Wake-Up & Recovery Protocol"
echo "====================================================="
echo ""

echo "🔍 Checking current database status..."
cd backend

# Temporarily disable exit on error to check connection safely
set +e
npx prisma db pull --print 2>/dev/null > /dev/null
DB_STATUS=$?
set -e

if [ $DB_STATUS -eq 0 ]; then
  echo "✅ Database is already active and responding."
  cd ..
  echo "🚀 Starting Stellaar System normally..."
  ./start.sh
  exit 0
else
  echo "⚠️ Cloud Registry is unreachable. It is likely paused due to inactivity."
fi
cd ..

echo ""
echo "To autonomously wake up the database, you need your Supabase Personal Access Token."
echo "You can generate one here: https://supabase.com/dashboard/account/tokens"
echo "(Or you can manually click 'Restore' at https://supabase.com/dashboard/project/$PROJECT_REF)"
echo ""
echo -n "🔑 Enter your Supabase Access Token (or press Enter to abort): "
read -s SUPA_TOKEN
echo ""

if [ -z "$SUPA_TOKEN" ]; then
  echo "❌ No token provided. Aborting Wake-Up Protocol."
  exit 1
fi

echo ""
echo "📡 Transmitting wake-up signal to Supabase Cloud (Project: $PROJECT_REF)..."

# Call the Supabase Management API to restore/unpause the project
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/restore" \
  -H "Authorization: Bearer $SUPA_TOKEN" \
  -H "Content-Type: application/json")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
  echo "⏳ Signal accepted! Supabase is spinning up the servers."
else
  echo "⚠️ API returned status $HTTP_STATUS. The database might already be booting, or the token is invalid."
fi

echo "🔄 Polling database until it responds (this usually takes 1 to 3 minutes)..."

MAX_RETRIES=30
COUNT=0

cd backend
set +e
while [ $COUNT -lt $MAX_RETRIES ]; do
  if npx prisma db pull --print 2>/dev/null > /dev/null; then
    echo ""
    echo "✅ Supabase is online and fully restored!"
    cd ..
    
    echo "🚀 Launching Stellaar System..."
    ./start.sh
    exit 0
  fi
  
  echo -n "⬛"
  sleep 10
  COUNT=$((COUNT+1))
done
set -e

echo ""
echo "❌ Timeout reached. The database took too long to wake up."
echo "Please check the status manually on your Supabase dashboard."
exit 1
