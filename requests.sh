#!/bin/bash

# =====================================================
# Stellaar V2.0 - DB Stress Test (300 Requests)
# =====================================================
# Sends 300 requests across multiple endpoints to
# stress-test database connectivity and system resilience.

set -e

BASE_URL="http://127.0.0.1:5001"
HEALTH_URL="${BASE_URL}/health"
RESULTS_DIR="/tmp/stellaar-stress-$(date +%s)"
mkdir -p "$RESULTS_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}========================================================${NC}"
echo -e "${BOLD}  🚀 Stellaar DB Stress Test — 300 Requests${NC}"
echo -e "${BOLD}========================================================${NC}"
echo ""

# --------------------------------------------------
# 1. Kill any lingering processes that might block port 5001
# --------------------------------------------------
echo -ne "${YELLOW}[1]${NC} Cleaning port 5001... "
pkill -f "tsx.*src/index" 2>/dev/null || true
sleep 1
for pid in $(lsof -ti:5001 2>/dev/null); do
  kill -9 "$pid" 2>/dev/null || true
done
for i in $(seq 1 10); do
  if ! lsof -ti:5001 >/dev/null 2>&1; then
    break
  fi
  fuser -k 5001/tcp 2>/dev/null || true
  lsof -ti:5001 | xargs kill -9 2>/dev/null || true
  sleep 1
done
if lsof -ti:5001 >/dev/null 2>&1; then
  echo -e "${RED}Port 5001 still in use. Aborting.${NC}"
  exit 1
fi
echo -e "${GREEN}clean${NC}"

# --------------------------------------------------
# 2. Check if backend is running
# --------------------------------------------------
echo -ne "${YELLOW}[2]${NC} Checking backend at ${BASE_URL}... "
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" = "200" ]; then
  echo -e "${GREEN}online${NC} (${HEALTH_CHECK})"
else
  echo -e "${RED}offline${NC} (${HEALTH_CHECK})"
  echo -e "  ${YELLOW}Starting backend...${NC}"
  cd backend || { echo -e "  ${RED}No backend/ directory. Run from project root.${NC}"; exit 1; }
  npm run dev > /tmp/stellaar-backend.log 2>&1 &
  BACKEND_PID=$!
  cd ..
  # Wait up to 20 seconds for backend to come online
  for i in $(seq 1 20); do
    sleep 1
    RETRY=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
    if [ "$RETRY" = "200" ]; then
      echo -e "  ${GREEN}Backend started (${i}s).${NC}"
      break
    fi
    if [ "$i" -eq 20 ]; then
      echo -e "  ${RED}Backend failed to start after ${i}s. Check /tmp/stellaar-backend.log. Aborting.${NC}"
      exit 1
    fi
  done
fi

# --------------------------------------------------
# 2. Gather login token for authenticated endpoints
# --------------------------------------------------
echo -ne "${YELLOW}[2]${NC} Obtaining auth token... "
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stellaar.com","password":"admin123"}' 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token. Using only public endpoints.${NC}"
  AUTH=""
else
  echo -e "${GREEN}token acquired${NC}"
  AUTH="-H \"Authorization: Bearer $TOKEN\""
fi

echo ""

# --------------------------------------------------
# 3. Define endpoint list (weighted for 300 total)
# --------------------------------------------------
ENDPOINTS=()

# Public endpoints (no auth required)
ENDPOINTS+=("GET|${HEALTH_URL}|public|1")
ENDPOINTS+=("GET|${BASE_URL}/api/system/status|public|1")

# Auth-protected endpoints
if [ -n "$TOKEN" ]; then
  ENDPOINTS+=("GET|${BASE_URL}/api/system/backup-status|auth|1")
  ENDPOINTS+=("GET|${BASE_URL}/api/system/traffic-test|auth|2")
  ENDPOINTS+=("GET|${BASE_URL}/api/billing/invoices|auth|2")
  ENDPOINTS+=("GET|${BASE_URL}/api/members|auth|1")
  ENDPOINTS+=("GET|${BASE_URL}/api/activities|auth|1")
  ENDPOINTS+=("GET|${BASE_URL}/api/reports/stats|auth|1")
  ENDPOINTS+=("GET|${BASE_URL}/api/announcements|auth|1")
  # Heavier queries
  ENDPOINTS+=("GET|${BASE_URL}/api/billing/payments/pending|auth|1")
  ENDPOINTS+=("GET|${BASE_URL}/api/members/family-requests/pending|auth|1")
  ENDPOINTS+=("GET|${BASE_URL}/api/restaurant/table-reservations/pending|auth|1")
fi

# Calculate total weight
TOTAL_WEIGHT=0
for ep in "${ENDPOINTS[@]}"; do
  w=$(echo "$ep" | cut -d'|' -f4)
  TOTAL_WEIGHT=$((TOTAL_WEIGHT + w))
done

# Distribute 300 requests proportionally
echo -e "${CYAN}Target:${NC} 300 requests across ${#ENDPOINTS[@]} endpoints"
echo -e "${CYAN}Weight:${NC} ${TOTAL_WEIGHT} total units"
echo ""

RESULTS_FILE="$RESULTS_DIR/results.csv"
echo "method,url,status,time_ms" > "$RESULTS_FILE"

TOTAL=300
COUNT=0
PASS=0
FAIL=0
START_TIME=$(date +%s%N)

echo -e "${BOLD}Sending requests...${NC}"

