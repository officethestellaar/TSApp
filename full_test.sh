#!/usr/bin/env bash
# =============================================================================
#  Stellaar — Full System Test Suite
#  Tests every API route, CRUD operation, role enforcement, granular
#  permissions, member portal, and negative auth cases.
# =============================================================================

set -o pipefail  # preserve last non-zero exit in a pipeline

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:5001/api}"
TEST_EMAIL="${TEST_EMAIL:-admin@stellaar.com}"
TEST_PASS="${TEST_PASS:-admin123}"
MEMBER_EMAIL="${MEMBER_EMAIL:-john@example.com}"
MEMBER_PASS="${MEMBER_PASS:-member123}"

PASS=0
FAIL=0
SKIP=0
TIMEOUT=5          # curl --max-time
PASS_COUNT_FILE=$(mktemp)

# Colors
G='\033[0;32m' R='\033[0;31m' Y='\033[1;33m' C='\033[0;36m' B='\033[1;34m' N='\033[0m'

mkdir -p /tmp/stellaar-test-logs

# ─── Helpers ──────────────────────────────────────────────────────────────────

cleanup() {
  rm -f "$PASS_COUNT_FILE"
}
trap cleanup EXIT

info()  { echo -e "  ${C}→${N} $1"; }
ok()    { echo -e "  ${G}✓${N} $1"; ((PASS++)); }
fail()  { echo -e "  ${R}✗${N} $1"; ((FAIL++)); echo "FAIL: $1" >> "$PASS_COUNT_FILE"; }
skip()  { echo -e "  ${Y}⊘${N} $1"; ((SKIP++)); }
header(){ echo -e "\n${B}══════════════════════════════════════════════════${N}"; echo -e "${B}  $1${N}"; echo -e "${B}══════════════════════════════════════════════════${N}"; }
sub()   { echo -e "  ${Y}── $1 ──${N}"; }

api() {
  local method=$1 path=$2 data=$3 expected=${4:-200}
  shift 4
  local headers=(-H "Content-Type: application/json" -H "x-test-bypass: true")
  local curl_cmd=(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT")
  if [[ -n "${TOKEN:-}" ]]; then
    headers+=(-H "Authorization: Bearer $TOKEN")
  fi
  if [[ "$method" == "GET" || "$method" == "DELETE" ]]; then
    "${curl_cmd[@]}" -X "$method" "${headers[@]}" "$BASE_URL$path${data:+?$data}"
  else
    "${curl_cmd[@]}" -X "$method" "${headers[@]}" -d "$data" "$BASE_URL$path"
  fi
  local actual=$?
  if [[ $actual -gt 1 ]]; then echo "000"; return 1; fi
  # Read output from stdout (we used -w so code is on stdout; body discarded)
  # Actually curl with -o /dev/null -w "%{http_code}" prints only the code.
  # But we need body too for some tests. We'll use a separate function for body.
  return 2  # signal that output was discarded; use api_body for body reads
}

api_body() {
  local method=$1 path=$2 data=$3
  shift 3
  local headers=(-H "Content-Type: application/json" -H "x-test-bypass: true")
  if [[ -n "${TOKEN:-}" ]]; then
    headers+=(-H "Authorization: Bearer $TOKEN")
  fi
  if [[ "$method" == "GET" || "$method" == "DELETE" ]]; then
    curl -s --max-time "$TIMEOUT" -X "$method" "${headers[@]}" "$BASE_URL$path${data:+?$data}"
  else
    curl -s --max-time "$TIMEOUT" -X "$method" "${headers[@]}" -d "$data" "$BASE_URL$path"
  fi
}

api_raw() {
  # curl with full output (no -o /dev/null), returns exit code from grep
  local method=$1 path=$2 data=$3 expected=$4
  local headers=(-H "Content-Type: application/json" -H "x-test-bypass: true")
  if [[ -n "${TOKEN:-}" ]]; then
    headers+=(-H "Authorization: Bearer $TOKEN")
  fi
  if [[ "$method" == "GET" || "$method" == "DELETE" ]]; then
    curl -s --max-time "$TIMEOUT" -X "$method" "${headers[@]}" "$BASE_URL$path${data:+?$data}"
  else
    curl -s --max-time "$TIMEOUT" -X "$method" "${headers[@]}" -d "$data" "$BASE_URL$path"
  fi
}

expect_status() {
  local desc=$1 expected=$2 actual=$3
  if [[ "$actual" == "$expected" ]]; then
    ok "$desc (HTTP $actual)"
    return 0
  else
    fail "$desc — expected HTTP $expected, got $actual"
    return 1
  fi
}

expect_body_contains() {
  local desc=$1 body=$2 pattern=$3
  if echo "$body" | grep -q "$pattern"; then
    ok "$desc"
    return 0
  else
    fail "$desc — expected body to contain \"$pattern\", but got: $(echo "$body" | head -c 200)"
    return 1
  fi
}

# ─── Prerequisite — Ping backend ─────────────────────────────────────────────

header "PREREQUISITE: Backend Health Check"
BACKEND_UP=false
for i in 1 2 3; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE_URL/../health" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    BACKEND_UP=true
    break
  fi
  sleep 2
done
if ! $BACKEND_UP; then
  echo -e "  ${R}✗ Backend not reachable at $BASE_URL. Start it with: cd backend && npm run dev${N}"
  exit 1
fi
ok "Backend is reachable at $BASE_URL"

# ─── 1. AUTH ─────────────────────────────────────────────────────────────────

header "1. AUTH — Login, Register, Roles, Logout"

# 1a. Login as super admin
sub "1a. Super Admin Login"
BODY=$(curl -s --max-time "$TIMEOUT" -X POST -H "Content-Type: application/json" \
  -H "x-test-bypass: true" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" \
  "$BASE_URL/auth/login")
CODE=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
TOKEN="$CODE"
if [[ -n "$TOKEN" && "$TOKEN" != "None" ]]; then
  ok "Super Admin login successful (token obtained)"
else
  fail "Super Admin login failed — response: $(echo "$BODY" | head -c 200)"
  echo -e "  ${R}Cannot continue without auth token. Exiting.${N}"
  exit 1
fi

# Check user object in login response
expect_body_contains "Login returns user.role=SUPER_ADMIN" "$BODY" "SUPER_ADMIN"
expect_body_contains "Login returns user.email" "$BODY" "$TEST_EMAIL"

# 1b. GET /auth/roles
BODY=$(api_body GET "/auth/roles")
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "x-test-bypass: true" "$BASE_URL/auth/roles")
expect_status "GET /auth/roles — public, list non-super roles" 200 "$CODE"

# 1c. POST /auth/register
BODY=$(api_body POST "/auth/register" '{"email":"test-new@test.com","password":"Test1234!","name":"Test User","roleName":"DATA_OPERATOR"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "x-test-bypass: true" \
  -d '{"email":"test-new@test.com","password":"Test1234!","name":"Test User","roleName":"DATA_OPERATOR"}' \
  "$BASE_URL/auth/register")
expect_status "POST /auth/register — creates PENDING user" 201 "$CODE"

# 1d. POST /auth/register with SUPER_ADMIN should fail
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "x-test-bypass: true" \
  -d '{"email":"bad@test.com","password":"Test1234!","name":"Bad","roleName":"SUPER_ADMIN"}' \
  "$BASE_URL/auth/register")
expect_status "POST /auth/register — SUPER_ADMIN role rejected" 403 "$CODE"

# 1e. Login with wrong password
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "x-test-bypass: true" \
  -d '{"email":"admin@stellaar.com","password":"wrongpass"}' \
  "$BASE_URL/auth/login")
