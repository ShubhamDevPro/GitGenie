# Project Organization Structure on GCP VM

## Overview

This document explains how projects are organized on the GCP VM to provide consistent naming and better management for each user's projects. This structure is designed to be easily understood by AI agents and provides clear separation between different users' projects.

## Directory Structure

```
/home/{vm_username}/projects/
├── {gitea_username_1}/
│   ├── {project_1}/
│   ├── {project_2}/
│   └── {project_n}/
├── {gitea_username_2}/
│   ├── {project_1}/
│   └── {project_2}/
└── legacy/
    ├── {old_project_1}/
    └── {old_project_2}/
```

## Structure Explanation

### User-Specific Folders
- **Path**: `/home/{vm_username}/projects/{gitea_username}/`
- **Purpose**: Each Gitea user gets their own folder to store all their projects
- **Benefits**: 
  - Prevents naming conflicts between users
  - Easy to identify project ownership
  - Clear separation of user workspaces
  - Facilitates AI agent navigation

### Project Folders
- **Path**: `/home/{vm_username}/projects/{gitea_username}/{project_name}/`
- **Contents**: Complete project source code and runtime files
- **Runtime Files**:
  - `server.pid` - Process ID of running server
  - `server.log` - Server output and error logs
  - `start_server.sh` - Auto-generated startup script

### Legacy Support
- **Path**: `/home/{vm_username}/projects/{project_name}/`
- **Purpose**: Backward compatibility for projects created before user-specific organization
- **Note**: New projects will use the user-specific structure

## API Endpoints for AI Agents

### Get Current User's Projects
```
GET /api/agent/projects-info?scope=user&format=detailed
```

**Response Structure**:
```json
{
  "success": true,
  "scope": "user",
  "format": "detailed",
  "data": {
    "username": "john-doe",
    "userPath": "/home/ubuntu/projects/john-doe",
    "projects": [
      {
        "name": "my-web-app",
        "path": "/home/ubuntu/projects/john-doe/my-web-app",
        "isRunning": true,
        "lastModified": "2025-01-01 10:30:00"
      }
    ]
  }
}
```

### Get All Projects (Admin View)
```
GET /api/agent/projects-info?scope=all&format=summary
```

**Response Structure**:
```json
{
  "success": true,
  "scope": "all",
  "format": "summary",
  "data": {
    "totalUsers": 3,
    "totalProjects": 8,
    "runningProjects": 2,
    "users": [
      {
        "username": "john-doe",
        "projectCount": 3,
        "runningCount": 1
      },
      {
        "username": "jane-smith",
        "projectCount": 2,
        "runningCount": 1
      },
      {
        "username": "legacy",
        "projectCount": 3,
        "runningCount": 0
      }
    ]
  }
}
```

### Get Specific User's Projects
```
POST /api/agent/projects-info
{
  "giteaUsername": "john-doe",
  "format": "detailed"
}
```

## Project Lifecycle

### 1. Clone Repository
- User clones a GitHub repository to their Gitea workspace
- Repository gets stored in Gitea with user-specific naming

### 2. Launch Project with AI
- When "Launch Project with AI" is clicked:
  - System identifies the user's Gitea username
  - Creates user-specific folder: `/home/{vm_username}/projects/{gitea_username}/`
  - Uploads project to: `/home/{vm_username}/projects/{gitea_username}/{project_name}/`
  - Starts the project with appropriate commands

### 3. Project Management
- Each project gets its own isolated folder
- Runtime files are contained within the project folder
- AI agents can easily navigate and manage projects per user

## Benefits for AI Agents

### Clear Project Identification
```bash
# AI agents can easily understand project ownership
/home/ubuntu/projects/john-doe/web-app     # John's web app
/home/ubuntu/projects/jane-smith/web-app   # Jane's web app (same name, different user)
```

### User Context Awareness
AI agents can:
- List all projects for a specific user
- Understand project ownership and permissions
- Provide user-specific assistance
- Navigate project structures consistently

### Easy Path Construction
```javascript
// AI agents can construct paths programmatically
const projectPath = `/home/${vmUsername}/projects/${giteaUsername}/${projectName}`;
```

## Implementation Details

### GCPVmService Updates
- `runProjectOnVM()` now accepts `giteaUsername` parameter
- `listUserProjects()` lists all projects for a specific user
- `listAllProjects()` provides complete VM project overview
- Helper method `getVmProjectPath()` constructs correct paths

### API Integration
- User's Gitea integration automatically retrieved
- Gitea username passed to VM service methods
- Fallback to legacy structure when username unavailable

### Database Schema
- User-Project relationships maintained in database
- Gitea integration links users to their Gitea accounts
- Project records include both GitHub source and Gitea clone information

## Migration Notes

### Existing Projects
- Legacy projects remain in `/home/{vm_username}/projects/{project_name}/`
- New projects use user-specific structure
- Both structures are supported simultaneously

### Future Considerations
- Consider migration script for moving legacy projects to user folders
- Monitor disk usage per user folder
- Implement cleanup policies for inactive projects

## Security and Permissions

### Access Control
- Users can only access their own project folders
- API endpoints validate user ownership
- VM folder permissions restrict cross-user access

### AI Agent Guidelines
- AI agents should respect user boundaries
- Use provided APIs rather than direct file system access
- Validate user permissions before project operations

This structure provides a solid foundation for AI agent integration while maintaining clear organization and user separation on the GCP VM.
