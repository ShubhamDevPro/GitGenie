#!/bin/bash

# Test script for OpenAI Agent response display

echo "🧪 Testing OpenAI Agent Response Display"
echo "========================================"

VM_IP="34.131.96.184"
AGENT_PORT="5000"

echo ""
echo "1️⃣ Testing new /fix-sync endpoint..."

# Test with a simple request
echo "📤 Sending test request to OpenAI Agent..."
curl -X POST http://$VM_IP:$AGENT_PORT/fix-sync \
  -H "Content-Type: application/json" \
  -d '{
    "project_path": "/home/area51_project_ibm/projects/shubhamdev/test-project",
    "session_id": "test-response-'$(date +%s)'",
    "user_instructions": "Add a simple comment to the main file explaining what the project does"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""
echo "2️⃣ Testing response parsing..."

# Create a mock agent output to test parsing
python3 << 'EOF'
def parse_agent_output(raw_output, user_instructions, session_id=None):
    """Mock version of the parse_agent_output function"""
    if not raw_output:
        return "I've completed the requested task, but no detailed output was generated."
    
    lines = raw_output.strip().split('\n')
    summary_lines = []
    files_modified = []
    errors = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if 'Created file:' in line or 'Modified file:' in line or 'Updated file:' in line:
            files_modified.append(line)
        elif 'Error:' in line or 'Failed:' in line or 'Exception:' in line:
            errors.append(line)
        elif any(keyword in line.lower() for keyword in ['completed', 'finished', 'done', 'successfully']):
            summary_lines.append(line)
    
    response_parts = []
    response_parts.append(f"✅ **Task Completed**: {user_instructions}")
    response_parts.append("")
    
    if files_modified:
        response_parts.append("📝 **Files Modified:**")
        for file_mod in files_modified[:5]:
            response_parts.append(f"• {file_mod}")
        response_parts.append("")
    
    if errors:
        response_parts.append("⚠️ **Issues Encountered:**")
        for error in errors[:3]:
            response_parts.append(f"• {error}")
        response_parts.append("")
    
    if summary_lines:
        response_parts.append("📋 **Summary:**")
        for summary in summary_lines[:3]:
            response_parts.append(f"• {summary}")
    else:
        response_parts.append("📋 **Summary:**")
        response_parts.append("• I've analyzed your project and applied the requested changes")
        response_parts.append("• The modifications have been saved to your project files")
    
    response_parts.append("")
    response_parts.append(f"🔍 *For detailed logs, check session ID: {session_id or 'N/A'}*")
    
    return "\n".join(response_parts)

# Test with mock data
mock_output = """
Project analysis completed
Modified file: src/main.py
Updated file: README.md  
Created file: docs/setup.md
Successfully applied changes
"""

parsed = parse_agent_output(mock_output, "Add documentation and comments", "test-123")
print("📋 Parsed Response Preview:")
print("=" * 50)
print(parsed)
print("=" * 50)

EOF

echo ""
echo ""
echo "3️⃣ Testing GitGenie integration..."
echo "✅ Run GitGenie locally: npm run dev"
echo "✅ Navigate to a project runner page"
echo "✅ Try these test messages:"
echo ""
echo "   💎 Gemini (explanations):"
echo "   • 'What is this project about?'"
echo "   • 'How does the authentication work?'"
echo "   • 'Explain the main components'"
echo ""
echo "   🤖 OpenAI Agent (code changes):"
echo "   • 'Add a README file'"
echo "   • 'Fix the login bug'"
echo "   • 'Create a dark mode toggle'"
echo ""
echo "🔍 Expected behavior:"
echo "• Gemini requests: Show '💎 Gemini Assistant:' prefix"
echo "• OpenAI requests: Show '🤖 OpenAI Code Agent:' prefix"
echo "• OpenAI responses: Include session ID and structured output"
echo "• Errors: Show helpful fallback messages"