expect_status "POST /auth/login — invalid credentials → 401" 401 "$CODE"

# 1f. Logout (authenticated)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "x-test-bypass: true" \
  -H "Authorization: Bearer $TOKEN" "$BASE_URL/auth/logout")
expect_status "POST /auth/logout — authenticated" 200 "$CODE"

# 1g. Forgot-password
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "x-test-bypass: true" \
  -d '{"email":"admin@stellaar.com"}' "$BASE_URL/auth/forgot-password")
expect_status "POST /auth/forgot-password — accepts request" 200 "$CODE"

# 1h. POST /auth/logout without token
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "x-test-bypass: true" \
  "$BASE_URL/auth/logout")
expect_status "POST /auth/logout — no token → 401" 401 "$CODE"

# Re-login after tests that might have disrupted token
BODY=$(curl -s --max-time "$TIMEOUT" -X POST -H "Content-Type: application/json" \
  -H "x-test-bypass: true" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" "$BASE_URL/auth/login")
TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
if [[ -z "$TOKEN" || "$TOKEN" == "None" ]]; then
  fail "Re-login failed after auth tests"
  echo "  Exiting."
  exit 1
fi

# ─── 2. USERS API ────────────────────────────────────────────────────────────

header "2. USERS — CRUD, Lock/Unlock, Screens, Granular Permissions"

# 2a. GET /users
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/users")
expect_status "GET /users — SUPER_ADMIN can list users" 200 "$CODE"

# 2b. GET /users/me
BODY=$(api_body GET "/users/me")
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/users/me")
expect_status "GET /users/me — current user" 200 "$CODE"
expect_body_contains "GET /users/me returns role" "$BODY" "SUPER_ADMIN"

# 2c. PATCH /users/me
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Super Admin Updated"}' "$BASE_URL/users/me")
expect_status "PATCH /users/me — update own profile" 200 "$CODE"
# Restore name
curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Super Admin"}' "$BASE_URL/users/me" > /dev/null

# 2d. PATCH /users/me/pin
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"pin":"1234"}' "$BASE_URL/users/me/pin")
expect_status "PATCH /users/me/pin — set pin" 200 "$CODE"

# 2e. GET /users/roles (Super Admin only)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/users/roles")
expect_status "GET /users/roles — SUPER_ADMIN only" 200 "$CODE"

# 2f. POST /users (Create user)
BODY=$(api_body POST "/users" '{"email":"test-staff@test.com","password":"Test1234!","name":"Test Staff","roleName":"DATA_OPERATOR"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"email":"test-staff@test.com","password":"Test1234!","name":"Test Staff","roleName":"DATA_OPERATOR"}' \
  "$BASE_URL/users")
expect_status "POST /users — create staff by SUPER_ADMIN" 201 "$CODE"

# Extract created user ID
TEST_USER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null)
if [[ -z "$TEST_USER_ID" ]]; then
  # Try alternate response shape
  TEST_USER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
fi
if [[ -z "$TEST_USER_ID" || "$TEST_USER_ID" == "None" ]]; then
  fail "Could not extract test user ID from response"
  # Find user by email
  TEST_USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/users" \
    | python3 -c "import sys,json; users=json.load(sys.stdin); print([u['id'] for u in users if u.get('email')=='test-staff@test.com'][0])" 2>/dev/null)
fi
if [[ -n "$TEST_USER_ID" && "$TEST_USER_ID" != "None" ]]; then
  ok "Test user created with ID=$TEST_USER_ID"
else
  TEST_USER_ID=""
  fail "Could not find test user ID"
fi

