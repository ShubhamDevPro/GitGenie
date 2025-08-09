# GitGenie User-Repository Mapping Configuration

This document explains how user-repository mapping works in your GitGenie application and how to ensure users cannot access the Gitea web interface.

## Architecture Overview

### Current Setup
- **Cloud SQL Instance**: `34.131.198.65`
  - `infoDB`: Stores user authentication and application data
  - `gitea`: Stores Gitea-specific data
- **Gitea Server**: `http://34.0.3.6:3000` (GCP VM)
- **Next.js Application**: Handles user authentication and repository management

### User-Repository Mapping Flow

1. **User Authentication**: Users log in via NextAuth (Google/GitHub/Credentials)
2. **Gitea User Creation**: When a user clones their first repository:
   - A corresponding Gitea user is created automatically
   - Username format: `{sanitized_name}_{timestamp}`
   - Password is generated securely and stored encrypted
3. **Repository Cloning**: 
   - Repositories are cloned with admin privileges
   - Ownership is assigned to the user's Gitea account
   - Repository name format: `{gitea_username}-{repo_name}-{timestamp}`
4. **Access Control**: Users can only access repositories via Git clone URLs

## Key Features Implemented

### 1. Enhanced User-Repository Mapping
- Automatic Gitea user creation for each app user
- Unique repository naming with user prefixes
- Ownership verification during repository creation
- Detailed mapping audit trail

### 2. Gitea Web UI Access Prevention
- Middleware blocks any Gitea web interface access attempts
- Clone URLs provided without web interface links
- Security headers prevent iframe embedding
- Access policy clearly communicated to users

### 3. Repository Management
- Duplicate repository prevention
- Enhanced error handling with user context
- Automatic sync status tracking
- Proper cleanup on errors

### 4. Admin Audit Features
- User-repository mapping verification
- Integrity checking and reporting
- Detailed access logs
- Mapping issue detection

## API Endpoints

### User Endpoints
- `POST /api/repositories/clone` - Clone a repository
- `GET /api/repositories/clone` - List user's repositories  
- `GET /api/repositories/access` - Get repository access details
- `PATCH /api/repositories/access` - Update sync status

### Admin Endpoints
- `GET /api/admin/user-mappings` - Audit user-repository mappings

## Security Measures

### 1. Middleware Protection
```typescript
// Blocks Gitea web UI access attempts
if (pathname.includes('/gitea') || 
    host?.includes('34.0.3.6') ||
    referer?.includes('34.0.3.6:3000')) {
    return NextResponse.json(
        { error: 'Git web interface access is not permitted' },
        { status: 403 }
    );
}
```

### 2. Data Sanitization
- Gitea web URLs are never exposed to users
- Only clone URLs are provided in API responses
- Repository access limited to Git operations only

### 3. User Isolation
- Each user gets their own Gitea account
- Repository names include user identifiers
- Ownership verification on creation

## Database Schema Updates

The existing Prisma schema already supports the mapping with these fields:
- `giteaUserId`: Links to Gitea user ID
- `giteaUsername`: Gitea username for the user
- `giteaAccessToken`: Encrypted access token (optional)
- `giteaRepoName`: Repository name in Gitea
- `giteaCloneUrl`: Clone URL for Git operations

## Configuration Required

### Environment Variables
```env
# Gitea Configuration
GITEA_URL="http://34.0.3.6:3000"
GITEA_ADMIN_TOKEN="your_admin_token"
ENCRYPTION_KEY="32_character_encryption_key"

# Security
BLOCK_GITEA_WEB_UI="true"
ENABLE_MAPPING_AUDIT="true"

# Database
DATABASE_URL="postgresql://user:pass@34.131.198.65:5432/infoDB"
```

## Usage Instructions for Users

### Repository Access
1. Log in to the GitGenie application
2. Search and clone repositories from GitHub
3. Use the provided clone URLs with Git commands:
   ```bash
   git clone [provided_clone_url]
   git push origin main
   git pull origin main
   ```

### Restrictions
- No web interface access to repositories
- Cannot access Gitea at `http://34.0.3.6:3000`
- All operations must be done via Git commands
- Repositories are private and user-specific

## Admin Operations

### Audit User Mappings
```bash
curl -X GET "/api/admin/user-mappings" \
  -H "Authorization: Bearer [your_session_token]"
```

### Monitor Access Attempts
Check application logs for blocked Gitea UI access attempts:
```
🚫 Blocked Gitea UI access attempt: /gitea from [ip_address]
```

## Troubleshooting

### Common Issues
1. **Repository ownership verification failed**
   - Check Gitea admin token permissions
   - Verify user creation was successful

2. **Mapping integrity issues**
   - Use the admin audit endpoint to identify problems
   - Check repository naming conventions

3. **Users trying to access Gitea web interface**
   - Middleware automatically blocks these attempts
   - Users are redirected with proper instructions

### Monitoring
- Check `/api/admin/user-mappings` for mapping health
- Monitor application logs for access violations
- Verify repository ownership in Gitea admin panel (if needed)

This setup ensures that users are properly mapped to their repositories while maintaining strict access control and preventing Gitea web interface access.
