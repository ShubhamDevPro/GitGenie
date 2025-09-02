# AI Chatbot Integration with Gemini API

## Overview

The GitGenie project now includes a fully functional AI chatbot powered by Google's Gemini API. The chatbot provides context-aware assistance for projects running on the GCP VM by analyzing the actual project files and structure.

## How It Works

### 1. Project Context Loading
When a user opens the project runner page (`/project-runner/[repositoryId]`), the system:

1. **Identifies the Project**: Uses the repository ID to find the project in the database
2. **Gets User's Gitea Username**: Retrieves the user's Gitea integration to determine their folder
3. **Constructs VM Path**: Builds the path `/home/{vm_username}/projects/{gitea_username}/{project_name}`
4. **Loads Project Files**: Connects to the GCP VM via SSH and reads project files

### 2. File Analysis
The system analyzes the project by:

- **Reading Main Files**: `package.json`, `README.md`, `app.py`, `main.py`, `index.js`, etc.
- **Scanning File Structure**: Gets complete directory and file listing
- **Processing Content**: Extracts code content from important files (limited to avoid token limits)
- **Language Detection**: Identifies programming languages based on file extensions

### 3. AI Context Building
For each chat interaction, the system provides Gemini with:

- **Project Information**: Name, owner, path, file structure
- **Code Content**: Actual source code from main files
- **Dependencies**: Package.json or requirements.txt content
- **Documentation**: README content if available
- **Conversation History**: Previous chat messages for context

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Project       │    │   GCP VM         │    │   Gemini API    │
│   Runner Page   │────│   SSH Access     │────│   AI Response   │
│                 │    │   File Reading   │    │   Generation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐              ┌───▼────┐              ┌───▼────┐
    │ Chat UI │              │ Project│              │Context │
    │         │              │ Files  │              │Prompt  │
    └─────────┘              └────────┘              └────────┘
