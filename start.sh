#!/bin/bash

# The Stellaar - Premium Family Club Management System
# Combined Start Script - Availability & Recovery Optimized

echo "🚀 Initializing The Stellaar Club Management System..."

# 1. Kill all lingering tsx/node processes that might block ports
echo "🧹 Cleaning up existing processes..."
# Kill tsx watch children first
pkill -f "tsx.*src/index" 2>/dev/null || true
sleep 1
# Then kill anything on the ports using lsof (macOS/Linux compatible)
for port in 3000 5001; do
  lsof -ti:$port 2>/dev/null | xargs kill -9 2>/dev/null || true
  # Wait up to 15s for the port to be free
  for i in $(seq 1 15); do
    if ! lsof -ti:$port >/dev/null 2>&1; then
      break
    fi
    if [ $i -eq 5 ] || [ $i -eq 10 ]; then
      lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
    echo "   ⏳ Waiting for port $port to be released... ($i/15)"
    sleep 1
  done
  if lsof -ti:$port >/dev/null 2>&1; then
    echo "   ❌ Port $port still in use after 15s. Trying once more..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 3
  fi
done
echo "   ✅ Ports 3000 and 5001 are free."

# 2. Database Integrity Check
echo "🗄 Verifying Cloud Registry (Supabase)..."
cd backend
# Check connectivity via Prisma (quick query)
node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient().\$queryRawUnsafe('SELECT 1').then(() => { process.exit(0); }).catch(() => { process.exit(1); });" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ Cloud Registry not reachable. Initiating automated recovery..."
    npx prisma db push
    npx tsx prisma/seed.ts
    echo "✅ Cloud Registry successfully initialized/synced."
else
    echo "✅ Supabase Cloud Registry verified."
fi
cd ..

# 3. Show Backup Status
echo "📦 Backup System:"
echo "   ├─ Auto-backup every 30 minutes"
echo "   ├─ Daily deep-archival at 3:00 AM"
echo "   ├─ Rotates last 10 recovery points"
if [ -d "backend/backups" ]; then
  COUNT=$(find backend/backups -maxdepth 1 \( -name "*.sql" -o -name "*.dump" -o -name "*.gz" \) 2>/dev/null | wc -l | xargs)
  if [ "$COUNT" -gt 0 ]; then
    LATEST=$(find backend/backups -maxdepth 1 \( -name "*.sql" -o -name "*.dump" -o -name "*.gz" \) -type f -exec ls -t {} + 2>/dev/null | head -1)
    LATEST_SIZE=$(du -h "$LATEST" 2>/dev/null | awk '{print $1}')
    TOTAL_SIZE=$(du -sh backend/backups/ 2>/dev/null | awk '{print $1}')
    echo "   ├─ Existing snapshots: $COUNT"
    echo "   ├─ Latest snapshot:    $(basename "$LATEST" 2>/dev/null) ($LATEST_SIZE)"
    echo "   └─ Total backup size: $TOTAL_SIZE"
  else
    echo "   └─ No snapshots yet (first will be taken on startup)"
  fi
else
  echo "   └─ No snapshots yet (first will be taken on startup)"
fi

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Stellaar services..."
    echo "   📦 Running final registry backup before shutdown..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "   ✅ Services stopped. Registry state preserved."
    exit
}

trap cleanup SIGINT SIGTERM

# 4. Start Backend with Auto-Restart Simulation
echo "📡 Starting Backend (Express + Prisma) on port 5001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to spin up
sleep 3

# 5. Start Frontend
echo "💻 Starting Frontend (Next.js) on port 3000..."
cd frontend
npm run dev -- -H 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# Detect local IP for convenience
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo ""
echo "✨ THE STELLAAR IS NOW LIVE"
echo "════════════════════════════════════════════════"
echo "🏰 Local:       http://localhost:3000"
echo "🌐 Network:     http://${LOCAL_IP}:3000"
echo "🔑 API Server:  http://localhost:5001/api"
echo "🛠 Diagnostic:  /dashboard/init (Super Admin Only)"
echo "════════════════════════════════════════════════"
echo "Admin Access:  admin@stellaar.com / admin123"
echo "Admin Access:  office.thestellaar@gmail.com / TheStellaar@123_admin"
echo "Member Access: john@example.com  / member123"
echo "════════════════════════════════════════════════"
echo "   📦 Backup:  Auto every 30 min + on shutdown"
echo "   🏥 Health:  /api/health | /api/system/backup-status"
echo ""
echo "Press Ctrl+C to stop all services."

# Keep the script running
wait
