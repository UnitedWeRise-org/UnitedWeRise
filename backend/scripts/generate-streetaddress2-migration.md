# Generate Prisma Migration for streetAddress2 Field

## Commands to Run (in backend directory):

```bash
# Navigate to backend directory
cd backend

# Generate Prisma migration
npx prisma migrate dev --name add-street-address2-field

# Generate Prisma client to include new field
npx prisma generate
```

## What This Migration Will Do:

1. **Add streetAddress2 column** to the `users` table
2. **Column specifications**:
   - Type: `VARCHAR(255)`
   - Nullable: `true` (optional field)
   - No default value

## Migration SQL (auto-generated):
```sql
-- CreateTable
ALTER TABLE `users` ADD COLUMN `streetAddress2` VARCHAR(255);
```

## Post-Migration Steps:

1. **Restart backend server** to pick up new Prisma client
2. **Test address forms** in frontend
3. **Verify Profile component** displays streetAddress2 when present
4. **Check AddressForm.js** captures both address lines

## Frontend Components Already Updated:
- ✅ AddressForm.js - now supports 2-line input
- ✅ Profile.js - displays streetAddress2 when present
- ✅ Form validation includes new field

## Backward Compatibility:
- ✅ Existing single-line addresses continue to work
- ✅ streetAddress2 is optional - no data migration needed
- ✅ Forms gracefully handle missing streetAddress2 values