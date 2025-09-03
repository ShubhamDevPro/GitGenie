# 🤖 GitGenie Dual AI Agent System

## 🏗️ Architecture Overview

GitGenie now features a sophisticated dual AI agent system that intelligently routes user requests between two specialized AI services:

### 💎 **Gemini Agent** (Explanations & Analysis)
- **Location**: Integrated into GitGenie frontend (localhost)
- **Purpose**: Project explanations, code analysis, Q&A
- **Model**: Google Gemini 1.5 Flash
- **Triggers**: Questions, explanations, "what", "how", "why"

### 🤖 **OpenAI Agent** (Code Modifications)  
- **Location**: Flask app on GCP VM (34.131.96.184:5000)
- **Purpose**: Code changes, fixes, implementations
- **Model**: OpenAI Agent SDK
- **Triggers**: "add", "fix", "create", "implement", "modify"

## 🧠 Smart Intent Detection

The system automatically detects user intent and routes requests:

```typescript
// Examples of automatic routing:
"What is this project about?" → 💎 Gemini
"Add dark mode toggle" → 🤖 OpenAI Agent
"How does authentication work?" → 💎 Gemini  
"Fix the login bug" → 🤖 OpenAI Agent
```

## 🔄 Request Flow

1. **User types message** in GitGenie project runner
2. **Intent detection** analyzes the message
3. **Route decision**:
   - **Explanation** → Gemini (local processing)
   - **Code change** → HTTP POST to OpenAI Agent on VM
4. **Response formatting** with agent type indicators
5. **Display** with visual distinctions

## 📁 File Structure

```
GitGenie/
├── src/lib/
│   ├── geminiService.ts          # Gemini AI integration
│   └── openAIAgentService.ts     # OpenAI Agent client
├── src/app/api/agent/
│   └── chat/route.ts             # Smart routing logic
├── agent/                        # Separate Flask app for GCP VM
│   ├── main.py                   # Flask server with /fix endpoint
│   ├── my_agent.py              # Agent orchestrator
│   ├── orchestrator.py          # OpenAI agent logic
│   └── requirements.txt         # Python dependencies
├── deploy-agent.sh              # VM deployment script
└── test-integration.sh          # Testing script
```

## 🚀 Deployment Process

### 1. Local GitGenie (Already Running)
```bash
npm run dev  # Runs on localhost:3000
```

### 2. Deploy Agent to GCP VM
```bash
./deploy-agent.sh  # Automated deployment
```

### 3. Configure Agent
```bash
# SSH to VM and configure
ssh -i ~/.ssh/gcp-vm-key area51_project_ibm@34.131.96.184
cd ~/gitgenie-agent
nano .env  # Add OpenAI API key
sudo systemctl start gitgenie-agent
```

## 💬 User Experience

### Chat Interface Features:
- **Dual Agent Header**: Shows both AI capabilities
- **Auto-restart Badge**: Shows when live preview will auto-restart after code changes
- **Response Prefixes**: 
  - `💎 Gemini Assistant:` for explanations
  - `🤖 OpenAI Code Agent:` for code modifications
- **Session Tracking**: Code modifications include session IDs
- **Auto-save**: All conversations saved locally
- **Context Loading**: Shows when project context is loaded
- **Live Preview Auto-restart**: Automatically restarts project after successful code changes

### Example Conversations:

**Question (Gemini):**
```
User: "What does this Flask app do?"
Bot: 💎 Explanation: This Flask application serves as...
```

**Code Request (OpenAI Agent):**
```  
User: "Add error handling to the login function"
Bot: 🤖 OpenAI Code Agent: ✅ **Task Completed**: Add error handling...

[Auto-restart notification appears]
Bot: 🔄 Auto-Restart: Restarting project to apply code changes...
Bot: ✅ Restart Complete: Project restarted successfully! Your changes are now live.

Session ID: user-repo-1234567890-abc123
```

## 🔧 Technical Details

### Intent Detection Algorithm:
- **Keywords analysis** for code changes vs explanations
- **Question detection** (?, what, how, why)
- **Command detection** (add, fix, create, implement)
- **Context awareness** from conversation history

### API Integration:
```typescript
// OpenAI Agent request format
{
  "project_path": "/home/area51_project_ibm/projects/shubhamdev/project-name",
  "session_id": "unique-session-id", 
  "user_instructions": "User's code modification request"
}
```

### Error Handling:
- **Fallback routing**: If OpenAI Agent fails, option to retry with Gemini
- **Timeout protection**: 5-minute timeout for long-running operations
- **Connection monitoring**: Health checks for VM agent
- **Graceful degradation**: System continues working if one agent fails

## 🔒 Security & Performance

### Security:
- **API key isolation**: OpenAI keys stay on VM, Gemini keys on frontend
- **Project path validation**: Agent only accesses approved project directories
- **Session tracking**: Unique IDs prevent request collision
- **CORS configuration**: Controlled access to agent endpoints

### Performance:
- **Parallel processing**: Intent detection happens instantly
- **Context caching**: Project context loaded once per session
- **Streaming responses**: Real-time feedback for long operations
- **Background processing**: Non-blocking agent operations

## 📊 Monitoring & Debugging

### Logs to Monitor:
```bash
# GitGenie frontend
npm run dev  # Shows routing decisions and API calls

# OpenAI Agent on VM  
sudo journalctl -u gitgenie-agent -f  # Agent service logs
tail -f ~/gitgenie-agent/agent.log    # Application logs
```

### Health Checks:
```bash
# Test agent connectivity
curl http://34.131.96.184:5000/

# Test integration
./test-integration.sh
```

## 🎯 Benefits

1. **Specialized Intelligence**: Each AI handles what it does best
2. **Seamless UX**: Users don't need to choose agents manually  
3. **Robust Architecture**: Fallback mechanisms ensure reliability
4. **Scalable Design**: Easy to add more specialized agents
5. **Cost Optimization**: Route expensive operations appropriately
6. **Project Context**: Both agents have full project understanding

## 🔮 Future Enhancements

- **Multi-language agents**: Specialized agents for different tech stacks
- **Learning system**: Improve intent detection from user feedback
- **Batch operations**: Handle multiple related code changes
- **Real-time collaboration**: Multiple users working on same project
- **Advanced monitoring**: Metrics dashboard for agent performance

---

**🚀 Ready to use!** Your GitGenie now intelligently combines the best of both Gemini's analytical capabilities and OpenAI's code modification expertise!
