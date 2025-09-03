# 🤖 GitGenie Agent - Real-time Logging Implementation

This implementation adds comprehensive real-time logging to your GitGenie agent using WebSockets (Flask-SocketIO). Users can now see live updates of what actions the agent is performing.

## 🚀 Features Added

### Real-time Log Types
- **🔍 Info logs**: General information about agent actions
- **✅ Success logs**: Successful operations 
- **⚠️ Warning logs**: Warnings and potential issues
- **❌ Error logs**: Errors and failures

### Progress Tracking
- **📊 Progress updates**: Real-time progress bars for long operations
- **🎯 Step tracking**: Current step being performed
- **📈 Percentage completion**: Visual progress indicators

### File Operation Monitoring
- **📖 File reads**: When files are being read
- **📝 File creation**: New file creation progress
- **🔧 Patch application**: Code patching operations
- **🔍 Linting**: Code analysis operations

## 📁 Files Modified/Added

### Core Files
- `main.py` - Added Flask-SocketIO server with WebSocket endpoints
- `socket_service.py` - **NEW** - Centralized socket communication service
- `requirements.txt` - **NEW** - Python dependencies including flask-socketio

### Agent Tools (All Enhanced with Real-time Logging)
- `agent_tools/file_tools.py` - File operations with progress tracking
- `agent_tools/lint_tools.py` - Linting operations with detailed feedback
- `agent_tools/patch_tools.py` - Patch generation and application monitoring
- `agent_tools/logging_tools.py` - Enhanced action logging
- `my_agent.py` - Main agent with socket logging
- `orchestrator.py` - Orchestrator with session tracking

### Test/Demo Files
- `test_client.html` - **NEW** - Beautiful web interface for testing real-time logs
- `setup.sh` / `setup.ps1` - **NEW** - Setup scripts for easy installation

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
# Windows (PowerShell)
.\setup.ps1

# Linux/Mac
chmod +x setup.sh && ./setup.sh

# Manual installation
pip install -r requirements.txt
```

### 2. Start the Agent Server
```bash
python main.py
```
The server will start on `http://localhost:5000` with WebSocket support.

### 3. Test Real-time Logging
Open `test_client.html` in your browser to see the real-time logging interface.

## 💻 Integration with Your Frontend

### Basic WebSocket Connection
```javascript
const socket = io('http://localhost:5000');

// Connection status
socket.on('connect', () => {
    console.log('Connected to GitGenie Agent');
});

socket.on('disconnect', () => {
    console.log('Disconnected from agent');
});
```

### Real-time Log Events
```javascript
// General log messages
socket.on('agent_log', (data) => {
    console.log(`[${data.type.toUpperCase()}] ${data.message}`);
    // data.type: 'info', 'success', 'warning', 'error'
    // data.message: The log message
    // data.timestamp: ISO timestamp
});

// Progress updates
socket.on('agent_progress', (data) => {
    console.log(`Progress: ${data.step} - ${data.percentage}%`);
    // data.step: Current operation step
    // data.current: Current progress count
    // data.total: Total items to process
    // data.percentage: Completion percentage
    // data.message: Optional details
});

// File operations
socket.on('file_operation', (data) => {
    console.log(`File ${data.operation}: ${data.file_path} - ${data.status}`);
    // data.operation: 'read', 'write', 'create', 'patch', 'lint'
    // data.file_path: Path of the file
    // data.status: 'started', 'completed', 'failed'
});

// Agent completion
socket.on('agent_complete', (data) => {
    console.log('Agent completed:', data.log);
    // data.log: Final summary
    // data.session_id: Session identifier
});

// Agent errors
socket.on('agent_error', (data) => {
    console.error('Agent error:', data.error);
    // data.error: Error message
    // data.session_id: Session identifier
});
```

### Starting an Agent Session
```javascript
fetch('http://localhost:5000/fix', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        project_path: '/path/to/your/project',
        session_id: 'unique-session-id',
        user_instructions: 'Optional instructions'
    })
});
```

## 🎯 Example Real-time Log Flow

When an agent session starts, you'll see logs like:

