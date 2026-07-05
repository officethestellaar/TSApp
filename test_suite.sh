#!/bin/bash

# =====================================================
# Stellaar V2.0 - Comprehensive System Test Suite
# =====================================================
# This script executes all necessary checks to verify
# system integrity, type safety, production readiness,
# and multi-vector traffic resilience.

# Exit immediately if a command exits with a non-zero status
set -e 

echo "====================================================="
echo "🚀 Initiating Full System Test Suite - Stellaar V2.0 "
echo "====================================================="

echo ""
echo "[1/8] 🗄️ Validating Database Schemas (Cloud & Local)..."
cd backend
npx prisma validate
npx prisma validate --schema=prisma/local.prisma
cd ..
echo "✅ Schemas Validated."

echo ""
echo "[2/8] ⚙️ Running Backend Automated Tests..."
cd backend
npm run test
cd ..
echo "✅ Backend Tests Passed."

echo ""
echo "[3/8] 🖥️ Running Frontend Automated Tests..."
cd frontend
npm run test
cd ..
echo "✅ Frontend Tests Passed."

echo ""
echo "[4/8] 🛡️ Verifying Backend Type Safety..."
cd backend
npx tsc --noEmit
cd ..
echo "✅ Backend Types Verified."

echo ""
echo "[5/8] 🧹 Running Frontend Linter (Strict Mode)..."
cd frontend
npm run lint
cd ..
echo "✅ Frontend Linting Passed."

echo ""
echo "[6/8] 📦 Simulating Production Build..."
cd frontend
npm run build
cd ..
echo "✅ Production Build Successful."

echo ""
echo "[7/8] 🗄️ Running Database Request Integrity Test..."
# FORCE RESTART backend to ensure fresh rate limits and clean state
echo "   Restarting backend for fresh test environment..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
SERVER_STARTED_BY_US=1
cd backend
npx ts-node-dev --respawn --transpile-only src/index.ts > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..
sleep 15 # Wait for backend and database connection to establish

# Test a database-connected endpoint
db_response=$(curl -s -H "x-test-bypass: true" http://127.0.0.1:5001/api/system/status)
if echo "$db_response" | grep -q '"isLocked"'; then
  echo "✅ Database Request Successful: $db_response"
else
  echo "❌ Database Request Failed or returned invalid data."
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

echo ""
echo "[8/8] 🚦 Running Targeted Auth Traffic Resilience Test..."
echo "   Initiating Auth Stress Test (30 sequential login attempts)..."
auth_success=0
auth_throttled=0
failures=0

# Temporarily disable set -e
set +e
for i in {1..30}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"stress_test@stellaar.com", "password":"wrong"}')
  
  if [ "$response" -eq 401 ]; then
    auth_success=$((auth_success+1))
  elif [ "$response" -eq 429 ]; then
    auth_throttled=$((auth_throttled+1))
  else
    failures=$((failures+1))
  fi
  # Visual heartbeat
  if (( $i % 5 == 0 )); then echo "   Node $i verified..."; fi
done
set -e

echo "   Blocked Brute-Force Attempts (429): $auth_throttled"
echo "   Processed Auth Node Checks (401): $auth_success"

# 🔍 VERIFY SELECTIVE LIMITING: System vectors should remain open
echo "   Verifying Global Node Availability (System Vector)..."
sys_response=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5001/api/system/traffic-test)
if [ "$sys_response" -eq 200 ]; then
  echo "✅ Selective Throttling Verified: System remains accessible while Auth is protected."
else
  echo "❌ Global limiting detected: System node was also throttled ($sys_response)."
  failures=$((failures+1))
fi
set -e

if [ "$SERVER_STARTED_BY_US" -eq 1 ]; then
  echo "   Shutting down temporary backend server..."
  kill $BACKEND_PID 2>/dev/null || true
fi

if [ "$failures" -gt 0 ]; then
  echo "❌ Critical failures detected during targeted traffic test."
  exit 1
fi

if [ "$auth_throttled" -gt 0 ]; then
  echo "✅ Targeted Auth Protection Passed."
else
  echo "❌ Auth Rate Limiting failed or limit wasn't reached."
  exit 1
fi

echo ""
echo "====================================================="
echo "🎉 ALL TESTS PASSED SUCCESSFULLY! SYSTEM IS ELITE READY."
echo "====================================================="
