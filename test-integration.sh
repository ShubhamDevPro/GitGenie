#!/bin/bash

# Test script for GitGenie Dual AI Agent integration

echo "🧪 GitGenie Dual AI Agent Test"
echo "==============================="

VM_IP="34.131.96.184"
AGENT_PORT="5000"
GITGENIE_URL="http://localhost:3000"

echo ""
echo "1️⃣ Testing Agent Health Check..."
echo "Testing: http://$VM_IP:$AGENT_PORT/"

curl -s http://$VM_IP:$AGENT_PORT/ || echo "❌ Agent not responding"

echo ""
echo ""
echo "2️⃣ Testing Agent /fix Endpoint..."
echo "Testing: POST http://$VM_IP:$AGENT_PORT/fix"

curl -X POST http://$VM_IP:$AGENT_PORT/fix \
  -H "Content-Type: application/json" \
  -d '{
    "project_path": "/home/area51_project_ibm/projects/shubhamdev/test-project",
    "session_id": "test-'$(date +%s)'",
    "user_instructions": "Create a simple hello world function"
  }' || echo "❌ Agent /fix endpoint not responding"

echo ""
echo ""
echo "3️⃣ Testing Intent Detection..."
echo "Testing intent detection locally..."

node -e "
const { OpenAIAgentService } = require('./src/lib/openAIAgentService.ts');

const testCases = [
  'What is this project about?',
  'Add dark mode to the application',
  'How does the authentication work?',
  'Fix the login bug',
  'Explain the main components',
  'Create a new user registration form'
];

testCases.forEach(msg => {
  const intent = OpenAIAgentService.detectIntent(msg);
  console.log(\`\${msg} → \${intent}\`);
});
" 2>/dev/null || echo "⚠️ Intent detection test requires TypeScript compilation"

echo ""
echo ""
echo "📋 Integration Summary:"
echo "======================="
echo "🔄 GitGenie Frontend: http://localhost:3000"
echo "🤖 OpenAI Agent: http://$VM_IP:$AGENT_PORT"
echo "💎 Gemini Integration: Built into GitGenie"
echo ""
echo "📖 How it works:"
echo "• User asks question → Gemini (explanations)"
echo "• User requests code changes → OpenAI Agent"
echo "• Automatic intent detection routes requests"
echo ""
echo "✅ Ready to test both AI agents in GitGenie project runner!"
