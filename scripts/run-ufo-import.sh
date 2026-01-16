#!/bin/bash
# UFO Batch Import Script
# Runs all SQL batch files via Supabase REST API

set -e

BATCH_DIR="/tmp/ufo_small_batches"
TOTAL=$(ls "$BATCH_DIR"/*.sql 2>/dev/null | wc -l)
IMPORTED=0
FAILED=0

# Load environment
source /Users/bobrothers/project-aletheia/.env.local 2>/dev/null || true

# Check for required vars
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_URL not set"
  exit 1
fi

# Get anon key
SUPABASE_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"

echo "Starting UFO import: $TOTAL batches"
echo "Target: $NEXT_PUBLIC_SUPABASE_URL"

for batch_file in "$BATCH_DIR"/batch_*.sql; do
  batch_name=$(basename "$batch_file")

  # Read SQL from file
  SQL=$(cat "$batch_file")

  # Execute via Supabase REST API
  response=$(curl -s -w "\n%{http_code}" \
    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/raw_sql" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL" | jq -Rs .)}" \
    2>/dev/null)

  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ] || [ "$http_code" = "204" ]; then
    IMPORTED=$((IMPORTED + 1))
    echo -ne "\rImported: $IMPORTED/$TOTAL batches"
  else
    FAILED=$((FAILED + 1))
    echo ""
    echo "Failed: $batch_name (HTTP $http_code)"
  fi
done

echo ""
echo "=== Import Complete ==="
echo "Batches imported: $IMPORTED"
echo "Batches failed: $FAILED"
echo "Records imported: $((IMPORTED * 20))"
