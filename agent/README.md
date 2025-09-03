# GitGenie Agent - OpenAI Code Modification Agent

This is the Flask-based OpenAI agent that runs on your GCP VM to handle code modification requests from the GitGenie frontend.

## 🏗️ Architecture

- **Frontend (GitGenie)**: Runs on localhost with Gemini for explanations
- **Backend Agent**: Runs on GCP VM with OpenAI Agent SDK for code modifications
- **Communication**: HTTP POST requests to `/fix` endpoint

## 🚀 Setup Instructions

### 1. Transfer Agent Code to GCP VM

```bash
# On your local machine, zip the agent folder
cd /Users/shubhamdev/Developer/GitGenie
tar -czf agent.tar.gz agent/

# Transfer to GCP VM
scp -i ~/.ssh/your-key agent.tar.gz username@34.131.96.184:~/

# On GCP VM, extract
ssh -i ~/.ssh/your-key username@34.131.96.184
cd ~
tar -xzf agent.tar.gz
cd agent
```

### 2. Install Dependencies

```bash
# Create virtual environment
python3 -m venv agent_env
source agent_env/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
# Copy and configure environment variables
cp .env.example .env
nano .env
```

Add your configuration:
```env
OPENAI_API_KEY=your_openai_api_key_here
FLASK_ENV=production
FLASK_DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,34.131.96.184
```

### 4. Run the Agent

```bash
# Start the Flask agent on port 5000
python main.py

# Or with gunicorn for production
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

### 5. Verify Agent is Running

```bash
# Test the agent endpoint
curl -X POST http://localhost:5000/fix \
  -H "Content-Type: application/json" \
  -d '{
    "project_path": "/home/area51_project_ibm/projects/shubhamdev/test-project",
    "session_id": "test-123",
    "user_instructions": "Add a hello world function"
  }'
```

## 🔗 API Integration

The agent provides two endpoints for different use cases:

### 1. `/fix-sync` (Recommended for GitGenie)
Synchronous endpoint that returns the actual agent response:

**Request:**
```json
{
  "project_path": "/home/area51_project_ibm/projects/shubhamdev/shubhamdev-pygames-mf1br1j5",
  "session_id": "USER-NAV-123",
  "user_instructions": "Add dark mode toggle in project"
}
```

**Response:**
```json
{
  "success": true,
  "response": "✅ **Task Completed**: Add dark mode toggle in project\n\n📝 **Files Modified:**\n• Modified file: src/styles.css\n• Updated file: src/app.js\n\n📋 **Summary:**\n• Added dark mode CSS variables\n• Implemented toggle functionality\n• Updated UI components for theme switching",
  "session_id": "USER-NAV-123",
  "raw_output": "...",
  "project_path": "/home/area51_project_ibm/projects/shubhamdev/shubhamdev-pygames-mf1br1j5",
  "user_instructions": "Add dark mode toggle in project"
}
```

### 2. `/fix` (WebSocket-based)
Asynchronous endpoint for real-time progress updates:

**Request:** Same as above

**Response:** Immediate acknowledgment + WebSocket updates
```json
{
  "message": "Agent started",
  "session_id": "USER-NAV-123"
}
```

## 🧠 Intent Detection

GitGenie automatically routes requests based on user intent:

### 💎 **Gemini** (Explanations)
- "What is this project about?"
- "How does this code work?"
- "Explain the main functionality"
- "What files are in this project?"

### 🤖 **OpenAI Agent** (Code Changes)
- "Add dark mode toggle"
- "Fix the login bug"
- "Create a new component"
- "Update the styling"
- "Implement user authentication"

## 🔧 File Structure

```
agent/
├── main.py                 # Flask app with /fix endpoint
├── my_agent.py            # Agent orchestrator
├── orchestrator.py        # OpenAI agent logic
├── socket_service.py      # Real-time communication
├── agent_tools/           # Agent tools and utilities
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

## 🚦 Health Check

The agent runs on `http://34.131.96.184:5000` and accepts:

- `GET /` - Health check
- `POST /fix-sync` - Synchronous code modification (recommended for GitGenie)
- `POST /fix` - Asynchronous code modification with WebSocket updates

## 🔒 Security Notes

1. **Firewall**: Ensure port 5000 is open on your GCP VM
2. **API Keys**: Keep your OpenAI API key secure in `.env`
3. **CORS**: The agent accepts requests from any origin for development
4. **Project Access**: Agent can only modify files in `/home/area51_project_ibm/projects/`

## 🐛 Troubleshooting

### Agent Not Responding
```bash
# Check if agent is running
ps aux | grep python

# Check port
netstat -tlnp | grep :5000

# Check logs
tail -f agent.log
```

### Connection Issues
```bash
# Test from GitGenie machine
curl -v http://34.131.96.184:5000/

# Check firewall
sudo ufw status
```

### OpenAI API Issues
```bash
# Verify API key
python -c "import openai; print('API key configured')"

# Check usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/usage
```

## 📊 Monitoring

Monitor agent activity through:
- Flask logs
- Real-time socket connections (optional)
- Session IDs for tracking requests
- Project modification logs

The agent integrates seamlessly with GitGenie to provide intelligent code modifications while keeping explanations handled by Gemini on the frontend.
