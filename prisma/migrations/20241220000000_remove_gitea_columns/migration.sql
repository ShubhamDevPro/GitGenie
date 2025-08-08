-- DropIndex
DROP INDEX IF EXISTS "User_giteaUserId_key";

-- DropIndex  
DROP INDEX IF EXISTS "User_giteaUsername_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "giteaUserId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "giteaUsername";
