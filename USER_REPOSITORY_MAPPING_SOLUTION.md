# User Repository Mapping Solution for GitGenie

## Problem Analysis

The error you encountered occurs because your Next.js application is trying to create a Gitea user account with an email that already exists in the Gitea database. This indicates a disconnect between your Next.js user authentication system and the Gitea backend integration.

```
Error creating Gitea user: Error: Failed to create Gitea user: 422 {"message":"e-mail already in use [email: sadf@gmail.com]","url":"http://34.0.3.6:3000/api/swagger"}
```

## Solution Implementation

### 1. Enhanced User Service (`src/lib/userService.ts`)

I've updated the `ensureGiteaIntegration()` method to:

- **Check for existing Gitea users** before attempting to create new ones
- **Link existing Gitea accounts** to Next.js users when emails match
- **Generate unique usernames** to avoid conflicts
- **Gracefully handle email conflicts** by finding and linking existing accounts

Key improvements:
```typescript
// Check if a Gitea user with this email already exists
const existingGiteaUser = await this.findGiteaUserByEmail(user.email);
if (existingGiteaUser) {
    // Link the existing Gitea user to our Next.js user
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            giteaUserId: existingGiteaUser.id,
            giteaUsername: existingGiteaUser.login,
            giteaAccessToken: null,
            giteaCreatedAt: new Date(),
        },
    });
    return { user: updatedUser, giteaUser: existingGiteaUser, isNewGiteaUser: false };
}
```

### 2. Admin Dashboard for User Mappings

Created an admin interface at `/admin/mappings` that provides:

- **User mapping overview** showing relationships between Next.js users and Gitea accounts
- **Repository tracking** for each user showing which repos they've cloned
- **Mapping integrity verification** to ensure proper user-repository relationships
- **System architecture visualization** showing the separation between user authentication and Gitea backend

### 3. Security Architecture

Your setup now properly implements the security model you wanted:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Cloud SQL      │    │  Gitea Server   │
│  (User Auth)    │◄──►│   (infoDB)       │    │  (Repository    │
│                 │    │                  │    │   Hosting)      │
│ - Google OAuth  │    │ - User profiles  │    │                 │
│ - GitHub OAuth  │    │ - Session data   │    │ - Git repos     │
│ - Credentials   │    │ - Gitea mapping  │    │ - No web access │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

Users authenticate through your Next.js app but **cannot access** the Gitea web interface at `http://34.0.3.6:3000/`.

### 4. Repository Cloning Flow

When a user clones a repository:

1. **User Authentication Check**: Verify the user is logged into your Next.js app
2. **Gitea Integration Setup**: Ensure the user has a corresponding Gitea account (create or link existing)
3. **Repository Creation**: Create a private repository in Gitea under the user's account
4. **Content Cloning**: Copy the GitHub repository content to the Gitea repository
5. **Mapping Storage**: Store the relationship in your database

### 5. Database Schema

Your Prisma schema already supports this with:

```prisma
model User {
  // ... existing fields
  giteaUserId           Int?       @unique
  giteaUsername         String?    @unique
  giteaAccessToken      String?    // Encrypted token
  giteaCreatedAt        DateTime?
  projects              Project[]
}

model Project {
  // ... existing fields
  githubOwner       String?   // Original GitHub repo owner
  githubRepo        String?   // Original GitHub repo name
  giteaRepoId       Int?      // Gitea repository ID
  giteaRepoName     String?   // Gitea repository name
  giteaCloneUrl     String?   // Gitea clone URL
}
```

## Key Benefits

### ✅ **No Gitea Web UI Access**
Users never see or interact with the Gitea web interface. All operations go through your Next.js app.

### ✅ **Proper User Mapping**
Each Next.js user gets their own Gitea account, ensuring proper repository ownership and isolation.

### ✅ **Admin Visibility**
The `/admin/mappings` page gives you complete visibility into user-repository relationships.

### ✅ **Error Handling**
The system gracefully handles email conflicts and existing Gitea users.

### ✅ **Scalable Architecture**
Clean separation between authentication (Next.js + Cloud SQL) and repository hosting (Gitea).

## Access the Admin Dashboard

1. Navigate to `/admin/mappings` in your application
2. View user-repository mappings and system health
3. Monitor mapping integrity and troubleshoot issues

## Environment Variables Required

Ensure these are set in your environment:

```env
GITEA_URL=http://34.0.3.6:3000
GITEA_ADMIN_TOKEN=your_admin_token_here
ENCRYPTION_KEY=your_32_character_encryption_key
DATABASE_URL=your_postgresql_connection_string
```

## Testing the Fix

1. Try cloning a repository again - the email conflict should be resolved
2. Check the admin dashboard to see proper user mappings
3. Verify that repositories are created under the correct Gitea user accounts

This solution maintains your desired security model while providing robust user-repository mapping and administrative oversight.