```
🔌 Client connected to agent server
🚀 Starting agent session: test-session-001
📁 Project path: /path/to/project
📝 User instructions: Fix Python linting issues
🤖 Initializing Session Orchestrator
🔍 Agent starting validation checks
✅ Project directory validated
📂 Starting directory tree analysis
⏳ Analyzing directory structure: 15/50 directories processed
✅ Directory analysis complete: 50 directories, 342 files
🐍 Running pylint analysis...
📊 Lint report generated: 25 lines of output
🛠️ Generating patch for: src/main.py
🔧 Applying patch to: src/main.py
✅ Patch applied successfully
📋 Logging action: patch_applied
✅ Agent session completed successfully
```

## 🔧 Customization

### Adding New Log Types
In `socket_service.py`, you can add new emit functions:

```python
def emit_custom_event(event_type: str, data: dict):
    """Emit custom events to connected clients"""
    if _socketio_instance and _current_session:
        _socketio_instance.emit(event_type, data, room=_current_session)
```

### Adding Logs to New Functions
In any agent tool function:

```python
import socket_service

def your_function():
    socket_service.emit_log("🚀 Starting your operation", 'info')
    
    # Your code here
    
    socket_service.emit_progress("Your Operation", 1, 3, "Step 1 complete")
    
    # More code
    
    socket_service.emit_log("✅ Operation completed successfully", 'success')
```

## 🎨 Frontend Integration Examples

### React Component
```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function AgentLogs() {
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState({ percentage: 0, step: '' });

    useEffect(() => {
        const socket = io('http://localhost:5000');
        
        socket.on('agent_log', (data) => {
            setLogs(prev => [...prev, data]);
        });
        
        socket.on('agent_progress', (data) => {
            setProgress(data);
        });
        
        return () => socket.disconnect();
    }, []);

    return (
        <div>
            <div className="progress-bar">
                <div style={{ width: `${progress.percentage}%` }}>
                    {progress.step}
                </div>
            </div>
            <div className="logs">
                {logs.map((log, i) => (
                    <div key={i} className={`log-${log.type}`}>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### Vue.js Component
```vue
<template>
  <div>
    <div class="progress-bar">
      <div :style="{ width: progress.percentage + '%' }">
        {{ progress.step }}
      </div>
    </div>
    <div class="logs">
      <div v-for="(log, i) in logs" :key="i" :class="`log-${log.type}`">
        {{ log.message }}
      </div>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client';

export default {
  data() {
    return {
      logs: [],
      progress: { percentage: 0, step: '' },
      socket: null
    };
  },
  mounted() {
    this.socket = io('http://localhost:5000');
    
    this.socket.on('agent_log', (data) => {
      this.logs.push(data);
    });
    
    this.socket.on('agent_progress', (data) => {
      this.progress = data;
    });
  },
  beforeDestroy() {
    if (this.socket) this.socket.disconnect();
  }
};
</script>
```

## 🛠️ Technical Details

### WebSocket Events Reference

| Event | Description | Data Structure |
|-------|-------------|----------------|
| `connect` | Client connected | - |
| `disconnect` | Client disconnected | - |
| `agent_log` | General log message | `{message, type, timestamp}` |
| `agent_progress` | Progress update | `{step, current, total, percentage, message, timestamp}` |
| `file_operation` | File operation update | `{operation, file_path, status, timestamp}` |
| `agent_complete` | Agent session complete | `{log, session_id}` |
| `agent_error` | Agent session error | `{error, session_id}` |

### Socket Service Architecture
The `socket_service.py` module provides a centralized way to emit real-time updates:

- **Global state management**: Maintains WebSocket instance and current session
- **Type-safe logging**: Structured log types with consistent formatting
- **Error handling**: Graceful fallback when WebSocket unavailable
- **Console backup**: Always logs to console for debugging

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found: socket_service"**
   - Make sure you're running from the agent directory
   - The path manipulation in imports should handle this automatically

2. **WebSocket connection fails**
   - Check if the Flask server is running on port 5000
   - Verify CORS settings if connecting from different domain

3. **No real-time updates**
   - Ensure client is connected before starting agent session
   - Check browser console for WebSocket errors

### Debug Mode
Start the server with debug logging:
```python
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
```

## 🎉 Result

Now your backend Python Flask agent provides comprehensive real-time logging that your frontend can consume via WebSockets. Users can see:

- ✅ Exactly what the agent is doing at any moment
- 📊 Progress of long-running operations
- 📁 File operations being performed
- ❌ Any errors that occur
- 🎯 Step-by-step workflow progress

This creates a much better user experience where users aren't left wondering what's happening in the background!
