Run TypeScript check and identify UI errors:

1. Run: `npx tsc --noEmit`
2. If errors, read the failing file and fix type mismatches
3. Check that database column names match component interfaces
4. Do not declare done until tsc passes
