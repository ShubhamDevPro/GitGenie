from datetime import datetime
from typing import Optional

# Global variable to store the socketio instance and current session
_socketio_instance = None
_current_session = None

def set_socketio_instance(socketio_instance):
    """Set the global SocketIO instance"""
    global _socketio_instance
    _socketio_instance = socketio_instance

def set_current_session(session_id):
    """Set the current socket session ID"""
    global _current_session
    _current_session = session_id

def emit_log(message: str, log_type: str = 'info', data: Optional[dict] = None):
    """
    Emit a log message to the connected client
    
    Args:
        message: The log message to send
        log_type: Type of log ('info', 'success', 'warning', 'error')
        data: Optional additional data to send with the log
    """
    global _socketio_instance, _current_session
    
    log_data = {
        'message': message,
        'type': log_type,
        'timestamp': datetime.now().isoformat()
    }
    
    if data:
        log_data.update(data)
    
    # Always print to console for debugging
    print(f"[{log_type.upper()}] {message}")
    
    # Emit to socket if available
    if _socketio_instance and _current_session:
        try:
            _socketio_instance.emit('agent_log', log_data, room=_current_session)
        except Exception as e:
            print(f"Failed to emit socket message: {e}")

def emit_progress(step: str, current: int, total: int, message: str = ""):
    """
    Emit progress information
    
    Args:
        step: Current step being performed
        current: Current progress count
        total: Total progress count
        message: Optional message
    """
    global _socketio_instance, _current_session
    
    progress_data = {
        'step': step,
        'current': current,
        'total': total,
        'percentage': round((current / total) * 100, 2) if total > 0 else 0,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    
    print(f"[PROGRESS] {step}: {current}/{total} ({progress_data['percentage']}%)")
    if message:
        print(f"[PROGRESS] {message}")
    
    if _socketio_instance and _current_session:
        try:
            _socketio_instance.emit('agent_progress', progress_data, room=_current_session)
        except Exception as e:
            print(f"Failed to emit progress: {e}")

def emit_file_operation(operation: str, file_path: str, status: str = 'started'):
    """
    Emit file operation updates
    
    Args:
        operation: Type of operation ('read', 'write', 'create', 'patch', 'lint')
        file_path: Path of the file being operated on
        status: Status of the operation ('started', 'completed', 'failed')
    """
    global _socketio_instance, _current_session
    
    file_data = {
        'operation': operation,
        'file_path': file_path,
        'status': status,
        'timestamp': datetime.now().isoformat()
    }
    
    print(f"[FILE] {operation.upper()} {file_path} - {status.upper()}")
    
    if _socketio_instance and _current_session:
        try:
            _socketio_instance.emit('file_operation', file_data, room=_current_session)
        except Exception as e:
            print(f"Failed to emit file operation: {e}")
