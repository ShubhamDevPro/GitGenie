import os
from pathlib import Path
from agents import function_tool
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import socket_service

IGNORED_TOPDIRS = {
    "node_modules", "venv", "__pycache__", ".git", "dist", "build", "env", ".venv", ".next", ".vite"
}

def read_dir_tree_raw(project_root: str) -> dict[str, list[str]]:
    socket_service.emit_log(f"📂 Starting directory tree analysis for: {project_root}", 'info')
    print(f"Reading directory tree...")
    tree: dict[str, list[str]] = {}
    total_dirs = 0
    processed_dirs = 0
    
    # First pass to count directories
    for dirpath, dirnames, filenames in os.walk(project_root):
        rel = os.path.relpath(dirpath, project_root)
        parts = rel.split(os.sep)
        if parts and parts[0] in IGNORED_TOPDIRS:
            continue
        total_dirs += 1
    
    socket_service.emit_progress("Analyzing directory structure", 0, total_dirs, f"Found {total_dirs} directories to process")
    
    # Second pass to build tree
    for dirpath, dirnames, filenames in os.walk(project_root):
        rel = os.path.relpath(dirpath, project_root)
        parts = rel.split(os.sep)
        if parts and parts[0] in IGNORED_TOPDIRS:
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames if d not in IGNORED_TOPDIRS]
        reldir = "" if rel == "." else rel
        tree.setdefault(reldir, []).extend(filenames)
        
        processed_dirs += 1
        if processed_dirs % 5 == 0 or processed_dirs == total_dirs:
            socket_service.emit_progress("Analyzing directory structure", processed_dirs, total_dirs, f"Processing: {reldir}")
    
    total_files = sum(len(files) for files in tree.values())
    socket_service.emit_log(f"✅ Directory analysis complete: {len(tree)} directories, {total_files} files", 'success')
    return tree

def read_file_raw(path: str) -> str:
    socket_service.emit_file_operation("read", path, "started")
    socket_service.emit_log(f"📖 Reading file: {path}", 'info')
    print(f"Reading file: {path}")
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        socket_service.emit_file_operation("read", path, "completed")
        socket_service.emit_log(f"✅ Successfully read file: {path} ({len(content)} characters)", 'success')
        return content
    except Exception as e:
        socket_service.emit_file_operation("read", path, "failed")
        socket_service.emit_log(f"❌ Failed to read file {path}: {str(e)}", 'error')
        raise

@function_tool
def read_dir_tree(project_root: str) -> dict[str, list[str]]:
    return read_dir_tree_raw(project_root)

@function_tool
def read_file(path: str) -> str:
    return read_file_raw(path)