```

## Project Structure Compatibility

The chatbot works with the new user-specific project organization:

- **New Structure**: `/home/{vm_username}/projects/{gitea_username}/{project_name}/`
- **Legacy Support**: `/home/{vm_username}/projects/{project_name}/` (fallback)

Example path for your project:
```
/home/area51_project_ibm/projects/shubhamdev/shubhamdev-basic-flask-mdx9ihxj/
```

Where:
- `area51_project_ibm` = VM username (GCP_VM_USERNAME)
- `shubhamdev` = Gitea username
- `shubhamdev-basic-flask-mdx9ihxj` = Repository name

## API Endpoints

### Chat Endpoint
```
POST /api/agent/chat
```

**Request Body**:
```json
{
  "repositoryId": "repo-id-here",
  "message": "How does this Flask app work?",
  "conversationHistory": [
    {
      "sender": "user",
      "text": "Previous message",
      "timestamp": "2025-01-01T10:00:00Z"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "response": "This Flask app is structured as follows...",
  "projectInfo": {
    "name": "shubhamdev-basic-flask-mdx9ihxj",
    "path": "/home/area51_project_ibm/projects/shubhamdev/shubhamdev-basic-flask-mdx9ihxj",
    "filesCount": 15,
    "hasPackageJson": false,
    "hasReadme": true
  }
}
```

### Context Loading Endpoint
```
GET /api/agent/chat?repositoryId=repo-id-here
```

Returns project context information for debugging or initial load.

### Health Check Endpoint
```
GET /api/agent/health
```

Verifies all required environment variables are set.

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Gemini AI
GEMINI_API_KEY="your-gemini-api-key-here"

# GCP VM Configuration (already existing)
GCP_VM_EXTERNAL_IP="your-vm-external-ip"
GCP_VM_USERNAME="your-vm-username"
GCP_VM_SSH_KEY_PATH="/path/to/your/ssh-private-key"
```

## Features

### Context-Aware Responses
The AI understands:
- **Project Type**: Flask, Node.js, React, etc.
- **File Structure**: Components, routes, models, etc.
- **Dependencies**: Installed packages and libraries
- **Code Logic**: Actual function implementations
- **Documentation**: README and comment content

### Code Analysis Capabilities
The chatbot can help with:
- **Debugging**: Analyze error messages and suggest fixes
- **Code Review**: Suggest improvements and best practices
- **Documentation**: Explain how code works
- **Architecture**: Understand project structure and patterns
- **Dependencies**: Help with package management and updates

### Smart Formatting
Chat messages support:
- **Code Blocks**: Triple backticks for code snippets
- **Inline Code**: Single backticks for variables/functions
- **Bold Text**: Double asterisks for emphasis
- **Lists**: Bullet points and numbered lists
- **Line Breaks**: Proper formatting for readability

## Example Interactions

### Code Analysis
**User**: "How does the main Flask app work?"

**AI**: "Based on your project files, here's how your Flask app is structured:

```python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World!'
```

Your app creates a simple Flask server with:
• A single route at `/` that returns 'Hello World!'
• Standard Flask initialization
• The app can be run with `python app.py`"

### Debugging Help
**User**: "I'm getting a 500 error when I visit the site"

**AI**: "Looking at your Flask app code, here are common causes of 500 errors:

1. **Check your server logs** in `/home/area51_project_ibm/projects/shubhamdev/shubhamdev-basic-flask-mdx9ihxj/server.log`
2. **Missing dependencies** - ensure all packages in `requirements.txt` are installed
3. **Port conflicts** - make sure the port isn't already in use
4. **Environment variables** - check if any required env vars are missing

Can you share the specific error message from the logs?"

### Improvement Suggestions
**User**: "How can I make this app better?"

**AI**: "Here are some improvements for your Flask app:

**Security Enhancements:**
• Add input validation for user data
• Implement proper error handling
• Use environment variables for sensitive config

**Performance:**
• Add caching for static resources
• Implement database connection pooling
• Use gunicorn for production deployment

**Code Organization:**
• Split routes into separate blueprint files
• Add configuration management
• Implement proper logging"

## Implementation Details

### File Reading Strategy
The system intelligently reads files by:
1. **Prioritizing Important Files**: `package.json`, `README.md`, main application files
2. **Limiting Content Size**: Truncates large files to avoid token limits
3. **Filtering File Types**: Focuses on source code and documentation
4. **Excluding Large Files**: Skips `node_modules`, binary files, etc.

### Token Management
To manage Gemini API token limits:
- **File Content Truncation**: Large files are limited to first 3000-5000 characters
- **Selective File Reading**: Only reads relevant file types
- **Context Summarization**: Focuses on most important project aspects
- **Conversation History**: Maintains recent chat context while pruning old messages

### Error Handling
The system handles various error scenarios:
- **VM Connection Issues**: Graceful fallback with error messages
- **File Access Problems**: Continues operation with available files
- **API Rate Limits**: Proper error messaging for users
- **Authentication Failures**: Clear guidance for resolution

## Security Considerations

### Access Control
- **User Isolation**: Users can only access their own project folders
- **Path Validation**: Prevents directory traversal attacks
- **Authentication**: All endpoints require valid user session
- **VM Security**: SSH key-based authentication to GCP VM

### Data Privacy
- **Project Isolation**: Each user's code is processed separately
- **Temporary Processing**: File content is not stored permanently
- **API Security**: Gemini API calls use secure HTTPS
- **Local Processing**: Sensitive operations happen on your infrastructure

## Troubleshooting

### Common Issues

1. **"Context Not Loaded" Error**
   - Check GCP VM connectivity
   - Verify SSH key permissions
   - Ensure project exists on VM

2. **"API Error" Messages**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API quota limits
   - Ensure internet connectivity

3. **"Project Not Found"**
   - Confirm project was deployed to VM
   - Check user's Gitea integration
   - Verify project naming consistency

### Debug Endpoints

- **Health Check**: `/api/agent/health` - Verify environment setup
- **Context Check**: `/api/agent/chat?repositoryId=ID` - Test project loading
- **VM Connection**: Check SSH connectivity manually

## Future Enhancements

Potential improvements:
- **File Change Detection**: Real-time updates when files change
- **Interactive Code Editing**: Suggest and apply code changes
- **Project Templates**: AI-generated project structure suggestions
- **Performance Monitoring**: Integration with project runtime metrics
- **Multi-Language Support**: Enhanced support for various programming languages

The AI chatbot is now fully functional and ready to provide intelligent assistance for your projects!
