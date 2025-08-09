# GitGenie - Gitea Integration Setup Guide

## Overview

This guide will help you complete the integration between your GitGenie application and your Gitea server, allowing users to clone GitHub repositories to their private Gitea workspace without exposing the Gitea server to users.

## Architecture

- **Frontend**: Next.js application with GitHub repository search
- **Authentication**: NextAuth.js with existing user database (infoDB)  
- **Backend**: Gitea server (http://34.0.3.6:3000) with separate database
- **Integration**: Automatic user mapping and repository cloning

## Setup Steps

### 1. Environment Configuration

Update your `.env.local` file with the following variables:

```env
# Database - Keep using your existing infoDB
DATABASE_URL="postgresql://username:password@34.131.198.65:5432/infoDB"

# Gitea Configuration
GITEA_URL="http://34.0.3.6:3000"
GITEA_ADMIN_TOKEN="your-gitea-admin-token"

# Encryption Key (IMPORTANT: Must be exactly 32 characters)
ENCRYPTION_KEY="your-32-character-encryption-key"

# GitHub API Token (for higher rate limits)
GITHUB_TOKEN="your-github-personal-access-token"
```

### 2. Generate Required Tokens

#### A. Gitea Admin Token
1. Login to your Gitea instance: http://34.0.3.6:3000
2. Go to Settings → Applications → Manage Access Tokens
3. Generate a new token with full permissions
4. Copy the token to `GITEA_ADMIN_TOKEN` in your `.env.local`

#### B. Encryption Key
Generate a 32-character random string:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

#### C. GitHub Token (Optional but Recommended)
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a token with `public_repo` scope
3. Add it to `GITHUB_TOKEN` in your `.env.local`

### 3. Database Migration

The Prisma schema already includes the necessary fields for Gitea integration. Run the migration:

```bash
npx prisma db push
```

### 4. How the Integration Works

#### User Flow:
1. User authenticates via NextAuth.js (Google, GitHub, or Credentials)
2. User searches for GitHub repositories using the existing interface
3. User clicks "Clone Repository" button
4. **Backend Process**:
   - Check if user has Gitea account
   - If not, create Gitea user automatically
   - Generate access token for user
   - Create repository in Gitea
   - Clone/mirror content from GitHub to Gitea
   - Store repository info in your database

#### Technical Details:
- Each user gets a unique Gitea account created automatically
- Gitea credentials are encrypted and stored in your main database
- Users never see Gitea interface - everything happens through your app
- Repository cloning uses Gitea's API and mirroring features

### 5. Repository Cloning Methods

The system implements two fallback approaches:

#### Primary: Gitea Mirroring
- Uses Gitea's built-in repository mirroring
- Maintains sync with original GitHub repo
- Most reliable for full repositories

#### Fallback: Content Copy
- Copies important files (README, LICENSE, etc.) via API
- Works when mirroring is not available
- Lighter approach for basic content

### 6. API Endpoints

Your application already has these endpoints configured:

- `POST /api/repositories/clone` - Clone a repository
- `GET /api/repositories/clone` - Get user's cloned repositories
- Repository details in `/api/repositories/[projectId]`

### 7. Security Features

- **User Isolation**: Each user has their own Gitea namespace
- **Token Encryption**: All Gitea tokens are encrypted in database
- **Private Repositories**: All cloned repos are private by default
- **No Direct Access**: Users cannot access Gitea directly

### 8. Testing the Integration

1. Start your application: `npm run dev`
2. Login with any authentication method
3. Search for a GitHub repository
4. Click "Clone to Workspace" button
5. Check the success message
6. Verify repository appears in Gitea (admin view only)

### 9. Monitoring

You can monitor the integration through:

- Application logs for clone operations
- Gitea admin panel for user and repository creation
- Database queries to check user mappings and project records

### 10. Troubleshooting

#### Common Issues:

**Clone fails with "Failed to create Gitea user"**
- Check GITEA_ADMIN_TOKEN is valid
- Verify Gitea server is accessible
- Check admin token has user creation permissions

**Clone fails with "Failed to clone repository"**
- GitHub repository might be private
- Network connectivity issues
- Gitea server storage issues

**Encryption errors**
- Ensure ENCRYPTION_KEY is exactly 32 characters
- Check key consistency across restarts

#### Debug Mode:
Add debug logging to see detailed operation flow:

```javascript
console.log('Clone operation details:', {
  githubUrl,
  giteaUser,
  repoName,
  status
});
```

#### Gitea Version Compatibility:
**Important**: Gitea 1.24.3 has limited API support for user token creation. The following endpoints are not available:
- `/admin/users/{username}/tokens`
- `/admin/access_tokens`

As a result, GitGenie automatically uses the admin token for all operations. This doesn't affect functionality - repositories are still created under individual user accounts, but all API operations use admin privileges. This is a known limitation of Gitea 1.24.3 and will be resolved when upgrading to newer Gitea versions.

### 11. Production Considerations

- Set up proper SSL/TLS for Gitea server
- Configure regular backups for both databases
- Monitor storage usage on Gitea server
- Set up log rotation and monitoring
- Consider rate limiting for clone operations

### 12. Future Enhancements

- Sync scheduling for mirrored repositories
- Webhook integration for real-time updates
- Repository management interface for users
- Clone statistics and usage analytics
- Team/organization support

## Summary

This setup allows your users to seamlessly clone GitHub repositories to their private workspace without ever knowing about Gitea. The integration maintains the security and isolation you need while providing a smooth user experience through your existing authentication system.

The key benefit is that you maintain full control over the Gitea server while users get their own private Git hosting through your application interface.
