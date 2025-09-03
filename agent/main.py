from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from my_agent import agent
import threading
from datetime import datetime
import socket_service
import os
import secrets
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Generate a secure secret key - use environment variable or generate a random one
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

# Enable CORS for all routes
CORS(app, origins="*")

socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize socket service
socket_service.set_socketio_instance(socketio)

# Global variable to store the current socket session
current_socket_session = None

@app.route('/', methods=['GET'])
def home():
    return "Welcome to the Area51 Project IBM Agent!"

@socketio.on('connect')
def handle_connect():
    global current_socket_session
    current_socket_session = request.sid
    socket_service.set_current_session(request.sid)
    emit('status', {'message': 'Connected to agent server'})
    socket_service.emit_log('🔌 Client connected to agent server', 'success')

@socketio.on('disconnect')
def handle_disconnect():
    global current_socket_session
    current_socket_session = None
    socket_service.set_current_session(None)
    print(f"Client disconnected: {request.sid}")

def emit_log(message, log_type='info'):
    """Helper function to emit logs to connected clients"""
    socket_service.emit_log(message, log_type)

@app.route('/fix', methods=['POST', 'OPTIONS'])
def fix():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    data = request.get_json()
    project_path = data.get('project_path', '')
    session_id = data.get('session_id', '')
    user_instructions = data.get('user_instructions', '')

    def run_agent_async():
        try:
            emit_log(f"🚀 Starting agent session: {session_id}", 'info')
            emit_log(f"📁 Project path: {project_path}", 'info')
            if user_instructions:
                emit_log(f"📝 User instructions: {user_instructions}", 'info')
            
            # Set the current session for this thread
            socket_service.set_current_session(current_socket_session)
            
            log = agent(project_path, session_id, user_instructions)
            
            emit_log("✅ Agent session completed successfully", 'success')
            socketio.emit('agent_complete', {
                'log': log,
                'session_id': session_id
            }, room=current_socket_session)
        except Exception as e:
            emit_log(f"❌ Error in agent execution: {str(e)}", 'error')
            socketio.emit('agent_error', {
                'error': str(e),
                'session_id': session_id
            }, room=current_socket_session)

    # Run agent in background thread to avoid blocking
    thread = threading.Thread(target=run_agent_async, name=f"AgentThread-{session_id}")
    thread.daemon = False  # Don't make it a daemon thread
    thread.start()

    response = jsonify({
        'message': 'Agent started',
        'session_id': session_id
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/fix-sync', methods=['POST', 'OPTIONS'])
def fix_sync():
    """Synchronous version of fix endpoint that returns the actual agent response"""
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    try:
        data = request.get_json()
        project_path = data.get('project_path', '')
        session_id = data.get('session_id', '')
        user_instructions = data.get('user_instructions', '')

        if not project_path or not session_id or not user_instructions:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: project_path, session_id, user_instructions'
            }), 400

        # Log the start of the operation
        print(f"🚀 Starting synchronous agent session: {session_id}")
        print(f"📁 Project path: {project_path}")
        print(f"📝 User instructions: {user_instructions}")
        
        # Validate project path before starting
        if not os.path.exists(project_path):
            return jsonify({
                'success': False,
                'error': f'Project path does not exist: {project_path}',
                'session_id': session_id
            }), 400
        
        if not os.path.isdir(project_path):
            return jsonify({
                'success': False,
                'error': f'Project path is not a directory: {project_path}',
                'session_id': session_id
            }), 400
            
        # Log the directory contents before making changes
        try:
            files_before = os.listdir(project_path)
            print(f"📂 Files in project before changes: {files_before}")
        except Exception as e:
            print(f"⚠️ Could not list project files: {e}")
        
        # Run the agent synchronously
        try:
            result = agent(project_path, session_id, user_instructions)
            
            # Log the directory contents after making changes
            try:
                files_after = os.listdir(project_path)
                print(f"📂 Files in project after changes: {files_after}")
                
                # Check if any files were actually modified by comparing timestamps
                import time
                current_time = time.time()
                recent_files = []
                for file in files_after:
                    file_path = os.path.join(project_path, file)
                    if os.path.isfile(file_path):
                        mtime = os.path.getmtime(file_path)
                        if current_time - mtime < 120:  # Modified in last 2 minutes
                            recent_files.append(f"{file} (modified {int(current_time - mtime)}s ago)")
                
                if recent_files:
                    print(f"🔄 Recently modified files: {recent_files}")
                else:
                    print("⚠️ No files appear to have been modified recently")
                    
            except Exception as e:
                print(f"⚠️ Could not check modified files: {e}")
                
            # Extract meaningful information from the result
            if result:
                # Parse the agent output to create a user-friendly response
                response_text = parse_agent_output(result, user_instructions, session_id)
                
                response_data = {
                    'success': True,
                    'response': response_text,
                    'session_id': session_id,
                    'raw_output': result,
                    'project_path': project_path,
                    'user_instructions': user_instructions
                }
            else:
                response_data = {
                    'success': False,
                    'error': 'Agent completed but returned no output',
                    'session_id': session_id
                }
            
            print(f"✅ Agent session completed successfully: {session_id}")
            
        except Exception as agent_error:
            print(f"❌ Agent execution failed: {str(agent_error)}")
            response_data = {
                'success': False,
                'error': f'Agent execution failed: {str(agent_error)}',
                'session_id': session_id
            }
            
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"❌ Error in fix_sync endpoint: {str(e)}")
        response = jsonify({
            'success': False,
            'error': f'Server error: {str(e)}',
            'session_id': data.get('session_id', 'unknown') if 'data' in locals() else 'unknown'
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

def parse_agent_output(raw_output: str, user_instructions: str, session_id: str = None) -> str:
    """Parse the agent's raw output into a user-friendly response"""
    if not raw_output:
        return "I've completed the requested task, but no detailed output was generated."
    
    print(f"🔍 Parsing agent output (length: {len(raw_output)} chars)")
    print(f"📝 Raw output preview: {raw_output[:500]}...")
    
    # Split the output into lines for analysis
    lines = raw_output.strip().split('\n')
    
    # Look for specific patterns in the agent output
    summary_lines = []
    files_modified = []
    files_created = []
    errors = []
    tool_calls = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for file modifications
        if any(keyword in line for keyword in ['Created file:', 'Modified file:', 'Updated file:', 'Successfully updated', 'Successfully created']):
            if 'Created' in line or 'created' in line:
                files_created.append(line)
            else:
                files_modified.append(line)
        # Look for tool usage
        elif any(keyword in line for keyword in ['edit_file', 'update_file_content', 'create_new_file']):
            tool_calls.append(line)
        # Look for errors
        elif any(keyword in line for keyword in ['Error:', 'Failed:', 'Exception:', 'could not', 'cannot']):
            errors.append(line)
        # Look for summary information
        elif any(keyword in line.lower() for keyword in ['completed', 'finished', 'done', 'successfully', 'applied', 'changes']):
            summary_lines.append(line)
    
    print(f"📊 Parsed results - Files modified: {len(files_modified)}, Files created: {len(files_created)}, Errors: {len(errors)}, Tool calls: {len(tool_calls)}")
    
    # Construct the response
    response_parts = []
    
    # Add a personalized intro
    response_parts.append(f"✅ **Task Completed**: {user_instructions}")
    response_parts.append("")
    
    # Add file modifications if any
    if files_modified or files_created:
        response_parts.append("📝 **Files Modified:**")
        for file_mod in (files_modified + files_created)[:5]:  # Limit to 5 files to avoid overwhelming
            response_parts.append(f"• {file_mod}")
        if len(files_modified + files_created) > 5:
            response_parts.append(f"• ... and {len(files_modified + files_created) - 5} more files")
        response_parts.append("")
    elif tool_calls:
        # If we have tool calls but no file modification reports, mention the tools used
        response_parts.append("🔧 **Actions Performed:**")
        for tool in tool_calls[:3]:
            response_parts.append(f"• {tool}")
        response_parts.append("")
    
    # Add errors if any
    if errors:
        response_parts.append("⚠️ **Issues Encountered:**")
        for error in errors[:3]:  # Limit to 3 errors
            response_parts.append(f"• {error}")
        response_parts.append("")
    
    # Add summary
    if summary_lines:
        response_parts.append("📋 **Summary:**")
        for summary in summary_lines[:3]:  # Limit to 3 summary lines
            response_parts.append(f"• {summary}")
    else:
        # Fallback summary with more detail about what might have happened
        response_parts.append("📋 **Summary:**")
        if files_modified or files_created or tool_calls:
            response_parts.append("• I've analyzed your project and applied the requested changes")
            response_parts.append("• The modifications have been saved to your project files")
        else:
            response_parts.append("• I've processed your request")
            response_parts.append("• If no changes appear, the files may already meet the requirements")
            response_parts.append("• Check the session logs for detailed execution information")
    
    # Add session info
    response_parts.append("")
    response_parts.append(f"🔍 *For detailed logs, check session ID: {session_id or 'N/A'}*")
    
    final_response = "\n".join(response_parts)
    print(f"📤 Final parsed response length: {len(final_response)} chars")
    
    return final_response

if __name__ == '__main__':
    print("🚀 Starting Flask Agent Server...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)