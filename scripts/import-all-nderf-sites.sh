#!/bin/bash
# Run all NDERF-family imports in sequence
# Usage: nohup ./scripts/import-all-nderf-sites.sh > /tmp/all-imports.log 2>&1 &

echo "=== Starting All NDERF-Family Imports ==="
echo "Started at: $(date)"
echo ""

# Wait for any existing NDERF import to finish
while pgrep -f "import-nderf-html" > /dev/null; do
    echo "Waiting for NDERF import to finish... ($(date))"
    sleep 60
done

echo ""
echo "=== NDERF Complete. Starting OBERF... ==="
echo "Time: $(date)"
npx tsx scripts/import-oberf.ts

echo ""
echo "=== OBERF Complete. Starting ADCRF... ==="
echo "Time: $(date)"
npx tsx scripts/import-adcrf.ts

echo ""
echo "=== All Imports Complete ==="
echo "Finished at: $(date)"

# Final counts
echo ""
echo "Final counts:"
npx tsx scripts/count-nde.ts