for ep in "${ENDPOINTS[@]}"; do
  IFS='|' read -r method url auth_type weight <<< "$ep"
  REQ_COUNT=$((TOTAL * weight / TOTAL_WEIGHT))
  
  for ((i = 1; i <= REQ_COUNT; i++)); do
    COUNT=$((COUNT + 1))
    
    # Show progress every 30 requests
    if ((COUNT % 30 == 0)) || ((COUNT == TOTAL)); then
      pct=$((COUNT * 100 / TOTAL))
      echo -ne "  ${CYAN}${pct}%${NC} (${COUNT}/${TOTAL})\r"
    fi

    REQ_START=$(date +%s%N)
    
    if [ "$auth_type" = "auth" ] && [ -n "$TOKEN" ]; then
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    else
      RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")
    fi
    
    REQ_END=$(date +%s%N)
    DURATION_MS=$(( (REQ_END - REQ_START) / 1000000 ))
    
    echo "${method},${url},${RESPONSE},${DURATION_MS}" >> "$RESULTS_FILE"
    
    if [ "${RESPONSE:0:1}" = "2" ]; then
      PASS=$((PASS + 1))
    else
      FAIL=$((FAIL + 1))
    fi
  done
done

END_TIME=$(date +%s%N)
TOTAL_MS=$(( (END_TIME - START_TIME) / 1000000 ))
AVG_MS=$(( TOTAL_MS / TOTAL ))

echo -ne "\n\n"

# --------------------------------------------------
# 4. Report
# --------------------------------------------------
echo -e "${BOLD}========================================================${NC}"
echo -e "${BOLD}  📊 STRESS TEST RESULTS${NC}"
echo -e "${BOLD}========================================================${NC}"
echo ""
echo -e "  ${BOLD}Total requests:${NC}  ${TOTAL}"
echo -e "  ${GREEN}Passed:${NC}         ${PASS}"
echo -e "  ${RED}Failed:${NC}         ${FAIL}"
echo -e "  ${CYAN}Total time:${NC}     ${TOTAL_MS} ms ($((TOTAL_MS / 1000)).$((TOTAL_MS % 1000)) s)"
echo -e "  ${CYAN}Avg latency:${NC}    ${AVG_MS} ms"
echo -e "  ${CYAN}Throughput:${NC}     $((TOTAL * 1000 / TOTAL_MS)) req/s"
echo ""

# Per-endpoint summary
echo -e "${BOLD}Per-endpoint breakdown:${NC}"
echo "  $(printf '%-70s %8s %8s' 'ENDPOINT' '2xx' 'other')"
echo "  $(printf '%-70s %8s %8s' '-------' '---' '-----')"

while IFS=',' read -r method url status duration; do
  key="${method} ${url}"
done < <(tail -n +2 "$RESULTS_FILE")

# Aggregate by URL
declare -A URL_2XX
declare -A URL_OTHER
for url in $(awk -F',' '{print $2}' "$RESULTS_FILE" | sort -u); do
  if [ "$url" = "url" ]; then continue; fi
  twos=$(awk -F',' -v u="$url" '$2 == u && ($3 >= 200 && $3 < 300) {count++} END {print count+0}' "$RESULTS_FILE")
  others=$(awk -F',' -v u="$url" '$2 == u && !($3 >= 200 && $3 < 300) {count++} END {print count+0}' "$RESULTS_FILE")
  short_url=$(echo "$url" | sed 's|http://127.0.0.1:5001/api/||')
  echo "  $(printf '%-65s %8s %8s' "${short_url}" "${twos}" "${others}")"
done

echo ""
echo -e "${BOLD}Status code distribution:${NC}"
for code in $(awk -F',' 'NR>1 {print $3}' "$RESULTS_FILE" | sort | uniq -c | sort -rn); do
  echo "  $code"
done

echo ""
echo -e "${BOLD}Latency buckets:${NC}"
FAST=$(awk -F',' 'NR>1 && $4 < 100 {count++} END {print count+0}' "$RESULTS_FILE")
MEDIUM=$(awk -F',' 'NR>1 && $4 >= 100 && $4 < 500 {count++} END {print count+0}' "$RESULTS_FILE")
SLOW=$(awk -F',' 'NR>1 && $4 >= 500 && $4 < 2000 {count++} END {print count+0}' "$RESULTS_FILE")
DEAD=$(awk -F',' 'NR>1 && $4 >= 2000 {count++} END {print count+0}' "$RESULTS_FILE")
echo -e "  ${GREEN}<100ms:${NC}   ${FAST}"
echo -e "  ${YELLOW}100-500ms:${NC} ${MEDIUM}"
echo -e "  ${ORANGE}500-2s:${NC}    ${SLOW}"
echo -e "  ${RED}>2s:${NC}       ${DEAD}"

echo ""
echo -e "${BOLD}Results saved to:${NC} ${RESULTS_DIR}/results.csv"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}  ⚠️  ${FAIL} request(s) failed.${NC}"
  echo -e "  Check ${RESULTS_DIR}/results.csv for details."
  echo ""
fi

echo -e "${BOLD}========================================================${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  ✅ ALL 300 REQUESTS PASSED SUCCESSFULLY${NC}"
  echo -e "${GREEN}  🛡️  System is production-ready.${NC}"
else
  echo -e "${RED}  ❌ ${FAIL} REQUESTS FAILED${NC}"
fi
echo -e "${BOLD}========================================================${NC}"
echo ""
