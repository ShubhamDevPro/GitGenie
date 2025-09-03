import os
import asyncio
from agents import Agent, Runner
from agent_tools.file_tools import read_dir_tree, read_file
from agent_tools.lint_tools import lint_summary
from agent_tools.patch_tools import patch_generator, apply_patch, create_new_file, edit_file, update_file_content
from agent_tools.logging_tools import log_action
import socket_service

def build_orchestrator():
    return Agent(
        name="SessionOrchestrator",
        instructions=(
            "You are an automated project fixer and file editor. "
            "You have FULL permission to directly modify files, create new files, and apply changes. "
            "Never ask for confirmation - just make the changes directly. "
            "\nAvailable Tools:\n"
            "- read_dir_tree: Analyze project structure\n"
            "- read_file: Read file contents\n"
            "- lint_summary: Analyze project for issues\n"
            "- edit_file or update_file_content: Directly edit existing files with new content\n"
            "- create_new_file: Create new files\n"
            "- log_action: Log your actions\n"
            "\nWorkflow:\n"
            "1. Use read_dir_tree to analyze the project structure.\n"
            "2. Detect project type (HTML/CSS/JS, Python, Node.js, etc).\n"
            "3. Run lint_summary to find issues and improvement opportunities.\n"
            "4. For each file that needs changes:\n"
            "   a. Use read_file to get current content\n"
            "   b. Apply improvements (styling, fixes, user instructions)\n"
            "   c. Use edit_file or update_file_content to save the new version\n"
            "   d. Call log_action to document the change\n"
            "5. If user_instruction exists, prioritize those changes.\n"
            "6. Create new files with create_new_file if needed.\n"
            "7. Provide a summary of all changes made.\n"
            "\nFor file editing:\n"
            "- Always use edit_file(project_root, filename, new_complete_content)\n"
            "- Pass the COMPLETE new file content, not just diffs\n"
            "- The tool will handle backups automatically\n"
            "- Work with relative file paths from project_root\n"
        ),
        tools=[
            read_dir_tree,
            read_file,
            lint_summary,
            edit_file,
            update_file_content,
            create_new_file,
            log_action
        ],
    )

async def run_session_async(project_root: str, session_id: str, user_instruction: str | None = None):
    socket_service.emit_log("🤖 Initializing Session Orchestrator", 'info')
    orchestrator = build_orchestrator()
    
    socket_service.emit_log(f"🎯 Session ID: {session_id}", 'info')
    socket_service.emit_log(f"📁 Project Root: {project_root}", 'info')
    
    if user_instruction:
        socket_service.emit_log(f"📝 User Instructions: {user_instruction}", 'info')
    else:
        socket_service.emit_log("🔄 Running automated analysis and fixes", 'info')
    
    input_text = (
        f"project_root={project_root}\n"
        f"session_id={session_id}\n"
        f"user_instruction={user_instruction or 'None'}"
    )
    
    socket_service.emit_log("🚀 Starting agent execution...", 'info')
    socket_service.emit_progress("Session Execution", 0, 1, "Running orchestrator agent")
    
    try:
        # Use the async run method instead of run_sync
        result = await Runner.run(starting_agent=orchestrator, input=input_text)
        
        socket_service.emit_progress("Session Execution", 1, 1, "Agent execution completed")
        socket_service.emit_log("✅ Session orchestrator completed successfully", 'success')
        
        return result.final_output
        
    except Exception as e:
        socket_service.emit_log(f"❌ Session orchestrator failed: {str(e)}", 'error')
        raise

def run_session(project_root: str, session_id: str, user_instruction: str | None = None):
    # Use asyncio.run to run the async function in a new event loop
    return asyncio.run(run_session_async(project_root, session_id, user_instruction))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run project analyzer and auto-fixer.")
    parser.add_argument("--project-root", "-r", required=True, help="Path to project folder")
    parser.add_argument("--session-id", "-s", required=True, help="Unique session identifier")
    parser.add_argument("--user-instruction", "-u", help="Optional free-form instruction")
    args = parser.parse_args()
    print(run_session(args.project_root, args.session_id, args.user_instruction))
