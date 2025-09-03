from pydantic import BaseModel, Field
from typing import Optional
from agents import function_tool
from pathlib import Path
from datetime import datetime
import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import socket_service

class Action(BaseModel):
    type: str = Field(..., description="Type of the action performed")
    message: Optional[str] = Field(None, description="Optional details about the action")

def log_action_raw(session_id: str, action: Action, project_root: str) -> bool:
    socket_service.emit_log(f"📋 Logging action: {action.type}", 'info')
    
    log_dir = Path(project_root) / "log"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"{session_id}.jsonl"

    entry = {
        "timestamp": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        **action.model_dump()
    }

    socket_service.emit_progress("Action Logging", 0, 2, f"Preparing log entry for session: {session_id}")
    
    try:
        with log_file.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, separators=(",", ":")) + "\n")
        
        socket_service.emit_progress("Action Logging", 1, 2, f"Log written to: {log_file}")
        socket_service.emit_log(f"✅ Action logged successfully: {action.type}", 'success')
        
        if action.message:
            socket_service.emit_log(f"📄 Action details: {action.message}", 'info')
        
        socket_service.emit_progress("Action Logging", 2, 2, "Action logging complete")
        return True
        
    except Exception as e:
        socket_service.emit_log(f"❌ Failed to log action: {str(e)}", 'error')
        return False

@function_tool
def log_action(session_id: str, action: Action, project_root: str) -> bool:
    return log_action_raw(session_id, action, project_root)
