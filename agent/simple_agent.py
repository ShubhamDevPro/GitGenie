"""
Simple implementation without the agents framework
Direct OpenAI API usage for file modifications
"""
import os
import json
from openai import OpenAI
from simple_patch_tools import apply_patch_raw, create_new_file_raw
from simple_file_tools import read_dir_tree, read_file
import socket_service


def simple_agent(project_root: str, session_id: str, user_instruction: str = None):
    """
    Simplified agent that directly uses OpenAI API for code modifications
    """
    print(f"🤖 DEBUGGING: simple_agent called")
    print(f"📁 Project root: {project_root}")
    print(f"🆔 Session ID: {session_id}")
    print(f"📝 User instruction: {user_instruction}")
    
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    socket_service.emit_log("🤖 Starting simple agent analysis", 'info')
    
    try:
        # Get project structure
        print("📂 Reading project structure...")
        project_structure = read_dir_tree(project_root)
        print(f"📂 Project structure length: {len(project_structure)} chars")
        
        # Read main files to understand the project
        main_files = []
        for root, dirs, files in os.walk(project_root):
            for file in files:
                if file.endswith(('.py', '.js', '.html', '.css', '.jsx', '.ts', '.tsx')):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, project_root)
                    try:
                        content = read_file(project_root, rel_path)
                        main_files.append({
                            'path': rel_path,
                            'content': content[:2000]  # Limit content to avoid context overflow
                        })
                        print(f"📄 Read file: {rel_path} ({len(content)} chars)")
                        if len(main_files) >= 5:  # Limit to 5 files
                            break
                    except Exception as e:
                        print(f"⚠️ Could not read file {rel_path}: {e}")
            if len(main_files) >= 5:
                break
        
        # Prepare the system prompt
        system_prompt = f"""You are a code modification assistant. You can directly edit files in the project.

Project structure:
{project_structure[:3000]}

Main files:
{json.dumps(main_files, indent=2)[:5000]}

Available functions:
- To modify an existing file: Call modify_file(filename, new_content)
- To create a new file: Call create_file(filename, content)

User instruction: {user_instruction}

Analyze the project and make the requested changes. Be specific about which files you're modifying and what changes you're making."""

        # Create the conversation
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Please analyze the project and implement this request: {user_instruction}"}
        ]
        
        print("🧠 Calling OpenAI API...")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            functions=[
                {
                    "name": "modify_file",
                    "description": "Modify an existing file with new content",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "filename": {"type": "string", "description": "Path to the file to modify"},
                            "new_content": {"type": "string", "description": "Complete new content for the file"}
                        },
                        "required": ["filename", "new_content"]
                    }
                },
                {
                    "name": "create_file",
                    "description": "Create a new file with content",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "filename": {"type": "string", "description": "Path for the new file"},
                            "content": {"type": "string", "description": "Content for the new file"}
                        },
                        "required": ["filename", "content"]
                    }
                }
            ],
            function_call="auto"
        )
        
        result_summary = []
        message = response.choices[0].message
        
        print(f"🤖 OpenAI response: {message.content}")
        
        if message.function_call:
            function_name = message.function_call.name
            function_args = json.loads(message.function_call.arguments)
            
            print(f"🔧 Function call: {function_name} with args: {function_args}")
            
            if function_name == "modify_file":
                filename = function_args["filename"]
                new_content = function_args["new_content"]
                result = apply_patch_raw(project_root, filename, new_content)
                result_summary.append(f"Modified file: {filename}")
                result_summary.append(f"Result: {result}")
                
            elif function_name == "create_file":
                filename = function_args["filename"]
                content = function_args["content"]
                result = create_new_file_raw(project_root, filename, content)
                result_summary.append(f"Created file: {filename}")
                result_summary.append(f"Result: {result}")
        
        # Combine the analysis and results
        final_result = []
        if message.content:
            final_result.append("Analysis:")
            final_result.append(message.content)
        
        if result_summary:
            final_result.append("\nActions taken:")
            final_result.extend(result_summary)
        else:
            final_result.append("\nNo file modifications were made.")
        
        final_output = "\n".join(final_result)
        print(f"✅ Simple agent completed. Output length: {len(final_output)} chars")
        
        socket_service.emit_log("✅ Simple agent completed successfully", 'success')
        return final_output
        
    except Exception as e:
        error_msg = f"❌ Simple agent failed: {str(e)}"
        print(error_msg)
        socket_service.emit_log(error_msg, 'error')
        return f"Error: {str(e)}"
