# Email-based User Mapping Migration Guide

## Changes Made

I've updated your GitGenie system to use **email-based user mapping** instead of storing `giteaUserId` and `giteaUsername` in the database. This is a much cleaner and more reliable approach.

## Database Schema Changes

### Removed Columns from User table:
```sql
-- These columns are no longer needed:
-- giteaUserId           Int?       @unique
-- giteaUsername         String?    @unique
```

### Kept Columns:
```sql
-- These columns remain for functionality:
email                 String     @unique  -- Primary mapping key
giteaAccessToken      String?    -- Encrypted token (optional)
giteaCreatedAt        DateTime?  -- When Gitea integration was created/linked
```

## How Email-based Mapping Works

### Before (ID-based):
```
Next.js User  -->  giteaUserId/giteaUsername  -->  Gitea User
   (stored in database)
```

### Now (Email-based):
```
Next.js User  -->  email address  -->  Gitea User
   (lookup via email)
```

## Benefits of Email-based Mapping

1. **✅ No Redundant Data**: Eliminates duplicate storage of Gitea user information
2. **✅ Always Up-to-date**: Always reflects current Gitea user state
3. **✅ Simpler Logic**: No need to sync IDs or usernames
4. **✅ More Reliable**: Email is the true identifier in both systems
5. **✅ Handles Conflicts Better**: Automatically finds existing Gitea users

## Updated System Flow

### When a user clones a repository:

1. **Get Next.js user** from session
2. **Look up Gitea user** by email address (real-time)
3. **Create Gitea user** if doesn't exist (with unique username)
4. **Link existing Gitea user** if email already exists
5. **Create repository** under the correct Gitea user
6. **Store project mapping** in database

### Key Improvements:

- **No more "email already in use" errors** - system finds and links existing users
- **Real-time Gitea user lookup** - always current information
- **Simplified database schema** - fewer columns to maintain
- **Better error handling** - graceful handling of existing accounts

## Database Migration Steps

If you want to clean up your existing database, you can run these commands:

```sql
-- OPTIONAL: Remove the old columns (backup your database first!)
ALTER TABLE "User" DROP COLUMN IF EXISTS "giteaUserId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "giteaUsername";
```

## Updated Admin Dashboard

The admin dashboard at `/admin/mappings` now shows:

- **Email-based mapping** status
- **Real-time Gitea user lookup** results
- **Mapping integrity** based on email correlation
- **System architecture** reflecting the new approach

## Testing the Changes

1. **Try cloning a repository** - should work without email conflicts
2. **Check admin dashboard** - see email-based mapping in action
3. **Verify repository ownership** - repos should be under correct Gitea users

## Code Changes Summary

### Files Modified:
- `prisma/schema.prisma` - Removed giteaUserId/giteaUsername columns
- `src/lib/userService.ts` - Updated to use email-based lookup
- `src/app/api/admin/user-mappings/route.ts` - Real-time Gitea user lookup
- `src/components/dashboard/UserRepositoryMappings.tsx` - Updated UI
- `src/app/admin/mappings/page.tsx` - Updated documentation

### Key Functions Updated:
- `ensureGiteaIntegration()` - Now uses email lookup
- `cloneRepositoryToGitea()` - Uses real-time Gitea user data
- Admin APIs - Real-time mapping analysis

## Rollback Plan

If you need to rollback, you can:

1. Restore the original schema with giteaUserId/giteaUsername columns
2. Re-populate those columns by looking up Gitea users by email
3. Revert the code changes

But this new approach should be much more robust and eliminate the conflicts you were experiencing!

## Next Steps

1. **Test repository cloning** to ensure the email conflict is resolved
2. **Monitor the admin dashboard** to see the new email-based mapping in action
3. **Optional**: Clean up the database by removing the old columns

The system is now more resilient and should handle user-repository mapping much more reliably!
