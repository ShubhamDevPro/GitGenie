# Restart Project Timeout Fix

## Problem
The project restart functionality was failing with "Start command timeout" errors. The Flask server was not starting properly during the restart process.

## Root Causes Identified
1. **Insufficient Timeout Values**: 15-second SSH command timeout and 30-second API timeout were too short for Flask startup
2. **Hanging SSH Commands**: SSH connections were not properly configured with keepalive and timeout settings
3. **Complex Flask Startup Command**: Multi-line bash commands were causing execution issues
4. **Insufficient Error Handling**: Limited debugging information when startup failed
5. **Missing Dependency Checks**: Flask installation was not verified before startup

## Solutions Implemented

### 1. Increased Timeout Values
- **API Timeout**: Increased from 30 seconds to 60 seconds
- **SSH Command Timeout**: Increased from 15 seconds to 30 seconds
- **Process Verification Wait**: Increased from 3 seconds to 5 seconds

### 2. Improved SSH Connection Configuration
Added connection parameters to prevent hanging:
```typescript
await ssh.connect({
  host: await this.getVmExternalIP(),
  username: process.env.GCP_VM_USERNAME!,
  privateKeyPath: process.env.GCP_VM_SSH_KEY_PATH!,
  readyTimeout: 20000,
  keepaliveInterval: 5000,
  keepaliveCountMax: 3
});
```

### 3. Simplified Flask Startup Command
Replaced complex multi-line bash script with single-line command:
```bash
cd ${vmProjectPath} && export FLASK_APP=app.py && export FLASK_ENV=development && export FLASK_RUN_PORT=${port} && export FLASK_RUN_HOST=0.0.0.0 && export PYTHONUNBUFFERED=1 && pkill -f "flask.*${port}" 2>/dev/null || true && sleep 1 && nohup python3 -m flask run --host=0.0.0.0 --port=${port} > server.log 2>&1 & echo $! > server.pid
```

### 4. Enhanced Error Handling and Logging
- Added immediate command exit code checking
- Increased log output from 10 lines to 20 lines
- Added port status checking with `netstat`
- Added specific timeout error messages
- Added process verification logging

### 5. Added Flask Dependency Verification
Before starting Flask, the system now:
- Checks if Flask is installed
- Automatically installs Flask if missing
- Logs the installation process

### 6. Improved Process Verification
- Added network port checking to verify server binding
- Enhanced PID validation
- Better error reporting when processes fail to start

## Files Modified
1. `/src/app/api/agent/restart-project/route.ts` - Increased API timeout
2. `/src/lib/gcpVmService.ts` - Multiple improvements to restart methods

## Testing
A test script has been created at `/test-restart-debug.sh` to help debug restart issues.

## Expected Improvements
- Restart operations should complete within 60 seconds
- Better error messages when failures occur
- More reliable Flask server startup
- Reduced false timeout errors
- Enhanced debugging capabilities

## Usage
The restart functionality will now:
1. Stop the existing project gracefully
2. Verify Flask dependencies
3. Start the project with improved timeout handling
4. Provide detailed logging for troubleshooting
5. Return comprehensive error messages if issues occur