# 2g. PATCH /users/:id
if [[ -n "$TEST_USER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"name":"Updated Staff"}' "$BASE_URL/users/$TEST_USER_ID")
  expect_status "PATCH /users/:id — update staff by SUPER_ADMIN" 200 "$CODE"
fi

# 2h. PATCH /users/:id/lock
if [[ -n "$TEST_USER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"locked":true}' "$BASE_URL/users/$TEST_USER_ID/lock")
  expect_status "PATCH /users/:id/lock — lock user" 200 "$CODE"

  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"locked":false}' "$BASE_URL/users/$TEST_USER_ID/lock")
  expect_status "PATCH /users/:id/lock — unlock user" 200 "$CODE"
fi

# 2i. GET /users/screens
BODY=$(api_body GET "/users/screens" "" "$TOKEN")
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/users/screens")
expect_status "GET /users/screens — current user screens" 200 "$CODE"
expect_body_contains "GET /users/screens includes allScreens" "$BODY" "allScreens"

# 2j. GET /users/:id/screens (Super Admin only)
if [[ -n "$TEST_USER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users/$TEST_USER_ID/screens")
  expect_status "GET /users/:id/screens — SUPER_ADMIN only" 200 "$CODE"
fi

# 2k. PUT /users/:id/screens (assign screens)
if [[ -n "$TEST_USER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"screenKeys":["billing","members","overview"]}' "$BASE_URL/users/$TEST_USER_ID/screens")
  expect_status "PUT /users/:id/screens — assign screens" 200 "$CODE"
fi

# 2l. GET /users/:id/screens/permissions
if [[ -n "$TEST_USER_ID" ]]; then
  BODY=$(api_body GET "/users/$TEST_USER_ID/screens/permissions")
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users/$TEST_USER_ID/screens/permissions")
  expect_status "GET /users/:id/screens/permissions — granular perms" 200 "$CODE"
  expect_body_contains "Granular perms includes allScreens" "$BODY" "allScreens"
fi

# 2m. PUT /users/:id/screens/permissions (granular)
if [[ -n "$TEST_USER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"screens":{"billing":{"canCreate":true,"canRead":true,"canUpdate":false,"canDelete":false},"members":{"canCreate":false,"canRead":true,"canUpdate":true,"canDelete":false}}}' \
    "$BASE_URL/users/$TEST_USER_ID/screens/permissions")
  expect_status "PUT /users/:id/screens/permissions — set granular" 200 "$CODE"
fi

# 2n. DELETE /users/:id (clean up test user — we'll do at end or here)
# Deferred to cleanup section at the bottom

# 2o. Negative: non-super cannot access user management
# Use test-staff (DATA_OPERATOR) — need to approve and login
# First approve via super admin
if [[ -n "$TEST_USER_ID" ]]; then
  curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"status":"APPROVED"}' "$BASE_URL/users/$TEST_USER_ID" > /dev/null
fi
# Login as test-staff
BODY_STAFF=$(curl -s --max-time "$TIMEOUT" -X POST -H "Content-Type: application/json" \
  -H "x-test-bypass: true" \
  -d '{"email":"test-staff@test.com","password":"Test1234!"}' "$BASE_URL/auth/login")
TOKEN_STAFF=$(echo "$BODY_STAFF" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
if [[ -n "$TOKEN_STAFF" && "$TOKEN_STAFF" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_STAFF
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/users")
  expect_status "GET /users — DATA_OPERATOR → 403" 403 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# ─── 3. MEMBERS API ──────────────────────────────────────────────────────────

header "3. MEMBERS — CRUD, Family, QR, Status, Import/Export"

# 3a. GET /members
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/members")
expect_status "GET /members — list members" 200 "$CODE"

# 3b. GET /members/:id (get seeded member)
MEMBER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/members" | python3 -c "import sys,json; d=json.load(sys.stdin); m=[x for x in (d if isinstance(d,list) else d.get('members',[]) if isinstance(d,dict) else []) if x.get('email')=='john@example.com']; print(m[0]['id'] if m else '')" 2>/dev/null)
if [[ -z "$MEMBER_ID" ]]; then
  MEMBER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('members',[]) if isinstance(d,dict) else []; print(items[0]['id'] if items else '')" 2>/dev/null)
fi
if [[ -n "$MEMBER_ID" && "$MEMBER_ID" != "None" ]]; then
  ok "Found member ID=$MEMBER_ID"
else
  MEMBER_ID=""
  fail "Could not find any member"
fi

# 3c. GET /members/:id
if [[ -n "$MEMBER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/$MEMBER_ID")
  expect_status "GET /members/:id — single member" 200 "$CODE"
fi

# 3d. POST /members (create new member)
BODY=$(api_body POST "/members" '{
  "membershipNumber":"TEST-001","category":"BLUE","tenure":"1_YEAR",
  "nameAsAadhaar":"Test Member","fatherHusbandName":"Father","gender":"MALE",
  "dob":"1990-01-01","maritalStatus":"SINGLE","occupation":"Engineer",
  "aadhaarNumber":"111122223333","mobileNumber":"9999999999",
  "email":"test-member@test.com","password":"Test1234!",
  "residentialAddress":"Test Address","city":"Mumbai","state":"Maharashtra",
  "pincode":"400001","nationality":"INDIAN","bloodGroup":"O+",
  "emergencyContactName":"Emergency","emergencyContactNumber":"8888888888",
  "offerPrice":50000,"membershipFee":45000,"registrationFee":5000,
  "discountAmount":0,"netAmount":50000,"gstAmount":9000,"totalAmount":59000,
  "paymentMode":"UPI","startDate":"2026-01-01","expiryDate":"2027-01-01",
  "status":"APPROVED","amcStatus":"PAID","accessStatus":"ENABLED"
}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"membershipNumber":"TEST-001","category":"BLUE","tenure":"1_YEAR","nameAsAadhaar":"Test Member","fatherHusbandName":"Father","gender":"MALE","dob":"1990-01-01","maritalStatus":"SINGLE","occupation":"Engineer","aadhaarNumber":"111122223333","mobileNumber":"9999999999","email":"test-member@test.com","password":"Test1234!","residentialAddress":"Test Address","city":"Mumbai","state":"Maharashtra","pincode":"400001","nationality":"INDIAN","bloodGroup":"O+","emergencyContactName":"Emergency","emergencyContactNumber":"8888888888","offerPrice":50000,"membershipFee":45000,"registrationFee":5000,"discountAmount":0,"netAmount":50000,"gstAmount":9000,"totalAmount":59000,"paymentMode":"UPI","startDate":"2026-01-01","expiryDate":"2027-01-01","status":"APPROVED","amcStatus":"PAID","accessStatus":"ENABLED"}' \
  "$BASE_URL/members")
# Some endpoints may return 201 Create
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /members — create member (HTTP $CODE)"
else
  fail "POST /members — expected 200/201, got $CODE"
fi
TEST_MEMBER_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$TEST_MEMBER_ID" || "$TEST_MEMBER_ID" == "None" ]]; then
  TEST_MEMBER_ID=""
fi

# 3e. PATCH /members/:id/status
if [[ -n "$MEMBER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"status":"APPROVED"}' "$BASE_URL/members/$MEMBER_ID/status")
  expect_status "PATCH /members/:id/status — update status" 200 "$CODE"
fi

# 3f. GET /members/:id/qr
if [[ -n "$MEMBER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/$MEMBER_ID/qr")
  expect_status "GET /members/:id/qr — generate QR" 200 "$CODE"
fi

# 3g. GET /members/me (member login)
BODY_MEM=$(curl -s --max-time "$TIMEOUT" -X POST -H "Content-Type: application/json" \
  -H "x-test-bypass: true" \
  -d "{\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASS\"}" \
  "$BASE_URL/auth/login")
TOKEN_MEM=$(echo "$BODY_MEM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
if [[ -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" "$BASE_URL/members/me")
  expect_status "GET /members/me — member self-view" 200 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 3h. POST /members/me/family-request (member)
if [[ -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"name":"Family Member","relation":"SPOUSE","email":"family@test.com","mobileNumber":"7777777777","gender":"FEMALE","dob":"1995-06-15"}' \
    "$BASE_URL/members/me/family-request")
  expect_status "POST /members/me/family-request — submit family request" 200 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 3i. POST /members/me/unenroll (member)
if [[ -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"reason":"Testing"}' "$BASE_URL/members/me/unenroll")
  # May return 200 or 400 depending on state — just check it doesn't 500
  if [[ "$CODE" == "200" || "$CODE" == "201" || "$CODE" == "400" ]]; then
    ok "POST /members/me/unenroll (HTTP $CODE)"
  else
    fail "POST /members/me/unenroll — unexpected $CODE"
  fi
  TOKEN=$SAVE_TOKEN
fi

# 3j. GET /members/export/csv
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/members/export/csv")
expect_status "GET /members/export/csv — export members" 200 "$CODE"

# 3k. PATCH /members/me/profile (member)
if [[ -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"occupation":"Updated Engineer"}' "$BASE_URL/members/me/profile")
  expect_status "PATCH /members/me/profile — update own profile" 200 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 3l. Unenroll requests pending (staff)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/members/unenroll-requests/pending")
expect_status "GET /members/unenroll-requests/pending — staff view" 200 "$CODE"

# 3m. Family requests pending
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/members/family-requests/pending")
expect_status "GET /members/family-requests/pending — staff view" 200 "$CODE"

# ─── 4. BILLING API ──────────────────────────────────────────────────────────

header "4. BILLING — Invoices, Payments, Cancellations, AMC Defaulters"

# 4a. GET /billing/invoices
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/billing/invoices")
expect_status "GET /billing/invoices — list invoices" 200 "$CODE"

# 4b. POST /billing/invoice (create)
BODY=$(api_body POST "/billing/invoice" "{\"memberId\":$MEMBER_ID,\"amount\":1000,\"description\":\"Test invoice\",\"dueDate\":\"2026-12-31\",\"type\":\"MEMBERSHIP\"}")
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d "{\"memberId\":$MEMBER_ID,\"amount\":1000,\"description\":\"Test invoice\",\"dueDate\":\"2026-12-31\",\"type\":\"MEMBERSHIP\"}" \
  "$BASE_URL/billing/invoice")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /billing/invoice — create invoice (HTTP $CODE)"
else
  fail "POST /billing/invoice — expected 200/201, got $CODE"
fi
INVOICE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$INVOICE_ID" || "$INVOICE_ID" == "None" ]]; then
  INVOICE_ID=""
fi

# 4c. GET /billing/invoice/:id
if [[ -n "$INVOICE_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/billing/invoice/$INVOICE_ID")
  expect_status "GET /billing/invoice/:id — single invoice" 200 "$CODE"
fi

# 4d. PATCH /billing/invoice/:id (SUPER_ADMIN only with canUpdate)
if [[ -n "$INVOICE_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"description":"Updated invoice"}' "$BASE_URL/billing/invoice/$INVOICE_ID")
  expect_status "PATCH /billing/invoice/:id — update invoice" 200 "$CODE"
fi

# 4e. GET /billing/my-invoices (member)
if [[ -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/billing/my-invoices")
  expect_status "GET /billing/my-invoices — member's invoices" 200 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 4f. POST /billing/invoice/:id/request-cancellation (member)
if [[ -n "$INVOICE_ID" && -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"reason":"Testing"}' "$BASE_URL/billing/invoice/$INVOICE_ID/request-cancellation")
  expect_status "POST /billing/invoice/:id/request-cancellation — member requests cancellation" 200 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 4g. POST /billing/payment
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d "{\"invoiceId\":$INVOICE_ID,\"amount\":1000,\"paymentMode\":\"UPI\",\"transactionId\":\"TXN$(date +%s)\"}" \
  "$BASE_URL/billing/payment")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /billing/payment — record payment (HTTP $CODE)"
else
  fail "POST /billing/payment — expected 200/201, got $CODE"
fi

# 4h. GET /billing/payments/pending
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/billing/payments/pending")
expect_status "GET /billing/payments/pending — list pending payments" 200 "$CODE"

# 4i. POST /billing/check-amc-defaulters
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{}' "$BASE_URL/billing/check-amc-defaulters")
expect_status "POST /billing/check-amc-defaulters — check AMC" 200 "$CODE"

# 4j. DELETE /billing/invoice/:id (SUPER_ADMIN only with canDelete)
if [[ -n "$INVOICE_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/billing/invoice/$INVOICE_ID")
  expect_status "DELETE /billing/invoice/:id — delete invoice" 200 "$CODE"
fi

# ─── 5. HOUSEKEEPING API ─────────────────────────────────────────────────────

header "5. HOUSEKEEPING — Tasks, Allocations, Instances, Deep Cleaning"

# 5a. GET /housekeeping/dashboard
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/dashboard")
expect_status "GET /housekeeping/dashboard — dashboard stats" 200 "$CODE"

# 5b. GET /housekeeping/tasks
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/tasks")
expect_status "GET /housekeeping/tasks — list tasks" 200 "$CODE"

# 5c. POST /housekeeping/tasks
BODY=$(api_body POST "/housekeeping/tasks" '{"title":"Test Task","description":"Test","priority":"MEDIUM","assignedTo":null}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"title":"Test Task","description":"Test","priority":"MEDIUM"}' \
  "$BASE_URL/housekeeping/tasks")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /housekeeping/tasks — create task (HTTP $CODE)"
else
  fail "POST /housekeeping/tasks — expected 200/201, got $CODE"
fi
HK_TASK_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$HK_TASK_ID" || "$HK_TASK_ID" == "None" ]]; then
  HK_TASK_ID=""
fi

# 5d. PATCH /housekeeping/tasks/:id
if [[ -n "$HK_TASK_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"title":"Updated Task"}' "$BASE_URL/housekeeping/tasks/$HK_TASK_ID")
  expect_status "PATCH /housekeeping/tasks/:id — update task" 200 "$CODE"
fi

# 5e. GET /housekeeping/allocations
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/allocations")
expect_status "GET /housekeeping/allocations — list allocations" 200 "$CODE"

# 5f. POST /housekeeping/allocations
BODY=$(api_body POST "/housekeeping/allocations" '{"zone":"Main Hall","floor":"Floor 7","assignedTo":null}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"zone":"Main Hall","floor":"Floor 7"}' \
  "$BASE_URL/housekeeping/allocations")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /housekeeping/allocations — create allocation (HTTP $CODE)"
else
  fail "POST /housekeeping/allocations — expected 200/201, got $CODE"
fi

# 5g. GET /housekeeping/instances
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/instances")
expect_status "GET /housekeeping/instances — list instances" 200 "$CODE"

# 5h. GET /housekeeping/deep-cleaning
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/deep-cleaning")
expect_status "GET /housekeeping/deep-cleaning — list deep cleaning" 200 "$CODE"

# 5i. POST /housekeeping/deep-cleaning
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"roomNo":"101","area":"Bedroom","notes":"Deep clean test"}' \
  "$BASE_URL/housekeeping/deep-cleaning")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /housekeeping/deep-cleaning — create (HTTP $CODE)"
else
  fail "POST /housekeeping/deep-cleaning — expected 200/201, got $CODE"
fi

# 5j. GET /housekeeping/employees
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/employees")
expect_status "GET /housekeeping/employees — list HK employees" 200 "$CODE"

# 5k. GET /housekeeping/reports
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/reports")
expect_status "GET /housekeeping/reports — HK reports" 200 "$CODE"

# 5l. GET /housekeeping/overdue
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/housekeeping/overdue")
expect_status "GET /housekeeping/overdue — overdue tasks" 200 "$CODE"

# ─── 6. ATTENDANCE API ───────────────────────────────────────────────────────

header "6. ATTENDANCE — CRUD, Bulk, Mark-with-Pin, Check-out, Summary"

# 6a. GET /attendance
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/attendance")
expect_status "GET /attendance — list attendance" 200 "$CODE"

# 6b. POST /attendance (mark)
BODY=$(api_body POST "/attendance" '{"date":"2026-07-01","status":"PRESENT"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"date":"2026-07-01","status":"PRESENT"}' \
  "$BASE_URL/attendance")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /attendance — mark attendance (HTTP $CODE)"
else
  fail "POST /attendance — expected 200/201, got $CODE"
fi

# 6c. GET /attendance/today-status
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/attendance/today-status")
expect_status "GET /attendance/today-status — today's status" 200 "$CODE"

# 6d. POST /attendance/mark-with-pin
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"pin":"1234"}' \
  "$BASE_URL/attendance/mark-with-pin")
if [[ "$CODE" == "200" || "$CODE" == "201" || "$CODE" == "400" || "$CODE" == "409" ]]; then
  ok "POST /attendance/mark-with-pin (HTTP $CODE)"
else
  fail "POST /attendance/mark-with-pin — unexpected $CODE"
fi

# 6e. POST /attendance/check-out
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{}' "$BASE_URL/attendance/check-out")
if [[ "$CODE" == "200" || "$CODE" == "400" || "$CODE" == "404" ]]; then
  ok "POST /attendance/check-out (HTTP $CODE)"
else
  fail "POST /attendance/check-out — unexpected $CODE"
fi

# 6f. GET /attendance/summary
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/attendance/summary")
expect_status "GET /attendance/summary — attendance summary" 200 "$CODE"

# 6g. POST /attendance/bulk (bulk mark)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"records":[]}' "$BASE_URL/attendance/bulk")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /attendance/bulk — bulk attendance (HTTP $CODE)"
else
  fail "POST /attendance/bulk — expected 200/201, got $CODE"
fi

# ─── 7. LEAVE API ────────────────────────────────────────────────────────────

header "7. LEAVE — CRUD, Review, Balances"

# 7a. GET /leave
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/leave")
expect_status "GET /leave — list leave requests" 200 "$CODE"

# 7b. GET /leave/my
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/leave/my")
expect_status "GET /leave/my — own leave" 200 "$CODE"

# 7c. GET /leave/balances
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/leave/balances")
expect_status "GET /leave/balances — own balances" 200 "$CODE"

# 7d. POST /leave (apply)
BODY=$(api_body POST "/leave" '{"startDate":"2026-08-01","endDate":"2026-08-02","type":"SICK","reason":"Test leave"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"startDate":"2026-08-01","endDate":"2026-08-02","type":"SICK","reason":"Test leave"}' \
  "$BASE_URL/leave")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /leave — apply leave (HTTP $CODE)"
else
  fail "POST /leave — expected 200/201, got $CODE"
fi
LEAVE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$LEAVE_ID" || "$LEAVE_ID" == "None" ]]; then LEAVE_ID=""; fi

# 7e. PATCH /leave/:id/review
if [[ -n "$LEAVE_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"status":"APPROVED","reviewNotes":"Approved"}' "$BASE_URL/leave/$LEAVE_ID/review")
  expect_status "PATCH /leave/:id/review — approve/reject leave" 200 "$CODE"
fi

# 7f. GET /leave/balances/all
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/leave/balances/all")
expect_status "GET /leave/balances/all — all balances" 200 "$CODE"

# ─── 8. SALARY API ───────────────────────────────────────────────────────────

header "8. SALARY — CRUD, Calculate"

# 8a. GET /salary
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/salary")
expect_status "GET /salary — list salaries" 200 "$CODE"

# 8b. POST /salary
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"userId":1,"basicSalary":50000,"allowances":10000,"deductions":5000,"effectiveDate":"2026-07-01"}' \
  "$BASE_URL/salary")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /salary — create salary (HTTP $CODE)"
else
  fail "POST /salary — expected 200/201, got $CODE"
fi

# 8c. POST /salary/calculate
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{}' "$BASE_URL/salary/calculate")
expect_status "POST /salary/calculate — calculate salaries" 200 "$CODE"

# ─── 9. RESTAURANT API ───────────────────────────────────────────────────────

header "9. RESTAURANT — Tables, Reservations, Orders, KDS, Menu"

# 9a. GET /restaurant/tables
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/tables")
expect_status "GET /restaurant/tables — list tables" 200 "$CODE"

# 9b. GET /restaurant/menu
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/menu")
expect_status "GET /restaurant/menu — restaurant menu" 200 "$CODE"

# 9c. POST /restaurant/table-reservation
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"tableId":1,"date":"2026-07-15","time":"19:00","guestCount":2}' \
  "$BASE_URL/restaurant/table-reservation")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /restaurant/table-reservation — create reservation (HTTP $CODE)"
else
  fail "POST /restaurant/table-reservation — expected 200/201, got $CODE"
fi

# 9d. GET /restaurant/table-reservations/pending
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/table-reservations/pending")
expect_status "GET /restaurant/table-reservations/pending — pending reservations" 200 "$CODE"

# 9e. GET /restaurant/my-table-reservations
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/my-table-reservations")
expect_status "GET /restaurant/my-table-reservations — own reservations" 200 "$CODE"

# 9f. POST /restaurant/order
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"tableId":1,"items":[{"menuItemId":1,"quantity":2}]}' \
  "$BASE_URL/restaurant/order")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /restaurant/order — place order (HTTP $CODE)"
else
  fail "POST /restaurant/order — expected 200/201, got $CODE"
fi

# 9g. GET /restaurant/my-orders
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/my-orders")
expect_status "GET /restaurant/my-orders — own orders" 200 "$CODE"

# 9h. GET /restaurant/kds/active
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/kds/active")
expect_status "GET /restaurant/kds/active — KDS active orders" 200 "$CODE"

# 9i. GET /restaurant/unverified
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/restaurant/unverified")
expect_status "GET /restaurant/unverified — unverified orders" 200 "$CODE"

# ─── 10. ACTIVITIES API ──────────────────────────────────────────────────────

header "10. ACTIVITIES — CRUD, Timer, Reservations"

# 10a. GET /activities
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/activities")
expect_status "GET /activities — list activities" 200 "$CODE"

# 10b. POST /activities
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Test Activity","description":"Test","location":"Gym","capacity":10,"category":"EVENT","startTime":"2026-07-10T10:00:00Z","endTime":"2026-07-10T12:00:00Z"}' \
  "$BASE_URL/activities")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /activities — create activity (HTTP $CODE)"
else
  fail "POST /activities — expected 200/201, got $CODE"
fi

# 10c. GET /activities/my-reservations
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/activities/my-reservations")
expect_status "GET /activities/my-reservations — own reservations" 200 "$CODE"

# ─── 11. ANNOUNCEMENTS API ───────────────────────────────────────────────────

header "11. ANNOUNCEMENTS — CRUD"

# 11a. GET /announcements
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/announcements")
expect_status "GET /announcements — list announcements" 200 "$CODE"

# 11b. POST /announcements
BODY=$(api_body POST "/announcements" '{"title":"Test Notice","content":"Test content","priority":"MEDIUM"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"title":"Test Notice","content":"Test content","priority":"MEDIUM"}' \
  "$BASE_URL/announcements")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /announcements — create (HTTP $CODE)"
else
  fail "POST /announcements — expected 200/201, got $CODE"
fi
NOTICE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$NOTICE_ID" || "$NOTICE_ID" == "None" ]]; then NOTICE_ID=""; fi

# 11c. PATCH /announcements/:id
if [[ -n "$NOTICE_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"title":"Updated Notice"}' "$BASE_URL/announcements/$NOTICE_ID")
  expect_status "PATCH /announcements/:id — update" 200 "$CODE"
fi

# 11d. DELETE /announcements/:id
if [[ -n "$NOTICE_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/announcements/$NOTICE_ID")
  expect_status "DELETE /announcements/:id — delete" 200 "$CODE"
fi

# ─── 12. ASSETS API ──────────────────────────────────────────────────────────

header "12. ASSETS — CRUD, Stats, Logs"

# 12a. GET /assets
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/assets")
expect_status "GET /assets — list assets" 200 "$CODE"

# 12b. GET /assets/stats
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/assets/stats")
expect_status "GET /assets/stats — asset stats" 200 "$CODE"

# 12c. POST /assets
BODY=$(api_body POST "/assets" '{"name":"Test Asset","category":"IT","tagNumber":"TEST-001","location":"Office","purchaseDate":"2026-01-01","purchaseCost":50000,"status":"OPERATIONAL"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Test Asset","category":"IT","tagNumber":"TEST-001","location":"Office","purchaseDate":"2026-01-01","purchaseCost":50000,"status":"OPERATIONAL"}' \
  "$BASE_URL/assets")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /assets — create asset (HTTP $CODE)"
else
  fail "POST /assets — expected 200/201, got $CODE"
fi
ASSET_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$ASSET_ID" || "$ASSET_ID" == "None" ]]; then ASSET_ID=""; fi

# 12d. PATCH /assets/:id
if [[ -n "$ASSET_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"name":"Updated Asset"}' "$BASE_URL/assets/$ASSET_ID")
  expect_status "PATCH /assets/:id — update asset" 200 "$CODE"
fi

# 12e. DELETE /assets/:id
if [[ -n "$ASSET_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/assets/$ASSET_ID")
  expect_status "DELETE /assets/:id — delete asset" 200 "$CODE"
fi

# ─── 13. INVENTORY API ───────────────────────────────────────────────────────

header "13. INVENTORY — CRUD, Restock, Recipes, Alerts, Reports"

# 13a. GET /inventory
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/inventory")
expect_status "GET /inventory — list inventory" 200 "$CODE"

# 13b. GET /inventory/alerts
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/inventory/alerts")
expect_status "GET /inventory/alerts — low stock alerts" 200 "$CODE"

# 13c. POST /inventory
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Test Item","category":"DRY_GOODS","unit":"kg","currentStock":50,"minStockLevel":10,"unitPrice":100}' \
  "$BASE_URL/inventory")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /inventory — create item (HTTP $CODE)"
else
  fail "POST /inventory — expected 200/201, got $CODE"
fi

# 13d. GET /inventory/logs
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/inventory/logs")
expect_status "GET /inventory/logs — inventory logs" 200 "$CODE"

# 13e. GET /inventory/reports/consumption
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/inventory/reports/consumption")
expect_status "GET /inventory/reports/consumption — consumption report" 200 "$CODE"

# 13f. GET /inventory/reports/valuation
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/inventory/reports/valuation")
expect_status "GET /inventory/reports/valuation — valuation report" 200 "$CODE"

# ─── 14. COMPLAINTS API ──────────────────────────────────────────────────────

header "14. COMPLAINTS — CRUD, Messages, Status"

# 14a. POST /complaints
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"subject":"Test Complaint","description":"Test description","category":"SERVICE"}' \
  "$BASE_URL/complaints")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /complaints — create complaint (HTTP $CODE)"
else
  fail "POST /complaints — expected 200/201, got $CODE"
fi

# 14b. GET /complaints
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/complaints")
expect_status "GET /complaints — list complaints" 200 "$CODE"

# ─── 15. AMC API ─────────────────────────────────────────────────────────────

header "15. AMC — Submit, Pending, Process, Proof"

# 15a. POST /amc/submit
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"amount":5000,"transactionId":"AMC-TXN-001"}' \
  "$BASE_URL/amc/submit")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /amc/submit — submit AMC (HTTP $CODE)"
else
  fail "POST /amc/submit — expected 200/201, got $CODE"
fi

# 15b. GET /amc/pending
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/amc/pending")
expect_status "GET /amc/pending — pending AMC requests" 200 "$CODE"

# ─── 16. REPORTS API ─────────────────────────────────────────────────────────

header "16. REPORTS — Stats, Charts, Distribution, Feedback"

# 16a. GET /reports/stats
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/stats")
expect_status "GET /reports/stats — dashboard stats" 200 "$CODE"

# 16b. GET /reports/revenue-chart
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/revenue-chart")
expect_status "GET /reports/revenue-chart — revenue chart" 200 "$CODE"

# 16c. GET /reports/membership-distribution
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/membership-distribution")
expect_status "GET /reports/membership-distribution" 200 "$CODE"

# 16d. GET /reports/daily-summary
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/daily-summary")
expect_status "GET /reports/daily-summary" 200 "$CODE"

# 16e. GET /reports/amc-defaulters
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/amc-defaulters")
expect_status "GET /reports/amc-defaulters" 200 "$CODE"

# 16f. GET /reports/gst-summary
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/gst-summary")
expect_status "GET /reports/gst-summary" 200 "$CODE"

# 16g. GET /reports/table-turnaround
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/table-turnaround")
expect_status "GET /reports/table-turnaround" 200 "$CODE"

# 16h. POST /reports/feedback
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"rating":5,"comment":"Great service!","category":"SERVICE"}' \
  "$BASE_URL/reports/feedback")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /reports/feedback — submit feedback (HTTP $CODE)"
else
  fail "POST /reports/feedback — expected 200/201, got $CODE"
fi

# 16i. GET /reports/feedback/alerts
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/reports/feedback/alerts")
expect_status "GET /reports/feedback/alerts" 200 "$CODE"

# ─── 17. AUDIT LOGS API ──────────────────────────────────────────────────────

header "17. AUDIT LOGS — List, Stats"

# 17a. GET /audit
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/audit")
expect_status "GET /audit — list audit logs" 200 "$CODE"

# 17b. GET /audit/stats
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/audit/stats")
expect_status "GET /audit/stats — audit stats" 200 "$CODE"

# ─── 18. SYSTEM API ──────────────────────────────────────────────────────────

header "18. SYSTEM — Status, Ledger, Lock/Unlock, Traffic Test"

# 18a. GET /system/status (public)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "x-test-bypass: true" "$BASE_URL/system/status")
expect_status "GET /system/status — public" 200 "$CODE"

# 18b. GET /system/traffic-test (public)
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "x-test-bypass: true" "$BASE_URL/system/traffic-test")
expect_status "GET /system/traffic-test — public" 200 "$CODE"

# 18c. POST /system/backup
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{}' "$BASE_URL/system/backup")
expect_status "POST /system/backup — trigger backup" 200 "$CODE"

# 18d. GET /system/backup-status
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/system/backup-status")
expect_status "GET /system/backup-status — backup status" 200 "$CODE"

# 18e. GET /system/ledger
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/system/ledger")
expect_status "GET /system/ledger — SUPER_ADMIN only" 200 "$CODE"

# ─── 19. INIT API ────────────────────────────────────────────────────────────

header "19. INIT — Check, Backups, Recovery"

# 19a. GET /init/check
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/init/check")
expect_status "GET /init/check — system check" 200 "$CODE"

# 19b. GET /init/backups
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/init/backups")
expect_status "GET /init/backups — list backups" 200 "$CODE"

# ─── 20. MENU (SALON) API ────────────────────────────────────────────────────

header "20. MENU (Salon) — CRUD"

# 20a. GET /menu
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/menu")
expect_status "GET /menu — list salon menu" 200 "$CODE"

# 20b. POST /menu
BODY=$(api_body POST "/menu" '{"name":"Haircut","category":"HAIRCARE","price":500,"description":"Premium haircut"}')
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Haircut","category":"HAIRCARE","price":500,"description":"Premium haircut"}' \
  "$BASE_URL/menu")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /menu — create menu item (HTTP $CODE)"
else
  fail "POST /menu — expected 200/201, got $CODE"
fi
MENU_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -z "$MENU_ID" || "$MENU_ID" == "None" ]]; then MENU_ID=""; fi

# 20c. PUT /menu/:id
if [[ -n "$MENU_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"price":550}' "$BASE_URL/menu/$MENU_ID")
  expect_status "PUT /menu/:id — update menu item" 200 "$CODE"
fi

# 20d. DELETE /menu/:id
if [[ -n "$MENU_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/menu/$MENU_ID")
  expect_status "DELETE /menu/:id — delete menu item" 200 "$CODE"
fi

# ─── 21. WALK-IN GUESTS API ──────────────────────────────────────────────────

header "21. WALK-IN GUESTS — List, Create"

# 21a. GET /walkin-guests
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/walkin-guests")
expect_status "GET /walkin-guests — list walk-in guests" 200 "$CODE"

# 21b. POST /walkin-guests
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"name":"Walk-in Guest","mobileNumber":"7777777777","purpose":"Dining"}' \
  "$BASE_URL/walkin-guests")
if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
  ok "POST /walkin-guests — create walk-in (HTTP $CODE)"
else
  fail "POST /walkin-guests — expected 200/201, got $CODE"
fi

# ─── 22. ACCESS LOGS API ─────────────────────────────────────────────────────

header "22. ACCESS LOGS — List"

# 22a. GET /access/logs
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/access/logs")
expect_status "GET /access/logs — access logs" 200 "$CODE"

# ─── 23. PUSH TOKEN API ──────────────────────────────────────────────────────

header "23. PUSH NOTIFICATIONS — Token Management"

# 23a. POST /push/token
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -H "x-test-bypass: true" \
  -d '{"token":"test-push-token-abc123","platform":"web"}' \
  "$BASE_URL/push/token")
expect_status "POST /push/token — register push token" 200 "$CODE"

# 23b. DELETE /push/token
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/push/token")
expect_status "DELETE /push/token — remove push token" 200 "$CODE"

# ─── 23b. Create additional test users for role tests ───────────────────────

sub "Create test users for role-based gating tests"

# Create an ACCOUNTANT user
BODY_ACC=$(api_body POST "/users" '{"email":"test-accountant@test.com","password":"Test1234!","name":"Test Accountant","roleName":"ACCOUNTANT"}')
TEST_ACC_ID=$(echo "$BODY_ACC" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -n "$TEST_ACC_ID" && "$TEST_ACC_ID" != "None" ]]; then
  ok "Created ACCOUNTANT user ID=$TEST_ACC_ID"
  curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"status":"APPROVED"}' "$BASE_URL/users/$TEST_ACC_ID" > /dev/null
else
  TEST_ACC_ID=""
  fail "Could not create ACCOUNTANT test user"
fi

# Create a CLUB_MANAGER user
BODY_CM=$(api_body POST "/users" '{"email":"test-cm@test.com","password":"Test1234!","name":"Test Club Manager","roleName":"CLUB_MANAGER"}')
TEST_CM_ID=$(echo "$BODY_CM" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [[ -n "$TEST_CM_ID" && "$TEST_CM_ID" != "None" ]]; then
  ok "Created CLUB_MANAGER user ID=$TEST_CM_ID"
  curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"status":"APPROVED"}' "$BASE_URL/users/$TEST_CM_ID" > /dev/null
  # Assign screens to CM
  curl -s -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"screenKeys":["billing","members","overview","reports","activities","notices","concierge","housekeeping","inventory","assets","requests","records","restaurant-pos","kitchen-display","salon-menu","housekeeping-tasks","housekeeping-allocations","housekeeping-deep-cleaning","housekeeping-reports","staff-attendance","leave"]}' \
    "$BASE_URL/users/$TEST_CM_ID/screens" > /dev/null
else
  TEST_CM_ID=""
  fail "Could not create CLUB_MANAGER test user"
fi

# ─── 24. GRANULAR PERMISSION ENFORCEMENT TESTS ────────────────────────────────

header "24. GRANULAR PERMISSIONS — Role Enforcement & Edge Cases"

# 24a. Unauthenticated access
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "x-test-bypass: true" "$BASE_URL/users")
expect_status "GET /users — no token → 401" 401 "$CODE"

# 24b. Invalid token
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -H "Authorization: Bearer invalidtoken" -H "x-test-bypass: true" \
  "$BASE_URL/users")
expect_status "GET /users — invalid token → 401" 401 "$CODE"

# 24c. Non-admin trying to access users list
if [[ -n "$TOKEN_NEW" && "$TOKEN_NEW" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_NEW
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users")
  expect_status "GET /users — DATA_OPERATOR → 403" 403 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 24d. Non-admin trying salary endpoint
if [[ -n "$TOKEN_NEW" && "$TOKEN_NEW" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_NEW
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/salary")
  expect_status "GET /salary — DATA_OPERATOR → 403" 403 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 24e. Non-admin trying init endpoint
if [[ -n "$TOKEN_NEW" && "$TOKEN_NEW" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_NEW
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/init/check")
  expect_status "GET /init/check — DATA_OPERATOR → 403" 403 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 24f. Non-admin trying members export
if [[ -n "$TOKEN_NEW" && "$TOKEN_NEW" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_NEW
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/export/csv")
  expect_status "GET /members/export/csv — DATA_OPERATOR → 403" 403 "$CODE"
  TOKEN=$SAVE_TOKEN
fi

# 24g. Create a user with limited billing permissions and test
if [[ -n "$TEST_USER_ID" ]]; then
  # Give user only billing:create
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"screens":{"billing":{"canCreate":true,"canRead":false,"canUpdate":false,"canDelete":false}}}' \
    "$BASE_URL/users/$TEST_USER_ID/screens/permissions")
  expect_status "PUT granular perms — set billing:create only" 200 "$CODE"

  # Also approve the user
  curl -s -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"status":"APPROVED"}' "$BASE_URL/users/$TEST_USER_ID" > /dev/null

  # TOKEN_STAFF already set from section 2o
  if [[ -n "$TOKEN_STAFF" && "$TOKEN_STAFF" != "None" ]]; then
    SAVE_TOKEN=$TOKEN
    TOKEN=$TOKEN_STAFF

    # Should be able to CREATE billing invoice (has canCreate)
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
      -H "x-test-bypass: true" \
      -d "{\"memberId\":$MEMBER_ID,\"amount\":500,\"description\":\"Staff test\",\"dueDate\":\"2026-12-31\",\"type\":\"MEMBERSHIP\"}" \
      "$BASE_URL/billing/invoice")
    expect_status "Staff with canCreate — POST billing/invoice → success" 200 "$CODE"

    # Should NOT be able to READ invoices (no canRead)
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
      "$BASE_URL/billing/invoices")
    expect_status "Staff without canRead — GET billing/invoices → 403" 403 "$CODE"

    TOKEN=$SAVE_TOKEN
  fi
fi

# ─── 25. MEMBER PORTAL ENDPOINTS ─────────────────────────────────────────────

header "25. MEMBER PORTAL — Member-specific Endpoints"

if [[ -n "$TOKEN_MEM" && "$TOKEN_MEM" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_MEM

  # 25a. GET /members/me (already done above, retest)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/me")
  expect_status "MEMBER: GET /members/me — self view" 200 "$CODE"

  # 25b. GET /members/:id/qr
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/$MEMBER_ID/qr")
  expect_status "MEMBER: GET /members/:id/qr — QR code" 200 "$CODE"

  # 25c. GET /billing/my-invoices
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/billing/my-invoices")
  expect_status "MEMBER: GET /billing/my-invoices — own invoices" 200 "$CODE"

  # 25d. GET /activities
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/activities")
  expect_status "MEMBER: GET /activities — list activities" 200 "$CODE"

  # 25e. GET /activities/my-reservations
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/activities/my-reservations")
  expect_status "MEMBER: GET /activities/my-reservations" 200 "$CODE"

  # 25f. POST /complaints (member)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"subject":"Member Complaint","description":"Testing","category":"SERVICE"}' \
    "$BASE_URL/complaints")
  expect_status "MEMBER: POST /complaints — create complaint" 200 "$CODE"

  # 25g. GET /complaints (member, should see own)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/complaints")
  expect_status "MEMBER: GET /complaints — list own complaints" 200 "$CODE"

  # 25h. GET /announcements
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/announcements")
  expect_status "MEMBER: GET /announcements" 200 "$CODE"

  # 25i. GET /restaurant/menu
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/restaurant/menu")
  expect_status "MEMBER: GET /restaurant/menu" 200 "$CODE"

  # 25j. GET /restaurant/tables
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/restaurant/tables")
  expect_status "MEMBER: GET /restaurant/tables" 200 "$CODE"

  # 25k. POST /restaurant/table-reservation (member)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"tableId":1,"date":"2026-07-20","time":"20:00","guestCount":4}' \
    "$BASE_URL/restaurant/table-reservation")
  expect_status "MEMBER: POST /restaurant/table-reservation" 200 "$CODE"

  # 25l. GET /restaurant/my-table-reservations
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/restaurant/my-table-reservations")
  expect_status "MEMBER: GET /restaurant/my-table-reservations" 200 "$CODE"

  # 25m. POST /restaurant/order (member)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"items":[{"menuItemId":1,"quantity":1}]}' \
    "$BASE_URL/restaurant/order")
  expect_status "MEMBER: POST /restaurant/order" 200 "$CODE"

  # 25n. GET /restaurant/my-orders
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/restaurant/my-orders")
  expect_status "MEMBER: GET /restaurant/my-orders" 200 "$CODE"

  # 25o. PATCH /members/me/profile
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"occupation":"Test Engineer"}' "$BASE_URL/members/me/profile")
  expect_status "MEMBER: PATCH /members/me/profile" 200 "$CODE"

  # 25p. POST /reports/feedback (member)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"rating":4,"comment":"Nice club!","category":"SERVICE"}' \
    "$BASE_URL/reports/feedback")
  expect_status "MEMBER: POST /reports/feedback" 200 "$CODE"

  # 25q. POST /amc/submit (member)
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -H "x-test-bypass: true" \
    -d '{"amount":5000,"transactionId":"MEM-AMC-TEST"}' \
    "$BASE_URL/amc/submit")
  expect_status "MEMBER: POST /amc/submit — AMC payment" 200 "$CODE"

  # 25r. POST /activities/:id/reserve (member)
  ACT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/activities" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('activities',[]) if isinstance(d,dict) else []; print(items[0]['id'] if items else '')" 2>/dev/null)
  if [[ -n "$ACT_ID" && "$ACT_ID" != "None" ]]; then
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
      -H "x-test-bypass: true" \
      -d '{}' "$BASE_URL/activities/$ACT_ID/reserve")
    expect_status "MEMBER: POST /activities/:id/reserve" 200 "$CODE"
  fi

  TOKEN=$SAVE_TOKEN
fi

# ─── 26. STAFF ROLE GATING — Verify all roles on key endpoints ──────────────

header "26. STAFF ROLE GATING — Verify access control for each role"

# 26a. DATA_OPERATOR (test-staff) — should have access to member-facing endpoints
if [[ -n "$TOKEN_STAFF" && "$TOKEN_STAFF" != "None" ]]; then
  SAVE_TOKEN=$TOKEN
  TOKEN=$TOKEN_STAFF

  # Should succeed (DATA_OPERATOR has access)
  for endpoint in "/members" "/activities" "/announcements" "/complaints" "/leave/my" "/leave" "/reports/stats"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
      "$BASE_URL$endpoint")
    expect_status "DATA_OPERATOR: GET $endpoint" 200 "$CODE"
  done

  # Should be forbidden (DATA_OPERATOR not in allowed roles)
  for endpoint in "/salary" "/init/check" "/audit" "/system/ledger" "/users" "/attendance/summary"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
      "$BASE_URL$endpoint")
    expect_status "DATA_OPERATOR: GET $endpoint → 403" 403 "$CODE"
  done

  TOKEN=$SAVE_TOKEN
fi

# 26b. ACCOUNTANT — should have access to financial endpoints
TOKEN_ACC=""
if [[ -n "$TEST_ACC_ID" ]]; then
  BODY_ACC_LOGIN=$(curl -s --max-time "$TIMEOUT" -X POST -H "Content-Type: application/json" \
    -H "x-test-bypass: true" \
    -d '{"email":"test-accountant@test.com","password":"Test1234!"}' "$BASE_URL/auth/login")
  TOKEN_ACC=$(echo "$BODY_ACC_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  if [[ -n "$TOKEN_ACC" && "$TOKEN_ACC" != "None" ]]; then
    SAVE_TOKEN=$TOKEN
    TOKEN=$TOKEN_ACC

    # Accountant should access billing, reports, audit
    for endpoint in "/billing/invoices" "/reports/stats" "/reports/revenue-chart" "/reports/daily-summary" "/audit"; do
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
        -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
        "$BASE_URL$endpoint")
      expect_status "ACCOUNTANT: GET $endpoint" 200 "$CODE"
    done

    # Accountant should NOT access salary (SUPER_ADMIN/ADMIN only)
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
      "$BASE_URL/salary")
    expect_status "ACCOUNTANT: GET /salary → 403" 403 "$CODE"

    TOKEN=$SAVE_TOKEN
  fi
fi

# 26c. CLUB_MANAGER (if created successfully)
if [[ -n "$TEST_CM_ID" ]]; then
  BODY_CM_LOGIN=$(curl -s --max-time "$TIMEOUT" -X POST -H "Content-Type: application/json" \
    -H "x-test-bypass: true" \
    -d '{"email":"test-cm@test.com","password":"Test1234!"}' "$BASE_URL/auth/login")
  TOKEN_CM=$(echo "$BODY_CM_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
  if [[ -n "$TOKEN_CM" && "$TOKEN_CM" != "None" ]]; then
    SAVE_TOKEN=$TOKEN
    TOKEN=$TOKEN_CM

    # CM should access members, billing, but NOT salary or init
    for endpoint in "/members" "/billing/invoices" "/activities" "/announcements" "/housekeeping/tasks" "/attendance"; do
      CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
        -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
        "$BASE_URL$endpoint")
      expect_status "CLUB_MANAGER: GET $endpoint" 200 "$CODE"
    done

    # CM cannot access salary (SUPER_ADMIN/ADMIN only)
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
      -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
      "$BASE_URL/salary")
    expect_status "CLUB_MANAGER: GET /salary → 403" 403 "$CODE"

    TOKEN=$SAVE_TOKEN
  fi
fi

# ─── 27. CLEANUP — Remove test data ──────────────────────────────────────────

header "27. CLEANUP — Remove test users, members, and data"

# Delete test member
if [[ -n "$TEST_MEMBER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/$TEST_MEMBER_ID")
  if [[ "$CODE" == "200" ]]; then
    ok "Deleted test member ID=$TEST_MEMBER_ID"
  else
    skip "Cleanup test member (HTTP $CODE)"
  fi
fi

# Delete test staff user
if [[ -n "$TEST_USER_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users/$TEST_USER_ID")
  if [[ "$CODE" == "200" ]]; then
    ok "Deleted test staff user ID=$TEST_USER_ID"
  else
    skip "Cleanup test staff (HTTP $CODE)"
  fi
fi

# Delete test-new user (created via register endpoint)
TEST_NEW_ID=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/users" | python3 -c "import sys,json; users=json.load(sys.stdin); print([u['id'] for u in users if u.get('email')=='test-new@test.com'][0] if [u['id'] for u in users if u.get('email')=='test-new@test.com'] else '')" 2>/dev/null)
if [[ -n "$TEST_NEW_ID" && "$TEST_NEW_ID" != "None" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users/$TEST_NEW_ID")
  if [[ "$CODE" == "200" ]]; then ok "Deleted test-new user"; else skip "Cleanup test-new (HTTP $CODE)"; fi
fi

# Delete test-accountant user
if [[ -n "$TEST_ACC_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users/$TEST_ACC_ID")
  if [[ "$CODE" == "200" ]]; then ok "Deleted test-accountant"; else skip "Cleanup test-accountant (HTTP $CODE)"; fi
fi

# Delete test-cm user
if [[ -n "$TEST_CM_ID" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/users/$TEST_CM_ID")
  if [[ "$CODE" == "200" ]]; then ok "Deleted test-cm"; else skip "Cleanup test-cm (HTTP $CODE)"; fi
fi

# Delete test member by email
TEST_MEM2_ID=$(curl -s -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
  "$BASE_URL/members" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('members',[]); print([m['id'] for m in items if m.get('email')=='test-member@test.com'][0] if [m['id'] for m in items if m.get('email')=='test-member@test.com'] else '')" 2>/dev/null)
if [[ -n "$TEST_MEM2_ID" && "$TEST_MEM2_ID" != "None" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X DELETE -H "Authorization: Bearer $TOKEN" -H "x-test-bypass: true" \
    "$BASE_URL/members/$TEST_MEM2_ID")
  if [[ "$CODE" == "200" ]]; then ok "Deleted test-member@test.com"; else skip "Cleanup test-member@test.com (HTTP $CODE)"; fi
fi

# ─── SUMMARY ──────────────────────────────────────────────────────────────────

header "FINAL SUMMARY"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  ${G}Pass:  $PASS${N}"
echo -e "  ${R}Fail:  $FAIL${N}"
echo -e "  ${Y}Skip:  $SKIP${N}"
echo -e "  ${C}Total: $TOTAL${N}"

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "\n  ${R}FAILURES:${N}"
  sort -u "$PASS_COUNT_FILE" 2>/dev/null | while IFS= read -r line; do
    echo -e "  ${R}  •${N} $line"
  done
  echo ""
  exit 1
else
  echo -e "\n  ${G}ALL TESTS PASSED${N} 🎉"
  echo ""
  exit 0
fi
