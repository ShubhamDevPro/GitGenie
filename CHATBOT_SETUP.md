# AI Chatbot Setup and Testing Guide

## Quick Setup

### 1. Environment Variables
Add to your `.env.local` file:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
```

### 2. Test the Setup
1. **Check Health**: Visit `/api/agent/health` to verify environment setup
2. **Deploy a Project**: Use "Launch Project with AI" to deploy a project to your GCP VM
3. **Open Project Runner**: Click on the running project to open the project runner page
4. **Test AI Chat**: Ask questions about your project in the left sidebar

### 3. Example Test Questions

For a Flask project:
- "How does this Flask app work?"
- "What dependencies does this project use?"
- "Can you explain the main function?"
- "How can I add a new route?"
- "What's the project structure?"

For a Node.js project:
- "What's in the package.json file?"
- "How is this Express server configured?"
- "What routes are available?"
- "How can I add middleware?"

### 4. Expected Behavior

✅ **Working Correctly:**
- Chat shows "Context Loaded" badge in header
- AI responds with project-specific information
- Code snippets are properly formatted
- Responses reference actual files from your project

❌ **Common Issues:**
- "Context Not Loaded" - Check VM connectivity
- Generic responses - Verify project files are accessible
- API errors - Check Gemini API key

### 5. Directory Structure Check

Your project should be located at:
```
/home/{GCP_VM_USERNAME}/projects/{gitea_username}/{project_name}/
```

Example:
```
/home/area51_project_ibm/projects/shubhamdev/shubhamdev-basic-flask-mdx9ihxj/
```

### 6. Debugging

If issues occur:

1. **Check Logs**: Look at browser developer console for errors
2. **Verify Environment**: Visit `/api/agent/health`
3. **Test VM Access**: Ensure SSH connection to VM works
4. **Check Project Files**: Verify project exists on VM

### 7. Features to Test

- [x] Context loading from VM project files
- [x] Code analysis and explanations
- [x] Debugging assistance
- [x] Project structure understanding
- [x] Dependency analysis
- [x] Improvement suggestions
- [x] Markdown formatting in responses
- [x] Conversation history maintenance

The AI chatbot is now fully integrated and ready to assist with your projects!
