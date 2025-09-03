import subprocess
from agents import function_tool
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import socket_service

def lint_summary_raw(project_root: str, project_type: str) -> str:
    socket_service.emit_log(f"🔍 Starting lint analysis for {project_type} project", 'info')
    print(f"Running lint summary for project type: {project_type}")
    
    if project_type == "python":
        cmd = ["pylint", project_root]
        socket_service.emit_log("🐍 Running pylint analysis...", 'info')
    elif project_type == "node":
        cmd = ["npx", "eslint", "--format", "json", project_root]
        socket_service.emit_log("🟨 Running ESLint analysis...", 'info')
    else:
        socket_service.emit_log(f"⚠️ No linter configured for project type: {project_type}", 'warning')
        return ""
    
    socket_service.emit_progress("Linting", 0, 1, f"Executing: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd, cwd=project_root,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            timeout=120  # 2 minute timeout
        )
        
        socket_service.emit_progress("Linting", 1, 1, "Lint analysis completed")
        output = result.stdout + result.stderr
        
        if result.returncode == 0:
            socket_service.emit_log("✅ Lint analysis completed successfully - no issues found", 'success')
        else:
            socket_service.emit_log(f"⚠️ Lint analysis completed with issues (exit code: {result.returncode})", 'warning')
        
        # Count lines of output for user feedback
        line_count = len(output.splitlines())
        socket_service.emit_log(f"📊 Lint report generated: {line_count} lines of output", 'info')
        
        return output
        
    except subprocess.TimeoutExpired:
        socket_service.emit_log("⏰ Lint analysis timed out after 2 minutes", 'error')
        return "Lint analysis timed out"
    except Exception as e:
        socket_service.emit_log(f"❌ Lint analysis failed: {str(e)}", 'error')
        return f"Lint analysis failed: {str(e)}"

@function_tool
def lint_summary(project_root: str, project_type: str) -> str:
    return lint_summary_raw(project_root, project_type)
