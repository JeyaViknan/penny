#!/usr/bin/env bash
#
# Seeds a demo dataset through the public API.
#
# Everything here goes through real endpoints -- including the opening
# balances, which are posted as deposits against the cash vault rather than
# inserted as ledger rows. Hand-inserting a balance produces a single-legged
# credit that creates money from nothing and breaks the ledger's core
# invariant, which GET /ledger/integrity will then correctly report as
# unbalanced. There is deliberately no SQL in this script.
#
# The only step that cannot go through the API is the very first admin, since
# creating a user requires being an admin already.
#
# Usage: ./scripts/seed-demo.sh [base-url]

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
ADMIN_USER="admin"
ADMIN_PASS="Admin@12345"
DEMO_PASS="Password123!"

DB_CONTAINER="${DB_CONTAINER:-ledgerlite-postgres}"
DB_USER="${DB_USER:-ledgerlite}"
DB_NAME="${DB_NAME:-ledgerlite}"

say() { printf '\033[1m%s\033[0m\n' "$1"; }

json() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

api() {
  local method=$1 path=$2 body=${3:-} token=${4:-}
  local args=(-s -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json')
  [[ -n $token ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n $body ]] && args+=(-d "$body" -H "Idempotency-Key: seed-$(uuidgen)")
  curl "${args[@]}"
}

# --- Bootstrap the first admin -------------------------------------------
# BCrypt hash of Admin@12345, generated with BCryptPasswordEncoder.
BOOTSTRAP_HASH='$2a$10$RrMPUyZtBHrXhv.5EsZiyeOHvYsuXjfZhpv8RaUqZRm84GapnPUH2'

say "Bootstrapping admin user"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
  "INSERT INTO users (username, email, password_hash, role)
   VALUES ('$ADMIN_USER', 'admin@ledgerlite.local', '$BOOTSTRAP_HASH', 'ADMIN')
   ON CONFLICT (username) DO NOTHING;" >/dev/null

TOKEN=$(api POST /auth/login "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" | json "['accessToken']")

# --- People ---------------------------------------------------------------
say "Creating people"
create_user() {
  api POST /users "{\"username\":\"$1\",\"email\":\"$1@ledgerlite.local\",\"password\":\"$DEMO_PASS\",\"role\":\"$2\"}" "$TOKEN" \
    | json "['id']" 2>/dev/null || \
  api GET /users '' "$TOKEN" | python3 -c "
import sys,json
print(next(u['id'] for u in json.load(sys.stdin) if u['username']=='$1'))"
}

TELLER_ID=$(create_user tom_teller TELLER)
AUDITOR_ID=$(create_user amy_auditor AUDITOR)
JANE_ID=$(create_user jane_customer CUSTOMER)
RAVI_ID=$(create_user ravi_customer CUSTOMER)

# --- Accounts -------------------------------------------------------------
say "Opening accounts"
open_account() {
  api POST /accounts "{\"ownerUserId\":$1,\"accountType\":\"$2\",\"currency\":\"USD\"}" "$TOKEN" | json "['id']"
}

JANE_CHECKING=$(open_account "$JANE_ID" CHECKING)
JANE_SAVINGS=$(open_account "$JANE_ID" SAVINGS)
RAVI_CHECKING=$(open_account "$RAVI_ID" CHECKING)

# --- Opening balances, posted as real deposits ---------------------------
say "Funding accounts via the deposit endpoint"
deposit() {
  api POST "/accounts/$1/deposit" "{\"amountMinorUnits\":$2,\"reference\":\"$3\"}" "$TOKEN" >/dev/null
}

deposit "$JANE_CHECKING" 480000 "Opening deposit"
deposit "$JANE_SAVINGS"  1250000 "Opening deposit"
deposit "$RAVI_CHECKING" 215000 "Opening deposit"

# --- Some activity to make the history look lived-in ---------------------
say "Posting sample transfers"
transfer() {
  api POST /transfers "{\"sourceAccountId\":$1,\"destinationAccountId\":$2,\"amountMinorUnits\":$3,\"reference\":\"$4\"}" "$TOKEN" >/dev/null
}

transfer "$JANE_CHECKING" "$JANE_SAVINGS" 75000 "Monthly savings"
transfer "$JANE_CHECKING" "$RAVI_CHECKING" 32500 "Dinner split"
transfer "$RAVI_CHECKING" "$JANE_CHECKING" 12000 "Cab share"
api POST "/accounts/$JANE_CHECKING/withdraw" '{"amountMinorUnits":20000,"reference":"ATM withdrawal"}' "$TOKEN" >/dev/null

# --- Prove the books balance ---------------------------------------------
say "Verifying ledger integrity"
api GET /ledger/integrity '' "$TOKEN"
echo

cat <<EOF

Demo data ready. Sign in at the frontend with any of:

  admin         / $ADMIN_PASS     (full access)
  tom_teller    / $DEMO_PASS      (opens accounts, moves money)
  amy_auditor   / $DEMO_PASS      (read-only, sees the audit trail)
  jane_customer / $DEMO_PASS      (sees only her own accounts)
  ravi_customer / $DEMO_PASS

EOF
